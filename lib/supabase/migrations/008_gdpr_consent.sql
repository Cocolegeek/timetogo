ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gdpr_consented_at  timestamptz,
  ADD COLUMN IF NOT EXISTS gdpr_consent_version text,
  ADD COLUMN IF NOT EXISTS gdpr_consent_proof  text;
