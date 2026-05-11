-- ============================================================
-- 013 — Custom avatars (trip icons + profile photos)
-- ============================================================
-- Ajoute la possibilité d'uploader une image custom à la place de
-- l'emoji (trips) ou de l'avatar Google (profiles).
--
-- ⚠️ ACTION MANUELLE EN PLUS :
-- Crée 2 buckets Storage dans le dashboard Supabase, tous deux PUBLIC :
--   - "trip-icons"
--   - "profile-avatars"
-- Les policies ci-dessous s'appliquent une fois les buckets créés.

-- ─── Colonnes ────────────────────────────────────────────────
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS icon_url text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_avatar_url text;

-- ─── Storage policies ────────────────────────────────────────
-- Convention de chemin: {user_uuid}/{...}.webp
-- L'utilisateur ne peut écrire que dans son dossier; lecture publique.

-- trip-icons
DROP POLICY IF EXISTS "trip-icons read public" ON storage.objects;
DROP POLICY IF EXISTS "trip-icons write own folder" ON storage.objects;
DROP POLICY IF EXISTS "trip-icons update own folder" ON storage.objects;
DROP POLICY IF EXISTS "trip-icons delete own folder" ON storage.objects;

CREATE POLICY "trip-icons read public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'trip-icons');

CREATE POLICY "trip-icons write own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'trip-icons'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "trip-icons update own folder"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'trip-icons'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "trip-icons delete own folder"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'trip-icons'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- profile-avatars
DROP POLICY IF EXISTS "profile-avatars read public" ON storage.objects;
DROP POLICY IF EXISTS "profile-avatars write own folder" ON storage.objects;
DROP POLICY IF EXISTS "profile-avatars update own folder" ON storage.objects;
DROP POLICY IF EXISTS "profile-avatars delete own folder" ON storage.objects;

CREATE POLICY "profile-avatars read public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile-avatars');

CREATE POLICY "profile-avatars write own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'profile-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "profile-avatars update own folder"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'profile-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "profile-avatars delete own folder"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'profile-avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
