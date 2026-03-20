-- ============================================================
-- GOALS TABLES: goal_logs + goal_settings
-- goal_logs   — daily food/exercise entries for consistency tracking
-- goal_settings — per-user custom targets (exercise daily kcal etc.)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. goal_logs — one row per user per day
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goal_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date          DATE        NOT NULL DEFAULT CURRENT_DATE,

  -- Food intake (from RecipesScreen)
  calories_consumed INTEGER     DEFAULT 0,
  carbs_g           NUMERIC(6,1) DEFAULT 0,
  protein_g         NUMERIC(6,1) DEFAULT 0,
  fat_g             NUMERIC(6,1) DEFAULT 0,
  fiber_g           NUMERIC(6,1) DEFAULT 0,

  -- Exercise (from ExerciseScreen)
  calories_burned   INTEGER     DEFAULT 0,
  exercise_minutes  INTEGER     DEFAULT 0,

  -- Goal achieved flag (set when user hits 80%+ of calorie goal)
  goal_achieved     BOOLEAN     DEFAULT FALSE,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id, log_date)   -- one row per user per day
);

CREATE INDEX IF NOT EXISTS idx_goal_logs_user_date ON goal_logs (user_id, log_date DESC);

ALTER TABLE goal_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own logs" ON goal_logs;
CREATE POLICY "Users manage own logs" ON goal_logs
  FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 2. goal_settings — per-user custom targets
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goal_settings (
  user_id                UUID  PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_daily_target  INTEGER DEFAULT 300,   -- kcal/day exercise target
  carbs_target_g         NUMERIC(6,1) DEFAULT 500,
  protein_target_g       NUMERIC(6,1) DEFAULT 150,
  fat_target_g           NUMERIC(6,1) DEFAULT 80,
  fiber_target_g         NUMERIC(6,1) DEFAULT 30,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE goal_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own settings" ON goal_settings;
CREATE POLICY "Users manage own settings" ON goal_settings
  FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. Auto-update updated_at
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_goal_logs ON goal_logs;
CREATE TRIGGER set_updated_at_goal_logs
  BEFORE UPDATE ON goal_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_goal_settings ON goal_settings;
CREATE TRIGGER set_updated_at_goal_settings
  BEFORE UPDATE ON goal_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 4. Enable Realtime
-- ─────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE goal_logs;

-- ─────────────────────────────────────────────────────────────
-- 5. HOW TO LOG DAILY DATA
-- ─────────────────────────────────────────────────────────────
-- Call this from your app when user adds food/exercise each day:
--
-- INSERT INTO goal_logs (user_id, log_date, calories_consumed, carbs_g, protein_g, fat_g, fiber_g, calories_burned)
-- VALUES (auth.uid(), CURRENT_DATE, 1850, 240, 95, 55, 28, 320)
-- ON CONFLICT (user_id, log_date) DO UPDATE SET
--   calories_consumed = EXCLUDED.calories_consumed,
--   carbs_g           = EXCLUDED.carbs_g,
--   protein_g         = EXCLUDED.protein_g,
--   fat_g             = EXCLUDED.fat_g,
--   fiber_g           = EXCLUDED.fiber_g,
--   calories_burned   = EXCLUDED.calories_burned,
--   goal_achieved     = (EXCLUDED.calories_consumed >= 0.8 * (
--     SELECT daily_calorie_goal FROM user_profiles WHERE user_id = auth.uid()
--   ));

-- ─────────────────────────────────────────────────────────────
-- 6. Migration — add avatar_url to user_profiles if not present
-- ─────────────────────────────────────────────────────────────
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ─────────────────────────────────────────────────────────────
-- 7. Verify
-- ─────────────────────────────────────────────────────────────
SELECT log_date, calories_consumed, calories_burned, goal_achieved
FROM goal_logs
WHERE user_id = auth.uid()
ORDER BY log_date DESC LIMIT 10;
