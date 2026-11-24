-- ============================================================
-- Voyou : Supabase schema (base + migrations 021 to 023; 016, 018 and 019 only live in migrations/)
-- Run this in the Supabase SQL editor after creating your project.
-- Already-deployed DBs: apply individual migrations in lib/supabase/migrations/.
-- ============================================================

-- ─── Profiles ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  text,
  avatar_url            text,        -- Google OAuth avatar
  custom_avatar_url     text,        -- User-uploaded avatar (migration 013)
  email                 text,
  iban                  text,        -- Payment info (migration 017)
  phone                 text,        -- Payment info (migration 017)
  gdpr_consented_at     timestamptz, -- migration 008
  gdpr_consent_version  text,
  gdpr_consent_proof    text,
  created_at            timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── Trips ───────────────────────────────────────────────────
-- type = 'trip' → full voyage (destination, dates, planning, menus)
-- type = 'group' → budget-only (à la Tricount); destination/dates nullable
CREATE TABLE IF NOT EXISTS public.trips (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  type         text NOT NULL DEFAULT 'trip',     -- 'trip' | 'group' (migration 010)
  destination  text,                             -- nullable for type='group'
  emoji        text NOT NULL DEFAULT '🚆',
  icon_url     text,                             -- custom trip icon (migration 013)
  currency     text NOT NULL DEFAULT 'EUR',
  start_date   date,                             -- nullable for type='group'
  end_date     date,                             -- nullable for type='group'
  total_budget numeric,
  share_code   text UNIQUE NOT NULL,
  owner_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now() NOT NULL,
  updated_at   timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT trips_type_check CHECK (type IN ('trip', 'group'))
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;


-- ─── Participants ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.participants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name       text NOT NULL,
  color      text NOT NULL,
  avatar     text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;


-- ─── Trip Members ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_members (
  trip_id        uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES public.participants(id) ON DELETE SET NULL,
  role           text NOT NULL DEFAULT 'contributor',
  is_primary     boolean NOT NULL DEFAULT false,    -- migration 018
  joined_at      timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (trip_id, user_id)
);

-- At most one primary claim per (trip, participant), migration 018
CREATE UNIQUE INDEX IF NOT EXISTS trip_members_primary_unique
  ON public.trip_members (trip_id, participant_id)
  WHERE is_primary = true;

ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;


-- ─── Helper: is_trip_member ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_trip_member(p_trip_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = p_trip_id AND user_id = auth.uid()
  );
$$;


-- ─── RLS Policies: trips ─────────────────────────────────────
CREATE POLICY "Trip members can read trips"
  ON public.trips FOR SELECT
  USING (public.is_trip_member(id));

CREATE POLICY "Trip members can update trips"
  ON public.trips FOR UPDATE
  USING (public.is_trip_member(id));

-- INSERT goes through create_trip_with_owner RPC (migration 015) which
-- bypasses an RLS bug where auth.uid() = owner_id evaluates false.
-- Keep this policy as a fallback but rely on the RPC in production.
CREATE POLICY "Authenticated users can insert trips"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Trip members can delete trip"
  ON public.trips FOR DELETE
  USING (public.is_trip_member(id));

-- NOTE: "Anyone can read trip by share_code" and "Anyone can read participants for joining"
-- were REMOVED in migration 011 and replaced by the get_join_preview RPC below.


-- ─── RLS Policies: participants ──────────────────────────────
CREATE POLICY "Trip members can read participants"
  ON public.participants FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "Trip members can insert participants"
  ON public.participants FOR INSERT
  WITH CHECK (public.is_trip_member(trip_id));

CREATE POLICY "Trip members can update participants"
  ON public.participants FOR UPDATE
  USING (public.is_trip_member(trip_id));

CREATE POLICY "Trip members can delete participants"
  ON public.participants FOR DELETE
  USING (public.is_trip_member(trip_id));


-- ─── RLS Policies: trip_members ──────────────────────────────
CREATE POLICY "Trip members can read trip_members"
  ON public.trip_members FOR SELECT
  USING (public.is_trip_member(trip_id));

CREATE POLICY "Authenticated users can join trips"
  ON public.trip_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can update their own membership"
  ON public.trip_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can remove members"
  ON public.trip_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_id AND trips.owner_id = auth.uid()
    )
  );


