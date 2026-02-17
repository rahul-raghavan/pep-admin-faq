-- AdminPKM: Add review queue for conflicting FAQ entries
-- Run this in Supabase SQL Editor

-- Add review columns to faq_entries
ALTER TABLE adminpkm_faq_entries
  ADD COLUMN review_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (review_status IN ('approved', 'needs_review')),
  ADD COLUMN conflicting_answer TEXT,
  ADD COLUMN conflicting_source_voice_note_id UUID REFERENCES adminpkm_voice_notes(id) ON DELETE SET NULL,
  ADD COLUMN conflicting_transcript_excerpt TEXT;

-- Index for filtering
CREATE INDEX adminpkm_faq_entries_review_status_idx ON adminpkm_faq_entries(review_status);
