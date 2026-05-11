-- ============================================================
-- 011 — Verrouille les SELECT publics sur trips et participants
-- ============================================================
-- Avant cette migration, deux policies laissaient fuiter toutes
-- les données :
--   - "Anyone can read trip by share_code" ON trips USING (true)
--   - "Anyone can read participants for joining" ON participants USING (EXISTS ...)
-- Conséquence : un utilisateur authentifié pouvait lister tous les
-- voyages, récupérer leur share_code et rejoindre n'importe lequel.
--
-- Cette migration les supprime et introduit une fonction
-- SECURITY DEFINER qui retourne uniquement le voyage + participants
-- matchant un share_code donné. Le client passe par cette RPC pour
-- le flow de jointure.

DROP POLICY IF EXISTS "Anyone can read trip by share_code" ON public.trips;
DROP POLICY IF EXISTS "Anyone can read participants for joining" ON public.participants;

CREATE OR REPLACE FUNCTION public.get_join_preview(p_code text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN t.id IS NULL THEN NULL
    ELSE jsonb_build_object(
      'id',           t.id,
      'name',         t.name,
      'destination',  t.destination,
      'emoji',        t.emoji,
      'currency',     t.currency,
      'start_date',   t.start_date,
      'end_date',     t.end_date,
      'share_code',   t.share_code,
      'type',         COALESCE(t.type, 'trip'),
      'participants', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id',     p.id,
          'name',   p.name,
          'color',  p.color,
          'avatar', p.avatar
        ) ORDER BY p.created_at)
        FROM public.participants p
        WHERE p.trip_id = t.id
      ), '[]'::jsonb)
    )
  END
  FROM public.trips t
  WHERE t.share_code = upper(p_code)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_join_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_join_preview(text) TO authenticated;
