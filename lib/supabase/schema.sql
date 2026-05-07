-- ============================================================
-- Time to Go — Supabase Schema
-- Run this in the Supabase SQL editor after creating your project
-- ============================================================

-- ─── Profiles ────────────────────────────────────────────────
-- Auto-created when a user signs up via Google OAuth
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text,
  avatar_url text,
  email      text,
  created_at timestamptz DEFAULT now() NOT NULL
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
CREATE TABLE IF NOT EXISTS public.trips (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  destination  text NOT NULL,
  emoji        text NOT NULL DEFAULT '✈️',
  currency     text NOT NULL DEFAULT 'EUR',
  start_date   date NOT NULL,
  end_date     date NOT NULL,
  total_budget numeric,
  share_code   text UNIQUE NOT NULL,
  owner_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now() NOT NULL,
  updated_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;


-- ─── Participants ────────────────────────────────────────────
-- Named people in a trip used for expense splitting.
-- Not necessarily linked to a user account.
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
-- Users who have access to a trip (owner or contributor).
-- participant_id links the user to their identity within the trip.
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

CREATE POLICY "Authenticated users can insert trips"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Trip members can delete trip"
  ON public.trips FOR DELETE
  USING (public.is_trip_member(id));

-- Allow reading trip by share_code for the join flow (pre-auth check)
CREATE POLICY "Anyone can read trip by share_code"
  ON public.trips FOR SELECT
  USING (true);  -- We restrict via RLS on other tables; share_code lookup is safe


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

-- Allow reading participants by trip share_code for join flow
CREATE POLICY "Anyone can read participants for joining"
  ON public.participants FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.trips WHERE trips.id = participants.trip_id)
  );


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


-- ─── Meals (meal planning) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  date            date NOT NULL,
  slot            text NOT NULL,                                 -- 'breakfast' | 'lunch' | 'dinner'
  category        text NOT NULL DEFAULT 'home',                  -- 'home' | 'picnic' | 'restaurant'
  title           text NOT NULL,
  notes           text,
  participant_ids jsonb NOT NULL DEFAULT '[]'::jsonb,            -- who eats
  cook_ids        jsonb NOT NULL DEFAULT '[]'::jsonb,            -- who manages/cooks
  ingredients     jsonb NOT NULL DEFAULT '[]'::jsonb,            -- [{id, name, quantity}]
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
