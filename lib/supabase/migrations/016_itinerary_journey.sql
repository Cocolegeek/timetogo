-- Migration 016 : Trajet type pour itinerary_items
-- Adds destination (arrival point) and journey_mode columns.

ALTER TABLE public.itinerary_items
  ADD COLUMN IF NOT EXISTS destination text,
  ADD COLUMN IF NOT EXISTS journey_mode text;
