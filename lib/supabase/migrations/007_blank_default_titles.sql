-- ============================================================
-- Migration 007 : Empty default meal titles
--
-- Auto-generated meals previously had a title set to the slot label
-- ("Matin", "Midi", "Soir"). Now the UX requires an empty title that
-- clearly marks the slot as "not filled in yet" — colour appears once
-- the user actually names the meal.
--
-- → Run this once in the Supabase SQL Editor.
-- ============================================================

UPDATE public.meals
  SET title = ''
  WHERE title IN ('Matin', 'Midi', 'Soir',
                  'Petit-déjeuner', 'Déjeuner', 'Dîner');
