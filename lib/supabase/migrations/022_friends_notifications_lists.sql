-- ============================================================
-- 022 — Ta bande (amis), notifications push, listes partagées
-- ============================================================
-- 1. Ta bande : tu retrouves automatiquement les gens avec qui tu as
--    partagé un voyage, et tu peux ajouter un pote via son lien / code.
--    Lors d'un nouveau voyage, tes potes s'ajoutent en un geste et le
--    voyage apparaît directement chez eux (membre lié, sans code).
-- 2. Notifications push : abonnements Web Push par appareil + préférences
--    par type (dépense, remboursement, listes, planning, bande).
-- 3. Listes : « À apporter » et « À faire », avec qui s'en charge.
-- Idempotent : peut être rejouée sans casse.

-- ─── Profiles ────────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS friend_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_friend_code_key ON public.profiles (friend_code);


-- ─── Ta bande : friendships ───────────────────────────────────
-- One row per direction (A→B and B→A) so "my friends" is a simple lookup.
CREATE TABLE IF NOT EXISTS public.friendships (
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source     text NOT NULL DEFAULT 'trip',          -- 'trip' | 'invite'
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CONSTRAINT friendships_not_self CHECK (user_id <> friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their friendships" ON public.friendships;
CREATE POLICY "Users read their friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id);
-- Writes only through the functions below.

-- Travelling together makes you part of each other's bande.
CREATE OR REPLACE FUNCTION public.link_trip_friends()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.friendships (user_id, friend_id, source)
  SELECT NEW.user_id, m.user_id, 'trip'
  FROM public.trip_members m
  WHERE m.trip_id = NEW.trip_id AND m.user_id <> NEW.user_id
  ON CONFLICT DO NOTHING;

  INSERT INTO public.friendships (user_id, friend_id, source)
  SELECT m.user_id, NEW.user_id, 'trip'
  FROM public.trip_members m
  WHERE m.trip_id = NEW.trip_id AND m.user_id <> NEW.user_id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trip_members_link_friends ON public.trip_members;
-- UPDATE OF user_id covers guest → Google transfers (migration 021).
CREATE TRIGGER trip_members_link_friends
  AFTER INSERT OR UPDATE OF user_id ON public.trip_members
  FOR EACH ROW EXECUTE FUNCTION public.link_trip_friends();

-- Backfill: everyone already sharing a trip.
INSERT INTO public.friendships (user_id, friend_id, source)
SELECT DISTINCT a.user_id, b.user_id, 'trip'
FROM public.trip_members a
JOIN public.trip_members b ON a.trip_id = b.trip_id AND a.user_id <> b.user_id
ON CONFLICT DO NOTHING;


-- ─── RPC: get_my_friend_code ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_friend_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_code text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT friend_code INTO v_code FROM public.profiles WHERE id = v_uid;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  LOOP
    SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
    INTO v_code
    FROM generate_series(1, 8);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE friend_code = v_code);
  END LOOP;

  UPDATE public.profiles SET friend_code = v_code WHERE id = v_uid;
  RETURN v_code;
END;
$$;


-- ─── RPC: get_friend_preview (who is behind this code?) ──────
CREATE OR REPLACE FUNCTION public.get_friend_preview(p_code text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'avatar', COALESCE(p.custom_avatar_url, p.avatar_url),
    'is_me', p.id = auth.uid(),
    'already', EXISTS (SELECT 1 FROM public.friendships f WHERE f.user_id = auth.uid() AND f.friend_id = p.id)
  )
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.friend_code = upper(trim(p_code));
$$;


-- ─── RPC: add_friend_by_code ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_friend_by_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_friend public.profiles%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_friend FROM public.profiles WHERE friend_code = upper(trim(p_code));
  IF v_friend.id IS NULL THEN
    RAISE EXCEPTION 'Unknown code' USING ERRCODE = '22023';
  END IF;
  IF v_friend.id = v_uid THEN
    RAISE EXCEPTION 'That is your own code' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.friendships (user_id, friend_id, source) VALUES (v_uid, v_friend.id, 'invite')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.friendships (user_id, friend_id, source) VALUES (v_friend.id, v_uid, 'invite')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'id', v_friend.id,
    'name', v_friend.name,
    'avatar', COALESCE(v_friend.custom_avatar_url, v_friend.avatar_url)
  );
END;
$$;