-- ─── Expenses ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                 uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title                   text NOT NULL,
  amount                  numeric NOT NULL,
  currency                text NOT NULL,
  exchange_rate           numeric NOT NULL DEFAULT 1,
  amount_in_trip_currency numeric NOT NULL,
  category                text NOT NULL,
  paid_by_id              uuid REFERENCES public.participants(id) ON DELETE SET NULL,
  payers                  jsonb NOT NULL DEFAULT '[]',  -- [{participantId, amount}] (migration 009)
  date                    date NOT NULL,
  split_mode              text NOT NULL DEFAULT 'equal',
  splits                  jsonb NOT NULL DEFAULT '[]',
  notes                   text,
  created_at              timestamptz DEFAULT now() NOT NULL,
  updated_at              timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can CRUD expenses"
  ON public.expenses FOR ALL
  USING (public.is_trip_member(trip_id))
  WITH CHECK (public.is_trip_member(trip_id));


-- ─── Meals ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  date            date NOT NULL,
  slot            text NOT NULL,                          -- 'breakfast' | 'lunch' | 'snack' | 'dinner'
  category        text NOT NULL DEFAULT 'home',           -- 'home' | 'picnic' | 'restaurant'
  title           text,                                   -- optional note (migration 020)
  notes           text,
  participant_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  cook_ids        jsonb NOT NULL DEFAULT '[]'::jsonb,
  dishes          jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [{id, course, name, ingredients:[{id,name,quantity}]}]
  position        integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can CRUD meals"
  ON public.meals FOR ALL
  USING (public.is_trip_member(trip_id))
  WITH CHECK (public.is_trip_member(trip_id));


-- ─── Itinerary Items ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id          uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  date             date NOT NULL,
  time             text,
  title            text NOT NULL,
  description      text,
  location         text,
  type             text NOT NULL DEFAULT 'activity',
  duration_minutes integer,
  participant_ids  jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at       timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can CRUD itinerary_items"
  ON public.itinerary_items FOR ALL
  USING (public.is_trip_member(trip_id))
  WITH CHECK (public.is_trip_member(trip_id));


