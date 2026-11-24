-- ============================================================
-- 021 : Guest accounts (Supabase anonymous sign-in) + lossless
--       upgrade to Google
-- ============================================================
-- Prerequisites in the Supabase dashboard (Authentication):
--   • Sign In / Providers → "Allow anonymous sign-ins" : ON
--   • Sign In / Providers → "Allow manual linking"     : ON
--   • (recommended) Attack Protection → CAPTCHA, to rate-limit guest creation
--
-- How it works
-- 1. "Continuer en tant qu'invité" = supabase.auth.signInAnonymously().
--    The guest is a real auth user (role authenticated, is_anonymous = true),
--    so every existing RLS policy and RPC works unchanged.
-- 2. "Sauvegarder avec Google" = supabase.auth.linkIdentity({ provider: 'google' }).
--    Google is attached to the SAME user id: nothing to copy, nothing lost.
-- 3. If that Google account already exists, linking fails with
--    identity_already_exists. Before linking, the guest created a one-time
--    transfer token (create_guest_transfer). After signing in to the existing
--    Google account, claim_guest_transfer(token) moves the guest's trips and
--    memberships into it (merging memberships, never duplicating them),
--    fills blanks of the Google profile, then deletes the empty guest user.
-- Trips, participants, expenses, itinerary and meals are keyed by trip, not
-- by user, so moving ownership + memberships carries all of them over.

-- ─── Transfer tokens ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.guest_transfers (
  token       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '1 hour',
  claimed_by  uuid,
  claimed_at  timestamptz
);

ALTER TABLE public.guest_transfers ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only reachable through the functions below.


-- ─── RPC: create_guest_transfer (called by the guest) ────────
CREATE OR REPLACE FUNCTION public.create_guest_transfer()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_token uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'Only guest accounts can start a transfer' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.guest_transfers WHERE guest_id = v_uid AND claimed_at IS NULL;
  INSERT INTO public.guest_transfers (guest_id) VALUES (v_uid) RETURNING token INTO v_token;
  RETURN v_token;
END;
$$;


-- ─── RPC: claim_guest_transfer (called by the Google account) ─
CREATE OR REPLACE FUNCTION public.claim_guest_transfer(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_guest  uuid;
  v_member record;
  v_trips  integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'Sign in with Google before claiming' USING ERRCODE = '42501';
  END IF;

  SELECT guest_id INTO v_guest
  FROM public.guest_transfers
  WHERE token = p_token AND claimed_at IS NULL AND expires_at > now()
  FOR UPDATE;

  IF v_guest IS NULL THEN
    RAISE EXCEPTION 'Transfer expired or already used' USING ERRCODE = '22023';
  END IF;

  -- Linking kept the same account (Google was new): nothing to move.
  IF v_guest = v_uid THEN
    UPDATE public.guest_transfers SET claimed_by = v_uid, claimed_at = now() WHERE token = p_token;
    RETURN jsonb_build_object('trips', 0, 'merged', false);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_guest AND is_anonymous) THEN
    RAISE EXCEPTION 'Source account is not a guest' USING ERRCODE = '42501';
  END IF;

  -- 1. Memberships: move them, or merge into the existing one (no duplicate row).
  FOR v_member IN
    SELECT * FROM public.trip_members WHERE user_id = v_guest
  LOOP
    v_trips := v_trips + 1;
    IF EXISTS (
      SELECT 1 FROM public.trip_members WHERE trip_id = v_member.trip_id AND user_id = v_uid
    ) THEN
      DELETE FROM public.trip_members WHERE trip_id = v_member.trip_id AND user_id = v_guest;
      UPDATE public.trip_members
      SET role           = CASE WHEN v_member.role = 'owner' THEN 'owner' ELSE role END,
          participant_id = COALESCE(participant_id, v_member.participant_id),
          is_primary     = is_primary OR (participant_id IS NULL AND v_member.is_primary)
      WHERE trip_id = v_member.trip_id AND user_id = v_uid;
    ELSE
      UPDATE public.trip_members
      SET user_id = v_uid
      WHERE trip_id = v_member.trip_id AND user_id = v_guest;
    END IF;
  END LOOP;

  -- 2. Ownership (must happen before the guest profile disappears: ON DELETE CASCADE).
  UPDATE public.trips SET owner_id = v_uid WHERE owner_id = v_guest;

  -- 3. Profile: keep the Google values, fill blanks with what the guest had set.
  UPDATE public.profiles p
  SET name                 = COALESCE(p.name, g.name),
      custom_avatar_url    = COALESCE(p.custom_avatar_url, g.custom_avatar_url),
      iban                 = COALESCE(p.iban, g.iban),
      phone                = COALESCE(p.phone, g.phone),
      gdpr_consented_at    = COALESCE(p.gdpr_consented_at, g.gdpr_consented_at),
      gdpr_consent_version = COALESCE(p.gdpr_consent_version, g.gdpr_consent_version),
      gdpr_consent_proof   = COALESCE(p.gdpr_consent_proof, g.gdpr_consent_proof)
  FROM public.profiles g
  WHERE p.id = v_uid AND g.id = v_guest;

  UPDATE public.guest_transfers SET claimed_by = v_uid, claimed_at = now() WHERE token = p_token;

  -- 4. Remove the now-empty guest account (cascades to its profile).
  BEGIN
    DELETE FROM auth.users WHERE id = v_guest AND is_anonymous;
  EXCEPTION WHEN insufficient_privilege THEN
    -- Left for Supabase's anonymous-user cleanup; it owns nothing any more.
    NULL;
  END;

  RETURN jsonb_build_object('trips', v_trips, 'merged', true);
END;
$$;

REVOKE ALL ON FUNCTION public.create_guest_transfer() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_guest_transfer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_guest_transfer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_guest_transfer(uuid) TO authenticated;


-- ─── create_trip_with_owner: also match the creator by first name ─
-- Guests (and the creation form) use first names; the profile may hold a
-- full name ("Corentin Nicolas"). Same signature, body updated.
CREATE OR REPLACE FUNCTION public.create_trip_with_owner(
  p_name          text,
  p_type          text,
  p_destination   text,
  p_emoji         text,
  p_currency      text,
  p_start_date    date,
  p_end_date      date,
  p_total_budget  numeric,
  p_share_code    text,
  p_participants  jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trip_id     uuid;
  v_user_id     uuid;
  v_participant jsonb;
  v_user_name   text;
  v_matched_id  uuid;
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
    WHERE trip_id = v_trip_id
      AND (lower(name) = lower(v_user_name) OR lower(name) = lower(split_part(v_user_name, ' ', 1)))
    ORDER BY (lower(name) = lower(v_user_name)) DESC, created_at
    LIMIT 1;

    IF v_matched_id IS NOT NULL THEN
      UPDATE public.trip_members
      SET participant_id = v_matched_id, is_primary = true
      WHERE trip_id = v_trip_id AND user_id = v_user_id;
    END IF;
  END IF;

  RETURN v_trip_id;
END;
$$;