-- ─── RPC: remove_friend ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.remove_friend(p_friend_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.friendships
  WHERE (user_id = auth.uid() AND friend_id = p_friend_id)
     OR (user_id = p_friend_id AND friend_id = auth.uid());
$$;


-- ─── RPC: get_my_friends ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_friends()
RETURNS TABLE (
  id              uuid,
  name            text,
  avatar          text,
  trips_in_common integer,
  last_trip_name  text,
  since           timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    COALESCE(p.custom_avatar_url, p.avatar_url),
    (
      SELECT count(*)::int
      FROM public.trip_members a
      JOIN public.trip_members b ON b.trip_id = a.trip_id
      WHERE a.user_id = auth.uid() AND b.user_id = p.id
    ),
    (
      SELECT t.name
      FROM public.trips t
      JOIN public.trip_members a ON a.trip_id = t.id AND a.user_id = auth.uid()
      JOIN public.trip_members b ON b.trip_id = t.id AND b.user_id = p.id
      ORDER BY COALESCE(t.start_date, t.created_at::date) DESC
      LIMIT 1
    ),
    f.created_at
  FROM public.friendships f
  JOIN public.profiles p ON p.id = f.friend_id
  WHERE f.user_id = auth.uid()
  ORDER BY 4 DESC, p.name;
$$;


-- ─── RPC: add_friends_to_trip ────────────────────────────────
-- p_friends = [{ "id": "<friend uuid>", "color": "#hex" }, …]
-- Each friend gets a participant (first name + avatar) and a linked
-- membership, so the trip shows up in their list right away.
CREATE OR REPLACE FUNCTION public.add_friends_to_trip(p_trip_id uuid, p_friends jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_f      jsonb;
  v_fid    uuid;
  v_name   text;
  v_avatar text;
  v_pid    uuid;
  v_count  integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.is_trip_member(p_trip_id) THEN
    RAISE EXCEPTION 'Not a member of this trip' USING ERRCODE = '42501';
  END IF;

  FOR v_f IN SELECT * FROM jsonb_array_elements(COALESCE(p_friends, '[]'::jsonb))
  LOOP
    v_fid := (v_f->>'id')::uuid;
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM public.friendships WHERE user_id = v_uid AND friend_id = v_fid
    );
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.trip_members WHERE trip_id = p_trip_id AND user_id = v_fid
    );

    SELECT split_part(COALESCE(NULLIF(trim(name), ''), 'Pote'), ' ', 1),
           COALESCE(custom_avatar_url, avatar_url)
    INTO v_name, v_avatar
    FROM public.profiles WHERE id = v_fid;

    INSERT INTO public.participants (trip_id, name, color, avatar)
    VALUES (p_trip_id, v_name, COALESCE(v_f->>'color', '#64748B'), v_avatar)
    RETURNING id INTO v_pid;

    INSERT INTO public.trip_members (trip_id, user_id, participant_id, role, is_primary)
    VALUES (p_trip_id, v_fid, v_pid, 'contributor', true);

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;


-- ─── Notifications push ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  endpoint   text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  p256dh     text NOT NULL,
  auth       text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users read their push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete their push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users delete their push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Upsert by endpoint: a device that switches account moves to the new user.
CREATE OR REPLACE FUNCTION public.save_push_subscription(
  p_endpoint   text,
  p_p256dh     text,
  p_auth       text,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.push_subscriptions (endpoint, user_id, p256dh, auth, user_agent)
  VALUES (p_endpoint, auth.uid(), p_p256dh, p_auth, p_user_agent)
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent, created_at = now();
END;
$$;

-- Devices to notify: only people who share a trip with the caller or are in
-- their bande, and only if they kept that kind of notification on
-- (everything is on by default except « planning »).
CREATE OR REPLACE FUNCTION public.get_push_targets(p_user_ids uuid[], p_kind text)
RETURNS TABLE (user_id uuid, endpoint text, p256dh text, auth text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.user_id, s.endpoint, s.p256dh, s.auth
  FROM public.push_subscriptions s
  JOIN public.profiles p ON p.id = s.user_id
  WHERE auth.uid() IS NOT NULL
    AND s.user_id = ANY (p_user_ids)
    AND s.user_id <> auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.friendships f WHERE f.user_id = auth.uid() AND f.friend_id = s.user_id)
      OR EXISTS (
        SELECT 1 FROM public.trip_members a
        JOIN public.trip_members b ON b.trip_id = a.trip_id
        WHERE a.user_id = auth.uid() AND b.user_id = s.user_id
      )
    )
    AND COALESCE((p.notification_prefs ->> p_kind)::boolean, p_kind <> 'planning');
$$;

-- Expired endpoints reported by the push service are cleaned up by the sender.
CREATE OR REPLACE FUNCTION public.prune_push_subscription(p_endpoint text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.push_subscriptions s
  WHERE s.endpoint = p_endpoint
    AND auth.uid() IS NOT NULL
    AND (
      s.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.friendships f WHERE f.user_id = auth.uid() AND f.friend_id = s.user_id)
      OR EXISTS (
        SELECT 1 FROM public.trip_members a
        JOIN public.trip_members b ON b.trip_id = a.trip_id
        WHERE a.user_id = auth.uid() AND b.user_id = s.user_id
      )
    );
$$;


-- ─── Listes ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  list         text NOT NULL DEFAULT 'bring',
  title        text NOT NULL,
  note         text,
  assignee_ids uuid[] NOT NULL DEFAULT '{}',          -- participant ids
  done         boolean NOT NULL DEFAULT false,
  position     integer NOT NULL DEFAULT 0,
  created_by   uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT checklist_items_list_check CHECK (list IN ('bring', 'todo'))
);

CREATE INDEX IF NOT EXISTS checklist_items_trip_idx ON public.checklist_items (trip_id, list, position);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip members can CRUD checklist_items" ON public.checklist_items;
CREATE POLICY "Trip members can CRUD checklist_items"
  ON public.checklist_items FOR ALL
  USING (public.is_trip_member(trip_id))
  WITH CHECK (public.is_trip_member(trip_id));


-- ─── Grants ──────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.get_my_friend_code() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_friend_preview(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_friend_by_code(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_friend(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_friends() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_friends_to_trip(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_push_subscription(text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_push_targets(uuid[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.prune_push_subscription(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_my_friend_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_friend_preview(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_friend_by_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_friend(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_friends() TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_friends_to_trip(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_push_subscription(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_push_targets(uuid[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prune_push_subscription(text) TO authenticated;