-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trip_members_user_id ON public.trip_members(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_trip_id ON public.expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_meals_trip_date ON public.meals(trip_id, date, position);
CREATE INDEX IF NOT EXISTS idx_itinerary_trip_id ON public.itinerary_items(trip_id);
CREATE INDEX IF NOT EXISTS idx_participants_trip_id ON public.participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_trips_share_code ON public.trips(share_code);


-- ─── RPC: get_join_preview (migration 011) ───────────────────
-- Returns trip + participants for a share_code without full table access.
-- Replaces the now-removed open SELECT policies on trips/participants.
-- Accessible to anon (migration 014) for pre-login join preview.
CREATE OR REPLACE FUNCTION public.get_join_preview(p_code text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN t.id IS NULL THEN NULL
    ELSE jsonb_build_object(
      'id',           t.id,
      'name',         t.name,
      'destination',  t.destination,
      'emoji',        t.emoji,
      'currency',     t.currency,
      'start_date',   t.start_date,
      'end_date',     t.end_date,
      'share_code',   t.share_code,
      'type',         COALESCE(t.type, 'trip'),
      'participants', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id',     p.id,
          'name',   p.name,
          'color',  p.color,
          'avatar', p.avatar
        ) ORDER BY p.created_at)
        FROM public.participants p
        WHERE p.trip_id = t.id
      ), '[]'::jsonb)
    )
  END
  FROM public.trips t
  WHERE t.share_code = upper(p_code)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_join_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_join_preview(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_join_preview(text) TO anon;


-- ─── RPC: join_trip (migration 012) ──────────────────────────
-- Atomically joins a trip by share_code. Handles new or existing participant.
-- SECURITY DEFINER needed: joiner is not yet a trip_member so RLS blocks direct inserts.
CREATE OR REPLACE FUNCTION public.join_trip(
  p_code                  text,
  p_participant_id        uuid DEFAULT NULL,
  p_new_participant_name  text DEFAULT NULL,
  p_new_participant_color text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_trip_id  uuid;
  v_part_id  uuid;
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

  -- Idempotent: already a member → return trip_id
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

  INSERT INTO public.trip_members (trip_id, user_id, participant_id, role)
  VALUES (v_trip_id, v_user_id, v_part_id, 'contributor');

  RETURN v_trip_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_trip(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_trip(text, uuid, text, text) TO authenticated;


-- ─── RPC: create_trip_with_owner (migration 015) ─────────────
-- Bypasses an RLS bug on trips INSERT where auth.uid() = owner_id
-- evaluates false even when they match. Safe: forces owner_id := auth.uid().
CREATE OR REPLACE FUNCTION public.create_trip_with_owner(
  p_name         text,
  p_type         text,
  p_destination  text,
  p_emoji        text,
  p_currency     text,
  p_start_date   date,
  p_end_date     date,
  p_total_budget numeric,
  p_share_code   text,
  p_participants jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_trip_id    uuid;
  v_participant jsonb;
  v_matched_id uuid;
  v_user_name  text;
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

  -- Auto-link owner to participant with matching full or first name (migration 021)
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

GRANT EXECUTE ON FUNCTION public.create_trip_with_owner(
  text, text, text, text, text, date, date, numeric, text, jsonb
) TO authenticated;


-- ─── Storage: trip-icons + profile-avatars (migration 013) ───
-- ⚠️ Manual action required: create two PUBLIC buckets in Supabase dashboard:
--   - "trip-icons"
--   - "profile-avatars"
-- Path convention: {user_uuid}/{filename}.webp

DROP POLICY IF EXISTS "trip-icons read public"         ON storage.objects;
DROP POLICY IF EXISTS "trip-icons write own folder"    ON storage.objects;
DROP POLICY IF EXISTS "trip-icons update own folder"   ON storage.objects;
DROP POLICY IF EXISTS "trip-icons delete own folder"   ON storage.objects;
DROP POLICY IF EXISTS "profile-avatars read public"    ON storage.objects;
DROP POLICY IF EXISTS "profile-avatars write own folder"  ON storage.objects;
DROP POLICY IF EXISTS "profile-avatars update own folder" ON storage.objects;
DROP POLICY IF EXISTS "profile-avatars delete own folder" ON storage.objects;

CREATE POLICY "trip-icons read public"
  ON storage.objects FOR SELECT USING (bucket_id = 'trip-icons');
CREATE POLICY "trip-icons write own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'trip-icons' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "trip-icons update own folder"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'trip-icons' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "trip-icons delete own folder"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'trip-icons' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "profile-avatars read public"
  ON storage.objects FOR SELECT USING (bucket_id = 'profile-avatars');
CREATE POLICY "profile-avatars write own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "profile-avatars update own folder"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "profile-avatars delete own folder"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ============================================================
-- Guest accounts (migration 021): see the migration file for the full flow.
-- Requires "Allow anonymous sign-ins" + "Allow manual linking" in Supabase Auth.
-- ============================================================
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


-- ============================================================
-- 022 : Ta bande (amis), notifications push, listes partagées
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


-- ============================================================
-- 023 : Journal d'activité, dépenses récurrentes, suppression de compte
-- ============================================================
-- 1. trip_activity : qui a créé / modifié / supprimé quoi (dépenses,
--    remboursements, étapes). Alimenté par triggers, lecture seule côté client.
-- 2. recurring_expenses : modèles de dépenses répétées (hebdo / mensuel),
--    appliqués sans doublon par apply_recurring_expenses().
-- 3. delete_my_account() : suppression RGPD. Les voyages dont tu es
--    propriétaire passent à un autre membre ; ceux où tu es seul disparaissent.
-- Idempotent : peut être rejouée sans casse.

-- ─── 1. Journal d'activité ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_activity (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  actor_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name text,
  entity     text NOT NULL,                    -- 'expense' | 'settlement' | 'step'
  action     text NOT NULL,                    -- 'created' | 'updated' | 'deleted'
  entity_id  uuid,
  title      text,
  amount     numeric,                          -- dans la devise du voyage
  details    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_activity_entity_check CHECK (entity IN ('expense', 'settlement', 'step')),
  CONSTRAINT trip_activity_action_check CHECK (action IN ('created', 'updated', 'deleted'))
);

CREATE INDEX IF NOT EXISTS trip_activity_trip_idx ON public.trip_activity (trip_id, created_at DESC);

ALTER TABLE public.trip_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip members can read activity" ON public.trip_activity;
CREATE POLICY "Trip members can read activity"
  ON public.trip_activity FOR SELECT
  USING (public.is_trip_member(trip_id));
-- Aucune policy d'écriture : seules les fonctions ci-dessous (SECURITY DEFINER) écrivent.

CREATE OR REPLACE FUNCTION public.log_trip_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_trip    uuid;
  v_name    text;
  v_entity  text;
  v_action  text;
  v_id      uuid;
  v_title   text;
  v_amount  numeric;
  v_details jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_trip := OLD.trip_id; v_id := OLD.id; v_title := OLD.title;
  ELSE
    v_trip := NEW.trip_id; v_id := NEW.id; v_title := NEW.title;
  END IF;

  -- Suppression en cascade du voyage : plus rien à journaliser.
  IF NOT EXISTS (SELECT 1 FROM public.trips WHERE id = v_trip) THEN
    RETURN NULL;
  END IF;

  v_action := CASE TG_OP WHEN 'INSERT' THEN 'created' WHEN 'UPDATE' THEN 'updated' ELSE 'deleted' END;

  IF TG_TABLE_NAME = 'expenses' THEN
    IF TG_OP = 'DELETE' THEN
      v_entity := CASE WHEN OLD.category = 'reimbursement' THEN 'settlement' ELSE 'expense' END;
      v_amount := OLD.amount_in_trip_currency;
    ELSE
      v_entity := CASE WHEN NEW.category = 'reimbursement' THEN 'settlement' ELSE 'expense' END;
      v_amount := NEW.amount_in_trip_currency;
    END IF;

    IF TG_OP = 'UPDATE' THEN
      IF OLD.title IS NOT DISTINCT FROM NEW.title
         AND OLD.amount_in_trip_currency IS NOT DISTINCT FROM NEW.amount_in_trip_currency
         AND OLD.date IS NOT DISTINCT FROM NEW.date
         AND OLD.category IS NOT DISTINCT FROM NEW.category
         AND OLD.payers IS NOT DISTINCT FROM NEW.payers
         AND OLD.splits IS NOT DISTINCT FROM NEW.splits
      THEN
        RETURN NULL;
      END IF;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'title',    CASE WHEN OLD.title IS DISTINCT FROM NEW.title
                         THEN jsonb_build_object('from', OLD.title, 'to', NEW.title) END,
        'amount',   CASE WHEN OLD.amount_in_trip_currency IS DISTINCT FROM NEW.amount_in_trip_currency
                         THEN jsonb_build_object('from', OLD.amount_in_trip_currency, 'to', NEW.amount_in_trip_currency) END,
        'date',     CASE WHEN OLD.date IS DISTINCT FROM NEW.date
                         THEN jsonb_build_object('from', OLD.date, 'to', NEW.date) END,
        'category', CASE WHEN OLD.category IS DISTINCT FROM NEW.category
                         THEN jsonb_build_object('from', OLD.category, 'to', NEW.category) END,
        'payers',   CASE WHEN OLD.payers IS DISTINCT FROM NEW.payers THEN to_jsonb(true) END,
        'splits',   CASE WHEN OLD.splits IS DISTINCT FROM NEW.splits THEN to_jsonb(true) END
      ));
    END IF;
  ELSE
    -- Étapes : seules la création et la suppression comptent.
    v_entity := 'step';
  END IF;

  SELECT COALESCE(pa.name, pr.name) INTO v_name
  FROM public.profiles pr
  LEFT JOIN public.trip_members tm ON tm.user_id = pr.id AND tm.trip_id = v_trip
  LEFT JOIN public.participants pa ON pa.id = tm.participant_id
  WHERE pr.id = v_uid;

  INSERT INTO public.trip_activity (trip_id, actor_id, actor_name, entity, action, entity_id, title, amount, details)
  VALUES (v_trip, v_uid, v_name, v_entity, v_action, v_id, v_title, v_amount, v_details);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS expenses_log_activity ON public.expenses;
CREATE TRIGGER expenses_log_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.log_trip_activity();

DROP TRIGGER IF EXISTS itinerary_items_log_activity ON public.itinerary_items;
CREATE TRIGGER itinerary_items_log_activity
  AFTER INSERT OR DELETE ON public.itinerary_items
  FOR EACH ROW EXECUTE FUNCTION public.log_trip_activity();


-- ─── 2. Dépenses récurrentes ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title         text NOT NULL,
  amount        numeric NOT NULL,                  -- dans `currency`
  currency      text NOT NULL,
  exchange_rate numeric NOT NULL DEFAULT 1,
  category      text NOT NULL,
  payers        jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{participantId, amount}] en devise du voyage
  split_mode    text NOT NULL DEFAULT 'equal',
  splits        jsonb NOT NULL DEFAULT '[]'::jsonb,
  frequency     text NOT NULL,
  anchor_day    integer NOT NULL,                  -- jour du mois voulu (évite la dérive 31 → 28 → 28)
  next_date     date NOT NULL,
  created_by    uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recurring_expenses_frequency_check CHECK (frequency IN ('weekly', 'monthly'))
);

