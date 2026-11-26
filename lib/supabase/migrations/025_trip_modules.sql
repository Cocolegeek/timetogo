-- 025: espaces d'un voyage au choix (planning, menus, listes). Le budget est toujours là.
-- Fin de la distinction voyage / groupe : `type` reste en base (ancien champ) mais l'app ne le lit plus.
-- Sans danger sur une base en service : colonne avec valeur par défaut, aucune donnée supprimée.

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS modules text[] NOT NULL DEFAULT '{}';

-- Reprise de l'existant : un voyage garde tous ses espaces, un groupe garde ses listes (et son budget).
UPDATE public.trips
SET modules = CASE WHEN type = 'trip' THEN ARRAY['planning', 'menus', 'lists'] ELSE ARRAY['lists'] END
WHERE modules = '{}';

ALTER TABLE public.trips DROP CONSTRAINT IF EXISTS trips_modules_check;
ALTER TABLE public.trips
  ADD CONSTRAINT trips_modules_check CHECK (modules <@ ARRAY['planning', 'menus', 'lists']);
