-- Discriminator column for trips vs standalone group budgets (à la Tricount).
-- "trip"  → full voyage with destination, dates, planning, menus
-- "group" → budget-only entity (no dates, no destination, budget tab only)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'trip';

ALTER TABLE trips ADD CONSTRAINT trips_type_check CHECK (type IN ('trip', 'group'));

-- Make voyage-only fields nullable so groups can omit them.
ALTER TABLE trips ALTER COLUMN destination DROP NOT NULL;
ALTER TABLE trips ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE trips ALTER COLUMN end_date DROP NOT NULL;
