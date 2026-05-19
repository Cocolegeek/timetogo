-- ============================================================
-- 020 — Multi-dish meals + cleanup of pre-filled empty meals
-- ============================================================
-- Previously a meal had a single `title` + a flat `ingredients`
-- list. We now model the meal as a list of `dishes`, each with
-- its own course (starter/main/dessert/cheese/other), name and
-- ingredients.
--
-- We also drop the auto-prefilled empty meals: existing trips
-- often have 3 rows per day (breakfast/lunch/dinner) with empty
-- title and no ingredients — they pollute the UI. After the
-- refactor meals are created on demand, so we wipe the empties.

-- 1. Add new dishes column
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS dishes jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Migrate existing content into a single dish per meal
UPDATE public.meals
SET dishes = jsonb_build_array(
  jsonb_build_object(
    'id',          gen_random_uuid()::text,
    'course',      'main',
    'name',        COALESCE(NULLIF(title, ''), ''),
    'ingredients', COALESCE(ingredients, '[]'::jsonb)
  )
)
WHERE
  (title IS NOT NULL AND title <> '')
  OR jsonb_array_length(COALESCE(ingredients, '[]'::jsonb)) > 0;

-- 3. Drop empty pre-filled meals (no title, no ingredients, no notes,
--    no cooks/eaters — they were just empty slots)
DELETE FROM public.meals
WHERE
  (title IS NULL OR title = '')
  AND jsonb_array_length(COALESCE(ingredients, '[]'::jsonb)) = 0
  AND jsonb_array_length(COALESCE(dishes, '[]'::jsonb)) = 0
  AND jsonb_array_length(COALESCE(participant_ids, '[]'::jsonb)) = 0
  AND jsonb_array_length(COALESCE(cook_ids, '[]'::jsonb)) = 0
  AND (notes IS NULL OR notes = '');

-- 4. Drop legacy ingredients column (data now lives in dishes[].ingredients)
ALTER TABLE public.meals DROP COLUMN IF EXISTS ingredients;

-- 5. Title becomes optional (used as a free-form note like "Chez Léa")
ALTER TABLE public.meals ALTER COLUMN title DROP NOT NULL;
