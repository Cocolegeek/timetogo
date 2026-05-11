-- ============================================================
-- 012 — RPC atomique pour rejoindre un voyage
-- ============================================================
-- Permet à un utilisateur authentifié de rejoindre un voyage en
-- une seule transaction, soit en sélectionnant un participant
-- existant, soit en en créant un nouveau au passage.
--
-- Pourquoi une RPC SECURITY DEFINER : sans être encore membre du
-- voyage, l'utilisateur ne peut pas insérer dans `participants`
-- (RLS l'en empêche). Cette fonction tourne avec les privilèges
-- du créateur et fait les insertions atomiquement, avec ses
-- propres garde-fous (share_code valide, pas de double join).

CREATE OR REPLACE FUNCTION public.join_trip(
  p_code              text,
  p_participant_id    uuid DEFAULT NULL,
  p_new_participant_name  text DEFAULT NULL,
  p_new_participant_color text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_trip_id  uuid;
  v_part_id  uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_trip_id
  FROM public.trips
  WHERE share_code = upper(p_code);

  IF v_trip_id IS NULL THEN
    RAISE EXCEPTION 'Trip not found' USING ERRCODE = '22023';
  END IF;

  -- Idempotent: si déjà membre, on renvoie juste le trip_id
  IF EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_id = v_trip_id AND user_id = v_user_id
  ) THEN
    RETURN v_trip_id;
  END IF;

  -- Soit on utilise un participant existant, soit on en crée un
  IF p_participant_id IS NOT NULL THEN
    -- Vérifie que le participant appartient bien à ce trip
    SELECT id INTO v_part_id
    FROM public.participants
    WHERE id = p_participant_id AND trip_id = v_trip_id;

    IF v_part_id IS NULL THEN
      RAISE EXCEPTION 'Participant not in trip' USING ERRCODE = '22023';
    END IF;
  ELSIF p_new_participant_name IS NOT NULL AND length(trim(p_new_participant_name)) > 0 THEN
    INSERT INTO public.participants (trip_id, name, color)
    VALUES (
      v_trip_id,
      trim(p_new_participant_name),
      COALESCE(p_new_participant_color, '#6366f1')
    )
    RETURNING id INTO v_part_id;
  ELSE
    RAISE EXCEPTION 'Provide either participant_id or new_participant_name' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.trip_members (trip_id, user_id, participant_id, role)
  VALUES (v_trip_id, v_user_id, v_part_id, 'contributor');

  RETURN v_trip_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_trip(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_trip(text, uuid, text, text) TO authenticated;
