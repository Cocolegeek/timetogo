-- ============================================================
-- Migration 003 : Assign participants to itinerary items
--
-- Adds a `participant_ids` column (jsonb array) to record which
-- participants are involved in each step of the itinerary.
--
-- → Run this once in the Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.itinerary_items
  ADD COLUMN IF NOT EXISTS participant_ids jsonb DEFAULT '[]'::jsonb NOT NULL;
