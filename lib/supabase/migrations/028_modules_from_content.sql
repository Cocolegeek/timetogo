-- 028: règle unique des espaces (case cochée = onglet là). La migration 025 avait tout coché pour les anciens voyages :
-- on ne garde cochés que les espaces qui contiennent déjà quelque chose, sinon chaque ancien voyage aurait 5 onglets dont des vides.
-- Seuls sont touchés les voyages créés avant la 025 et jamais modifiés depuis (modules encore à la valeur de reprise).
UPDATE public.trips t
SET modules = ARRAY(
  SELECT v.name
  FROM (VALUES
    ('planning', EXISTS (SELECT 1 FROM public.itinerary_items i WHERE i.trip_id = t.id)),
    ('menus',    EXISTS (SELECT 1 FROM public.meals m WHERE m.trip_id = t.id)),
    ('lists',    EXISTS (SELECT 1 FROM public.checklist_items c WHERE c.trip_id = t.id))
  ) AS v(name, has_content)
  WHERE v.has_content
)
WHERE t.created_at < '2026-11-26T13:00:00Z'
  AND (t.modules = ARRAY['planning', 'menus', 'lists']::text[] OR t.modules = ARRAY['lists']::text[]);
