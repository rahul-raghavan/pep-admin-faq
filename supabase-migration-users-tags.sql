-- ============================================================
-- AdminPKM Migration: Users, Multi-Category, Tags
-- Run this in Supabase SQL Editor AFTER running supabase-setup.sql
-- ============================================================

-- === 1. Users table ===
CREATE TABLE IF NOT EXISTS adminpkm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for users
ALTER TABLE adminpkm_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read users"
  ON adminpkm_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage users"
  ON adminpkm_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed super admins
INSERT INTO adminpkm_users (email, role) VALUES
  ('rahul@pepschoolv2.com', 'super_admin'),
  ('chetan@pepschoolv2.com', 'super_admin')
ON CONFLICT (email) DO NOTHING;


-- === 2. FAQ Entry Categories join table (many-to-many) ===
CREATE TABLE IF NOT EXISTS adminpkm_faq_entry_categories (
  faq_entry_id UUID NOT NULL REFERENCES adminpkm_faq_entries(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES adminpkm_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (faq_entry_id, category_id)
);

-- RLS for faq_entry_categories
ALTER TABLE adminpkm_faq_entry_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read faq_entry_categories"
  ON adminpkm_faq_entry_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert faq_entry_categories"
  ON adminpkm_faq_entry_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete faq_entry_categories"
  ON adminpkm_faq_entry_categories FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage faq_entry_categories"
  ON adminpkm_faq_entry_categories FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Migrate existing category_id data into the join table
INSERT INTO adminpkm_faq_entry_categories (faq_entry_id, category_id)
SELECT id, category_id
FROM adminpkm_faq_entries
WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop the old category_id column
ALTER TABLE adminpkm_faq_entries DROP COLUMN IF EXISTS category_id;


-- === 3. Tags table ===
CREATE TABLE IF NOT EXISTS adminpkm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for tags
ALTER TABLE adminpkm_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tags"
  ON adminpkm_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage tags"
  ON adminpkm_tags FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- === 4. FAQ Entry Tags join table ===
CREATE TABLE IF NOT EXISTS adminpkm_faq_entry_tags (
  faq_entry_id UUID NOT NULL REFERENCES adminpkm_faq_entries(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES adminpkm_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (faq_entry_id, tag_id)
);

-- RLS for faq_entry_tags
ALTER TABLE adminpkm_faq_entry_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read faq_entry_tags"
  ON adminpkm_faq_entry_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert faq_entry_tags"
  ON adminpkm_faq_entry_tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete faq_entry_tags"
  ON adminpkm_faq_entry_tags FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage faq_entry_tags"
  ON adminpkm_faq_entry_tags FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- === 5. Updated_at triggers ===
CREATE OR REPLACE FUNCTION adminpkm_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER adminpkm_users_updated_at
  BEFORE UPDATE ON adminpkm_users
  FOR EACH ROW EXECUTE FUNCTION adminpkm_update_updated_at();

CREATE TRIGGER adminpkm_tags_updated_at
  BEFORE UPDATE ON adminpkm_tags
  FOR EACH ROW EXECUTE FUNCTION adminpkm_update_updated_at();
