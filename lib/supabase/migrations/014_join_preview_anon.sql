-- ============================================================
-- 014 — Permet aux utilisateurs anonymes de lire l'aperçu du join
-- ============================================================
-- Avant cette migration, get_join_preview n'était accessible qu'aux
-- utilisateurs authentifiés. Conséquence : un visiteur non connecté
-- qui ouvre un lien de partage `/join?code=XXX` voyait "lien cassé"
-- alors que le voyage existait.
--
-- La fonction reste SECURITY DEFINER (ne renvoie que le voyage
-- correspondant au share_code, pas toute la table). On élargit
-- simplement le GRANT au rôle anon pour permettre le preview
-- avant connexion.
--
-- join_trip RPC reste réservé aux authentifiés (migration 012).

GRANT EXECUTE ON FUNCTION public.get_join_preview(text) TO anon;
