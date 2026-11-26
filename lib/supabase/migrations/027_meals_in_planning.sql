-- 027: réglage « repas dans le planning » (par défaut oui, comme avant).
-- Éteint, les étapes créées par les repas restent en base mais ne s'affichent plus dans le planning : rien n'est supprimé, on peut les remettre.
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS meals_in_planning boolean NOT NULL DEFAULT true;
