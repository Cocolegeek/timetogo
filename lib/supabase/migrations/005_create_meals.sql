-- ============================================================
-- Migration 005 : Meal planning feature
--
-- Creates the `meals` table that stores per-day meal slots
-- (breakfast / lunch / snack / dinner / apero / extra) along with
-- dishes (embedded JSON) and the participants involved.
--
-- → Run this once in the Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id         uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  date            date NOT NULL,
  slot            text NOT NULL,        -- 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'apero' | 'extra'
  title           text NOT NULL,
  notes           text,
  participant_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  dishes          jsonb NOT NULL DEFAULT '[]'::jsonb,
  position        integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can CRUD meals"
  ON public.meals FOR ALL
  USING (public.is_trip_member(trip_id))
  WITH CHECK (public.is_trip_member(trip_id));

CREATE INDEX IF NOT EXISTS idx_meals_trip_date
  ON public.meals(trip_id, date, position);
