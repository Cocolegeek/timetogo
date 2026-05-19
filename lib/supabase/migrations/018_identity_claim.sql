-- ============================================================
-- 018 — Identity claim (primary user per participant)
-- ============================================================
-- When several users link themselves to the same participant
-- (e.g. one user accidentally claimed someone else's identity),
-- we need to know which claim is authoritative so the payment
-- info (RIB, phone) of a participant is unambiguous.
--
-- Rule: the user with `is_primary = true` for a (trip, participant)
-- pair is the authoritative one. A user can override an existing
-- primary by calling `claim_participant` — that transactionally
-- demotes the old primary and promotes the caller.

-- ─── Column + partial uniqueness ─────────────────────────────
ALTER TABLE public.trip_members
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- Backfill: oldest joined_at wins per (trip, participant)
WITH ranked AS (
  SELECT trip_id, user_id, participant_id,
         row_number() OVER (
           PARTITION BY trip_id, participant_id
           ORDER BY joined_at ASC
         ) AS rn
  FROM public.trip_members
  WHERE participant_id IS NOT NULL
)
UPDATE public.trip_members tm
SET is_primary = true
FROM ranked r
WHERE tm.trip_id = r.trip_id
  AND tm.user_id = r.user_id
  AND r.rn = 1;

-- At most one primary per (trip, participant)
CREATE UNIQUE INDEX IF NOT EXISTS trip_members_primary_unique
  ON public.trip_members (trip_id, participant_id)
  WHERE is_primary = true;


-- ─── RPC: claim_participant ──────────────────────────────────
-- Two-step atomic: demote any existing primary, then promote caller.
CREATE OR REPLACE FUNCTION public.claim_participant(
  p_trip_id uuid,
  p_participant_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = p_trip_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Not a trip member' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.participants
    WHERE id = p_participant_id AND trip_id = p_trip_id
  ) THEN
    RAISE EXCEPTION 'Participant not in trip' USING ERRCODE = '22023';
  END IF;

  -- Demote the current primary (if any) for this participant
  UPDATE public.trip_members
  SET is_primary = false
  WHERE trip_id = p_trip_id
    AND participant_id = p_participant_id
    AND is_primary = true
    AND user_id <> v_user_id;

  -- Promote caller (and switch their participant_id if needed)
  UPDATE public.trip_members
  SET participant_id = p_participant_id,
      is_primary = true
  WHERE trip_id = p_trip_id AND user_id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_participant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_participant(uuid, uuid) TO authenticated;


-- ─── RPC: get_trip_member_claims ─────────────────────────────
-- Returns who is linked to which participant in a trip, with the
-- claimer's display name. Bypasses RLS on profiles because trip
-- members legitimately need to see each other's display names to
-- confirm identity claims.
CREATE OR REPLACE FUNCTION public.get_trip_member_claims(p_trip_id uuid)
RETURNS TABLE (
  participant_id uuid,
  user_id uuid,
  user_name text,
  is_primary boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT tm.participant_id, tm.user_id, p.name, tm.is_primary
  FROM public.trip_members tm
  JOIN public.profiles p ON p.id = tm.user_id
  WHERE tm.trip_id = p_trip_id
    AND tm.participant_id IS NOT NULL
    AND public.is_trip_member(p_trip_id);
$$;

REVOKE ALL ON FUNCTION public.get_trip_member_claims(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trip_member_claims(uuid) TO authenticated;


-- ─── Patch existing RPCs to set is_primary ───────────────────

-- join_trip: a new join becomes primary only if no one else holds it
CREATE OR REPLACE FUNCTION public.join_trip(
  p_code              text,
  p_participant_id    uuid DEFAULT NULL,
  p_new_participant_name  text DEFAULT NULL,
  p_new_participant_color text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_trip_id    uuid;
  v_part_id    uuid;
  v_is_primary boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_trip_id
  FROM public.trips
  WHERE share_code = upper(p_code);

  IF v_trip_id IS NULL THEN
    RAISE EXCEPTION 'Trip not found' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = v_trip_id AND user_id = v_user_id
  ) THEN
    RETURN v_trip_id;
  END IF;

  IF p_participant_id IS NOT NULL THEN
    SELECT id INTO v_part_id
    FROM public.participants
    WHERE id = p_participant_id AND trip_id = v_trip_id;

    IF v_part_id IS NULL THEN
      RAISE EXCEPTION 'Participant not in trip' USING ERRCODE = '22023';
    END IF;
  ELSIF p_new_participant_name IS NOT NULL AND length(trim(p_new_participant_name)) > 0 THEN
    INSERT INTO public.participants (trip_id, name, color)
    VALUES (
      v_trip_id,
      trim(p_new_participant_name),
      COALESCE(p_new_participant_color, '#6366f1')
    )
    RETURNING id INTO v_part_id;
  ELSE
    RAISE EXCEPTION 'Provide either participant_id or new_participant_name' USING ERRCODE = '22023';
  END IF;

  -- Primary if nobody else holds it on this participant
  v_is_primary := NOT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = v_trip_id
      AND participant_id = v_part_id
      AND is_primary = true
  );

  INSERT INTO public.trip_members (trip_id, user_id, participant_id, role, is_primary)
  VALUES (v_trip_id, v_user_id, v_part_id, 'contributor', v_is_primary);

  RETURN v_trip_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_trip(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_trip(text, uuid, text, text) TO authenticated;


-- create_trip_with_owner: auto-match owner becomes primary
CREATE OR REPLACE FUNCTION public.create_trip_with_owner(
  p_name text,
  p_type text,
  p_destination text,
  p_emoji text,
  p_currency text,
  p_start_date date,
  p_end_date date,
  p_total_budget numeric,
  p_share_code text,
  p_participants jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_trip_id uuid;
  v_participant jsonb;
  v_matched_id uuid;
  v_user_name text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.trips (
    name, type, destination, emoji, currency,
    start_date, end_date, total_budget, share_code, owner_id
  )
  VALUES (
    p_name, p_type, p_destination, p_emoji, p_currency,
    p_start_date, p_end_date, p_total_budget, p_share_code, v_user_id
  )
  RETURNING id INTO v_trip_id;

  INSERT INTO public.trip_members (trip_id, user_id, participant_id, role)
  VALUES (v_trip_id, v_user_id, NULL, 'owner');

  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
  LOOP
    INSERT INTO public.participants (trip_id, name, color, avatar)
    VALUES (
      v_trip_id,
      v_participant->>'name',
      v_participant->>'color',
      NULLIF(v_participant->>'avatar', '')
    );
  END LOOP;

  SELECT name INTO v_user_name FROM public.profiles WHERE id = v_user_id;
  IF v_user_name IS NOT NULL THEN
    SELECT id INTO v_matched_id
    FROM public.participants
    WHERE trip_id = v_trip_id AND lower(name) = lower(v_user_name)
    LIMIT 1;

    IF v_matched_id IS NOT NULL THEN
      UPDATE public.trip_members
      SET participant_id = v_matched_id,
          is_primary = true
      WHERE trip_id = v_trip_id AND user_id = v_user_id;
    END IF;
  END IF;

  RETURN v_trip_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_trip_with_owner(
  text, text, text, text, text, date, date, numeric, text, jsonb
) TO authenticated;
