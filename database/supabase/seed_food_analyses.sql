-- ============================================================
-- FOOD ANALYSES — AI Camera Screen Database
-- Run this in Supabase SQL Editor (logged in or as anon)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Create food_analyses table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_analyses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url    TEXT,                          -- Supabase Storage public URL
  food_name    TEXT        NOT NULL,
  calories     INTEGER     NOT NULL DEFAULT 0,
  benefits     TEXT        DEFAULT '',
  nutrients    TEXT        DEFAULT '',        -- e.g. "protein 32g, carbs 18g, fat 9g"
  analyzed_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 2. Indexes for fast lookups
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_food_analyses_user_id
  ON food_analyses (user_id);

CREATE INDEX IF NOT EXISTS idx_food_analyses_analyzed_at
  ON food_analyses (analyzed_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 3. Row Level Security
-- ─────────────────────────────────────────────────────────────
ALTER TABLE food_analyses ENABLE ROW LEVEL SECURITY;

-- Logged-in users see only their own rows
DROP POLICY IF EXISTS "User owns food analyses" ON food_analyses;
CREATE POLICY "User owns food analyses" ON food_analyses
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Public read for guest rows (user_id IS NULL)
DROP POLICY IF EXISTS "Public read guest analyses" ON food_analyses;
CREATE POLICY "Public read guest analyses" ON food_analyses
  FOR SELECT USING (user_id IS NULL);

-- ─────────────────────────────────────────────────────────────
-- 4. Enable Realtime (required for live savedContainer updates)
-- ─────────────────────────────────────────────────────────────
-- Run in Supabase Dashboard → Database → Replication → food_analyses → Enable
-- OR run this (works in some Supabase versions):
ALTER PUBLICATION supabase_realtime ADD TABLE food_analyses;

-- ─────────────────────────────────────────────────────────────
-- 5. Storage bucket for food images
-- ─────────────────────────────────────────────────────────────
-- Create via Dashboard → Storage → New Bucket:
--   Name: food-images
--   Public: ✅ (so image URLs work without auth headers)
--
-- Or via SQL (requires pg_storage extension):
-- INSERT INTO storage.buckets (id, name, public)
--   VALUES ('food-images', 'food-images', true)
--   ON CONFLICT (id) DO NOTHING;

-- Storage policies (run in Dashboard → Storage → food-images → Policies):
-- POLICY 1 — Users can upload their own images:
-- CREATE POLICY "Users upload own images" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'food-images' AND
--     (auth.uid()::text = (storage.foldername(name))[1] OR (storage.foldername(name))[1] = 'guest')
--   );
--
-- POLICY 2 — Public can read all images:
-- CREATE POLICY "Public read food images" ON storage.objects
--   FOR SELECT USING (bucket_id = 'food-images');
--
-- POLICY 3 — Users can delete own images:
-- CREATE POLICY "Users delete own images" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]
--   );

-- ─────────────────────────────────────────────────────────────
-- 6. Demo seed rows (guest = user_id NULL, always works)
-- ─────────────────────────────────────────────────────────────
INSERT INTO food_analyses (user_id, image_url, food_name, calories, benefits, nutrients) VALUES
  (NULL, NULL, 'Grilled Chicken Salad',  350,
   'High in protein supporting muscle repair. Rich in vitamins A and C from greens. Low carb, ideal for weight management.',
   'protein 38g, carbs 12g, fat 9g, fiber 4g'),
  (NULL, NULL, 'Salmon with Vegetables', 420,
   'Omega-3 fatty acids support heart and brain health. Anti-inflammatory properties from vegetables. Excellent source of vitamin D.',
   'protein 42g, carbs 18g, fat 18g, fiber 5g'),
  (NULL, NULL, 'Quinoa Buddha Bowl',     480,
   'Complete plant protein with all essential amino acids. High in iron and magnesium for energy. Fiber-rich for digestive health.',
   'protein 22g, carbs 58g, fat 14g, fiber 9g')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 7. Verify
-- ─────────────────────────────────────────────────────────────
SELECT id, food_name, calories, nutrients, analyzed_at
FROM food_analyses
ORDER BY analyzed_at DESC
LIMIT 10;

-- Migration note: if food_analyses already exists without nutrients column:
-- ALTER TABLE food_analyses ADD COLUMN IF NOT EXISTS nutrients TEXT DEFAULT '';

-- 🎉 Done! food_analyses table ready. Enable Realtime + create storage bucket to complete setup.
