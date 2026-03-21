-- ============================================================
-- FOOD ANALYSES — Camera Screen Database
-- Stores every captured photo + AI analysis results
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Create table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_analyses (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url    TEXT,
  food_name    TEXT        NOT NULL DEFAULT 'Analyzing...',
  calories     INTEGER     DEFAULT 0,
  benefits     TEXT        DEFAULT '',
  nutrients    TEXT        DEFAULT '',
  status       TEXT        DEFAULT 'pending' CHECK (status IN ('pending','analyzed','error')),
  captured_at  TIMESTAMPTZ DEFAULT NOW(),   -- set when photo is taken
  analyzed_at  TIMESTAMPTZ                  -- set when AI finishes
);

-- ─────────────────────────────────────────────────────────────
-- 2. Indexes
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_food_analyses_user_id    ON food_analyses (user_id);
CREATE INDEX IF NOT EXISTS idx_food_analyses_captured   ON food_analyses (captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_analyses_status     ON food_analyses (status);

-- ─────────────────────────────────────────────────────────────
-- 3. Row Level Security
-- ─────────────────────────────────────────────────────────────
ALTER TABLE food_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User owns food analyses" ON food_analyses;
CREATE POLICY "User owns food analyses" ON food_analyses
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Public read guest analyses" ON food_analyses;
CREATE POLICY "Public read guest analyses" ON food_analyses
  FOR SELECT USING (user_id IS NULL);

-- ─────────────────────────────────────────────────────────────
-- 4. Enable Realtime
-- ─────────────────────────────────────────────────────────────
-- Dashboard → Database → Replication → enable food_analyses
-- OR:
ALTER PUBLICATION supabase_realtime ADD TABLE food_analyses;

-- ─────────────────────────────────────────────────────────────
-- 5. Storage bucket  (Dashboard → Storage → New Bucket)
--    Name: food-images   Public: YES
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- 6. Demo seed
-- ─────────────────────────────────────────────────────────────
INSERT INTO food_analyses (user_id, image_url, food_name, calories, benefits, nutrients, status, captured_at, analyzed_at) VALUES
  (NULL, NULL, 'Grilled Chicken Salad', 350,
   'High in protein supporting muscle repair. Rich in vitamins A and C. Low carb, ideal for weight management.',
   'protein 38g, carbs 12g, fat 9g, fiber 4g', 'analyzed', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
  (NULL, NULL, 'Salmon with Vegetables', 420,
   'Omega-3 fatty acids support heart and brain health. Anti-inflammatory. Excellent source of vitamin D.',
   'protein 42g, carbs 18g, fat 18g, fiber 5g', 'analyzed', NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour'),
  (NULL, NULL, 'Analyzing...', 0, '', '', 'pending', NOW(), NULL)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 7. Migration (if table already exists without new columns)
-- ─────────────────────────────────────────────────────────────
-- ALTER TABLE food_analyses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'analyzed' CHECK (status IN ('pending','analyzed','error'));
-- ALTER TABLE food_analyses ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ DEFAULT NOW();
-- ALTER TABLE food_analyses ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ;
-- UPDATE food_analyses SET captured_at = created_at WHERE captured_at IS NULL;
-- UPDATE food_analyses SET status = 'analyzed' WHERE status IS NULL;

-- 7. Verify
SELECT id, food_name, calories, status, captured_at FROM food_analyses ORDER BY captured_at DESC LIMIT 10;
