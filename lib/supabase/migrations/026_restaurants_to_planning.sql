-- 026: les menus, c'est ce qu'on cuisine ou achète. Un resto est une étape du planning (type « food »).
-- Les repas « restaurant » existants deviennent des étapes de planning, puis sont retirés des menus.
-- Les triggers de journal sont suspendus le temps de la reprise (pas de fausses lignes « modifié par »).

ALTER TABLE public.itinerary_items DISABLE TRIGGER itinerary_items_log_activity;

-- 1. Repas resto sans étape : on la crée (mêmes heures par défaut que l'app).
INSERT INTO public.itinerary_items (trip_id, date, time, title, description, type, duration_minutes, participant_ids)
SELECT
  m.trip_id,
  m.date,
  CASE m.slot WHEN 'breakfast' THEN '08:00' WHEN 'lunch' THEN '12:00' WHEN 'snack' THEN '16:00' ELSE '20:00' END,
  CASE m.slot WHEN 'breakfast' THEN 'Petit-déjeuner' WHEN 'lunch' THEN 'Déjeuner' WHEN 'snack' THEN 'Goûter' ELSE 'Dîner' END
    || ' · ' || COALESCE(NULLIF(trim(m.title), ''), 'Resto'),
  NULLIF(concat_ws(E'\n', NULLIF(m.link, ''), NULLIF(m.notes, '')), ''),
  'food',
  CASE WHEN m.slot = 'snack' THEN 30 ELSE 60 END,
  COALESCE(m.participant_ids, '[]'::jsonb)
FROM public.meals m
WHERE m.category = 'restaurant'
  AND NOT EXISTS (SELECT 1 FROM public.itinerary_items i WHERE i.meal_id = m.id);

-- 2. Étapes déjà liées à un repas resto : on les détache (sinon la suppression du repas les emporterait)
--    et on garde les plats dans la description.
UPDATE public.itinerary_items i
SET meal_id = NULL,
    description = NULLIF(concat_ws(
      E'\n',
      NULLIF(i.description, ''),
      (SELECT 'Au menu : ' || string_agg(d ->> 'name', ', ') FROM jsonb_array_elements(m.dishes) d WHERE COALESCE(d ->> 'name', '') <> '')
    ), '')
FROM public.meals m
WHERE i.meal_id = m.id AND m.category = 'restaurant';

-- 3. Les repas resto quittent les menus.
DELETE FROM public.meals WHERE category = 'restaurant';

ALTER TABLE public.itinerary_items ENABLE TRIGGER itinerary_items_log_activity;
