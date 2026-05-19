-- ============================================================
-- 017 — Profile payment info (RIB + phone)
-- ============================================================
-- Adds IBAN/RIB + phone number to user profiles so other members
-- of a trip can find how to reimburse this user.
--
-- Visibility is gated by the `get_payment_info` RPC introduced in
-- migration 019 — these columns stay protected by the existing
-- "Users can read their own profile" RLS policy, the RPC does the
-- cross-user exposure with `SECURITY DEFINER`.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS iban  text,
  ADD COLUMN IF NOT EXISTS phone text;
