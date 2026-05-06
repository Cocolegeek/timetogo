-- ============================================================
-- Migration 002 : Add duration to itinerary items
--
-- Adds a `duration_minutes` column (nullable) so that activities,
-- transports, etc. can carry their expected duration.
--
-- → Run this once in the Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.itinerary_items
  ADD COLUMN IF NOT EXISTS duration_minutes integer;
