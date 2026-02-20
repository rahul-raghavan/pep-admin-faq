-- AdminPKM Migration: PDF support + universal review queue
-- Run this in Supabase SQL Editor AFTER the initial supabase-setup.sql

-- 1. Add source_type to voice_notes (audio or pdf)
ALTER TABLE adminpkm_voice_notes
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'audio';

ALTER TABLE adminpkm_voice_notes
  DROP CONSTRAINT IF EXISTS adminpkm_voice_notes_source_type_check;

ALTER TABLE adminpkm_voice_notes
  ADD CONSTRAINT adminpkm_voice_notes_source_type_check
  CHECK (source_type IN ('audio', 'pdf'));

-- 2. Expand review_status to include pending_new and pending_merge
--    Drop the old constraint and add the new one
ALTER TABLE adminpkm_faq_entries
  DROP CONSTRAINT IF EXISTS adminpkm_faq_entries_review_status_check;

ALTER TABLE adminpkm_faq_entries
  ADD CONSTRAINT adminpkm_faq_entries_review_status_check
  CHECK (review_status IN ('approved', 'needs_review', 'pending_new', 'pending_merge'));
