-- Add payers column (array of {participantId, amount} in trip currency)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS payers jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Migrate existing rows: single payer → payers array
UPDATE expenses
SET payers = jsonb_build_array(
  jsonb_build_object('participantId', paid_by_id, 'amount', amount_in_trip_currency)
)
WHERE payers = '[]'::jsonb AND paid_by_id IS NOT NULL;