CREATE INDEX IF NOT EXISTS recurring_expenses_trip_idx ON public.recurring_expenses (trip_id, next_date);

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip members can CRUD recurring_expenses" ON public.recurring_expenses;
CREATE POLICY "Trip members can CRUD recurring_expenses"
  ON public.recurring_expenses FOR ALL
  USING (public.is_trip_member(trip_id))
  WITH CHECK (public.is_trip_member(trip_id));

CREATE OR REPLACE FUNCTION public.next_recurrence(p_from date, p_frequency text, p_anchor_day integer)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_frequency
    WHEN 'weekly' THEN p_from + 7
    ELSE (
      date_trunc('month', p_from)::date + interval '1 month'
      + (LEAST(
          p_anchor_day,
          EXTRACT(day FROM (date_trunc('month', p_from) + interval '2 month' - interval '1 day'))::int
        ) - 1) * interval '1 day'
    )::date
  END;
$$;

-- Crée les dépenses échues, une seule fois même si deux téléphones l'appellent
-- en même temps (verrou de ligne + avance de next_date dans la même transaction).
CREATE OR REPLACE FUNCTION public.apply_recurring_expenses(p_trip_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r       record;
  v_count integer := 0;
  v_loops integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_trip_member(p_trip_id) THEN
    RAISE EXCEPTION 'Not a member of this trip' USING ERRCODE = '42501';
  END IF;

  FOR r IN
    SELECT * FROM public.recurring_expenses
    WHERE trip_id = p_trip_id AND next_date <= current_date
    FOR UPDATE
  LOOP
    v_loops := 0;
    WHILE r.next_date <= current_date AND v_loops < 24 LOOP
      INSERT INTO public.expenses (
        trip_id, title, amount, currency, exchange_rate, amount_in_trip_currency,
        category, paid_by_id, payers, date, split_mode, splits, notes
      ) VALUES (
        r.trip_id, r.title, r.amount, r.currency, r.exchange_rate,
        round(r.amount * r.exchange_rate, 2),
        r.category,
        NULLIF(r.payers -> 0 ->> 'participantId', '')::uuid,
        r.payers, r.next_date, r.split_mode, r.splits, 'Dépense récurrente'
      );
      r.next_date := public.next_recurrence(r.next_date, r.frequency, r.anchor_day);
      v_loops := v_loops + 1;
      v_count := v_count + 1;
    END LOOP;
    UPDATE public.recurring_expenses SET next_date = r.next_date WHERE id = r.id;
  END LOOP;

  RETURN v_count;
END;
$$;


-- ─── 3. Suppression de compte ────────────────────────────────
-- Les participants liés au compte restent dans les voyages des autres (sans
-- compte) : leurs dépenses et soldes doivent continuer à tomber juste.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_trip record;
  v_heir uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  FOR v_trip IN SELECT id FROM public.trips WHERE owner_id = v_uid LOOP
    SELECT user_id INTO v_heir
    FROM public.trip_members
    WHERE trip_id = v_trip.id AND user_id <> v_uid
    ORDER BY (role = 'owner') DESC, joined_at ASC
    LIMIT 1;

    IF v_heir IS NULL THEN
      DELETE FROM public.trips WHERE id = v_trip.id;
    ELSE
      UPDATE public.trips SET owner_id = v_heir WHERE id = v_trip.id;
      UPDATE public.trip_members SET role = 'owner' WHERE trip_id = v_trip.id AND user_id = v_heir;
    END IF;
  END LOOP;

  -- Cascade : profil, appartenances, bande, abonnements push.
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;


-- ─── Grants ──────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.log_trip_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_recurring_expenses(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_recurring_expenses(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
