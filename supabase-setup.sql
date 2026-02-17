-- AdminPKM Supabase Setup
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Tables are prefixed with "adminpkm_" so they coexist with other apps in this project

-- 1. Categories table
CREATE TABLE adminpkm_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Voice notes table
CREATE TABLE adminpkm_voice_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_email TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'transcribing', 'transcribed', 'processing', 'completed', 'error')),
  error_message TEXT,
  transcript TEXT,
  ai_response JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. FAQ entries table
CREATE TABLE adminpkm_faq_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category_id UUID REFERENCES adminpkm_categories(id) ON DELETE SET NULL,
  source_voice_note_id UUID REFERENCES adminpkm_voice_notes(id) ON DELETE SET NULL,
  source_transcript_excerpt TEXT,
  is_merged BOOLEAN DEFAULT false,
  merged_from_id UUID REFERENCES adminpkm_faq_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Full-text search vector column
ALTER TABLE adminpkm_faq_entries ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(question, '') || ' ' || coalesce(answer, ''))) STORED;

CREATE INDEX adminpkm_faq_entries_fts_idx ON adminpkm_faq_entries USING gin(fts);

-- 5. Other useful indexes
CREATE INDEX adminpkm_voice_notes_user_id_idx ON adminpkm_voice_notes(user_id);
CREATE INDEX adminpkm_voice_notes_status_idx ON adminpkm_voice_notes(status);
CREATE INDEX adminpkm_faq_entries_category_id_idx ON adminpkm_faq_entries(category_id);
CREATE INDEX adminpkm_faq_entries_source_idx ON adminpkm_faq_entries(source_voice_note_id);

-- 6. Updated_at trigger function (shared — safe to run if it already exists)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER adminpkm_categories_updated_at
  BEFORE UPDATE ON adminpkm_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER adminpkm_voice_notes_updated_at
  BEFORE UPDATE ON adminpkm_voice_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER adminpkm_faq_entries_updated_at
  BEFORE UPDATE ON adminpkm_faq_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. RLS Policies
ALTER TABLE adminpkm_voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE adminpkm_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE adminpkm_faq_entries ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read everything
CREATE POLICY "adminpkm: read voice notes"
  ON adminpkm_voice_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "adminpkm: read categories"
  ON adminpkm_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "adminpkm: read faq entries"
  ON adminpkm_faq_entries FOR SELECT TO authenticated USING (true);

-- Users can insert their own voice notes
CREATE POLICY "adminpkm: insert own voice notes"
  ON adminpkm_voice_notes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role handles all writes for categories and FAQ entries
-- (No additional policy needed — service role bypasses RLS)

-- Allow authenticated users to update voice notes (for status changes during processing)
CREATE POLICY "adminpkm: update voice notes"
  ON adminpkm_voice_notes FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- 8. Storage bucket
-- If this fails, create it manually: Storage → New Bucket → name: "adminpkm-voice-notes", Private: ON
INSERT INTO storage.buckets (id, name, public)
VALUES ('adminpkm-voice-notes', 'adminpkm-voice-notes', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "adminpkm: upload voice notes"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'adminpkm-voice-notes');

CREATE POLICY "adminpkm: read voice notes storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'adminpkm-voice-notes');
