-- Migration: Tighten RLS policies for voice notes and storage
-- Run this in the Supabase SQL Editor after deploying the code changes.
--
-- Changes:
-- 1. Voice notes SELECT: was open to all authenticated → now own records only
-- 2. Voice notes UPDATE: was open to all authenticated → now own records only
-- 3. Storage SELECT: was open to all in bucket → now own folder only
-- (INSERT policies are already correctly scoped)

-- ============================================================
-- 1. Voice notes: restrict reads to own records
-- ============================================================
DROP POLICY IF EXISTS "adminpkm: read voice notes" ON adminpkm_voice_notes;
CREATE POLICY "adminpkm: read voice notes" ON adminpkm_voice_notes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- 2. Voice notes: restrict updates to own records
-- ============================================================
DROP POLICY IF EXISTS "adminpkm: update voice notes" ON adminpkm_voice_notes;
CREATE POLICY "adminpkm: update voice notes" ON adminpkm_voice_notes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. Storage: restrict reads to own folder
--    Files are stored as {user_id}/{timestamp}.{ext}
-- ============================================================
DROP POLICY IF EXISTS "adminpkm: read voice notes storage" ON storage.objects;
CREATE POLICY "adminpkm: read voice notes storage" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'adminpkm-voice-notes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
