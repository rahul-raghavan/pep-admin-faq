-- AdminPKM Migration: Performance indexes
-- Run this in Supabase SQL Editor

-- Speed up category-based FAQ lookups (used in dedup + KB display)
CREATE INDEX IF NOT EXISTS adminpkm_faq_entry_categories_category_idx
  ON adminpkm_faq_entry_categories(category_id, faq_entry_id);

-- Speed up tag-based FAQ lookups
CREATE INDEX IF NOT EXISTS adminpkm_faq_entry_tags_tag_idx
  ON adminpkm_faq_entry_tags(tag_id, faq_entry_id);

-- Speed up review queue + KB list queries
CREATE INDEX IF NOT EXISTS adminpkm_faq_entries_review_status_idx
  ON adminpkm_faq_entries(review_status, is_merged, created_at DESC);

-- Speed up voice notes listing by user
CREATE INDEX IF NOT EXISTS adminpkm_voice_notes_user_idx
  ON adminpkm_voice_notes(user_id, created_at DESC);
