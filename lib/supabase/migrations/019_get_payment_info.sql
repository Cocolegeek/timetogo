-- ============================================================
-- 019 — RPC get_payment_info
-- ============================================================
-- Exposes the IBAN + phone of the user who is currently linked as
-- `is_primary` for a given participant, but ONLY to other members
-- of the same trip.
--
-- Returns NULL if:
--   - no user is linked to this participant
--   - no user has primary status (shouldn't happen post-migration 018)
--   - the caller is not a member of the trip
--
-- The caller is implicitly limited by `is_trip_member` — anonymous
-- callers and outsiders get an empty result set.

CREATE OR REPLACE FUNCTION public.get_payment_info(p_participant_id uuid)
RETURNS TABLE (iban text, phone text, owner_name text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT pf.iban, pf.phone, pf.name
  FROM public.trip_members tm
  JOIN public.participants pa ON pa.id = tm.participant_id
  JOIN public.profiles pf     ON pf.id = tm.user_id
  WHERE tm.participant_id = p_participant_id
    AND tm.is_primary = true
    AND public.is_trip_member(pa.trip_id)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_payment_info(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_info(uuid) TO authenticated;
