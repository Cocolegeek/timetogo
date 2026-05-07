-- ============================================================
-- Migration 006 : Menu redesign (3 fixed slots + categories + cooks)
--
-- - Reduces meals to 3 slots per day: breakfast / lunch / dinner
-- - Adds `category` (home / picnic / restaurant) for the colored badge
-- - Adds `cook_ids` (jsonb array) for who manages the meal
-- - Adds `ingredients` (jsonb array of {id, name, quantity}) replacing `dishes`
-- - Drops the old `dishes` column (no longer used)
--
-- → Run this once in the Supabase SQL Editor.
-- ============================================================

-- 1. Add new columns
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS category    text  NOT NULL DEFAULT 'home',
  ADD COLUMN IF NOT EXISTS cook_ids    jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ingredients jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Remove old slot types we no longer use (snack / apero / extra)
DELETE FROM public.meals
  WHERE slot NOT IN ('breakfast', 'lunch', 'dinner');

-- 3. Drop the old dishes column (replaced by simpler `ingredients`)
ALTER TABLE public.meals
  DROP COLUMN IF EXISTS dishes;
