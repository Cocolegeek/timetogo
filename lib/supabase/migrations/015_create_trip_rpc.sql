-- Bypass an unexplained RLS bug on trips INSERT where the policy
-- (auth.uid() = owner_id) evaluates to false even when auth.uid()
-- and owner_id are confirmed equal. Going through a SECURITY DEFINER
-- RPC stays safe because the function forces owner_id := auth.uid()
-- and rejects unauthenticated calls.

CREATE OR REPLACE FUNCTION public.create_trip_with_owner(
  p_name text,
  p_type text,
  p_destination text,
  p_emoji text,
  p_currency text,
  p_start_date date,
  p_end_date date,
  p_total_budget numeric,
  p_share_code text,
  p_participants jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_trip_id uuid;
  v_participant jsonb;
  v_matched_id uuid;
  v_user_name text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.trips (
    name, type, destination, emoji, currency,
    start_date, end_date, total_budget, share_code, owner_id
  )
  VALUES (
    p_name, p_type, p_destination, p_emoji, p_currency,
    p_start_date, p_end_date, p_total_budget, p_share_code, v_user_id
  )
  RETURNING id INTO v_trip_id;

  INSERT INTO public.trip_members (trip_id, user_id, participant_id, role)
  VALUES (v_trip_id, v_user_id, NULL, 'owner');

  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants)
  LOOP
    INSERT INTO public.participants (trip_id, name, color, avatar)
    VALUES (
      v_trip_id,
      v_participant->>'name',
      v_participant->>'color',
      NULLIF(v_participant->>'avatar', '')
    );
  END LOOP;

  SELECT name INTO v_user_name FROM public.profiles WHERE id = v_user_id;
  IF v_user_name IS NOT NULL THEN
    SELECT id INTO v_matched_id
    FROM public.participants
    WHERE trip_id = v_trip_id AND lower(name) = lower(v_user_name)
    LIMIT 1;

    IF v_matched_id IS NOT NULL THEN
      UPDATE public.trip_members
      SET participant_id = v_matched_id
      WHERE trip_id = v_trip_id AND user_id = v_user_id;
    END IF;
  END IF;

  RETURN v_trip_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_trip_with_owner(
  text, text, text, text, text, date, date, numeric, text, jsonb
) TO authenticated;
