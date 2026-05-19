-- ============================================================
-- Voyou — Supabase Schema (canonical, up to migration 016)
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
  emoji        text NOT NULL DEFAULT '✈️',
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
  joined_at      timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (trip_id, user_id)
);

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
  slot            text NOT NULL,                          -- 'breakfast' | 'lunch' | 'dinner'
  category        text NOT NULL DEFAULT 'home',           -- 'home' | 'picnic' | 'restaurant'
  title           text NOT NULL,
  notes           text,
  participant_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  cook_ids        jsonb NOT NULL DEFAULT '[]'::jsonb,
  ingredients     jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [{id, name, quantity}]
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

  -- Auto-link owner to participant with matching name
  SELECT name INTO v_user_name FROM public.profiles WHERE id = v_user_id;
  IF v_user_name IS NOT NULL THEN
    SELECT id INTO v_matched_id
    FROM public.participants
    WHERE trip_id = v_trip_id AND lower(name) = lower(v_user_name)
    LIMIT 1;

    IF v_matched_id IS NOT NULL THEN
      UPDATE public.trip_members
      SET participant_id = v_matched_id
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
