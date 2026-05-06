-- ============================================================
-- Migration 001 : Equal rights for all trip members
--
-- Until now, only the trip owner could DELETE a trip.
-- Now all members of a trip have the same rights (edit + delete).
--
-- → Run this once in the Supabase SQL Editor.
-- ============================================================

DROP POLICY IF EXISTS "Owner can delete trip" ON public.trips;

CREATE POLICY "Trip members can delete trip"
  ON public.trips FOR DELETE
  USING (public.is_trip_member(id));

-- The UPDATE policy is already permissive for any member:
--   "Trip members can update trips"  USING (is_trip_member(id))
-- so no change needed there.
