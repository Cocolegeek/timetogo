-- Migration 024 : lien d'un repas (resto, pique-nique) + repas ajoutés au planning
-- Additive : aucune donnée existante n'est modifiée, l'ancien code continue de fonctionner.

ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS link text;

-- Une étape du planning créée par un repas garde la référence du repas.
-- Supprimer le repas supprime son étape ; déplacer l'étape dans le planning ne change pas le repas.
ALTER TABLE public.itinerary_items
  ADD COLUMN IF NOT EXISTS meal_id uuid REFERENCES public.meals(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS itinerary_items_meal_id_idx
  ON public.itinerary_items (meal_id)
  WHERE meal_id IS NOT NULL;
