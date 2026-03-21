-- ============================================================
-- DAILY ACTIVITY AUDIT TABLES
-- daily_activity_logs  — every food/exercise item the user adds
-- user_session_logs    — every login/logout for consistency tracking
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. daily_activity_logs
--    One row per item added (food from RecipesScreen,
--    exercise from ExerciseScreen)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_activity_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  activity_type  TEXT        NOT NULL CHECK (activity_type IN ('food','exercise')),
  item_name      TEXT        NOT NULL,
  item_category  TEXT,
  calories       INTEGER     NOT NULL DEFAULT 0,
  logged_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dal_user_date  ON daily_activity_logs (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_dal_type       ON daily_activity_logs (user_id, activity_type);

ALTER TABLE daily_activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own activity logs" ON daily_activity_logs;
CREATE POLICY "Users manage own activity logs" ON daily_activity_logs
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- ─────────────────────────────────────────────────────────────
-- 2. user_session_logs
--    One row per session — records login_at, logout_at,
--    and login_date (used for consistency streak tracking)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_session_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  login_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at    TIMESTAMPTZ,                       -- NULL = session still active
  duration_min INTEGER                            -- filled on logout
);

CREATE INDEX IF NOT EXISTS idx_usl_user_date ON user_session_logs (user_id, login_date DESC);

ALTER TABLE user_session_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own sessions" ON user_session_logs;
CREATE POLICY "Users manage own sessions" ON user_session_logs
  FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. Enable Realtime
-- ─────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE daily_activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE user_session_logs;

-- ─────────────────────────────────────────────────────────────
-- 4. HOW SESSIONS ARE LOGGED (already wired in AppEntry.tsx)
-- ─────────────────────────────────────────────────────────────
-- On LOGIN  → INSERT INTO user_session_logs (user_id, login_date, login_at)
-- On LOGOUT → UPDATE user_session_logs SET logout_at = NOW(),
--               duration_min = EXTRACT(EPOCH FROM (NOW()-login_at))/60
--             WHERE user_id = auth.uid() AND logout_at IS NULL
--             ORDER BY login_at DESC LIMIT 1

-- ─────────────────────────────────────────────────────────────
-- 5. Verify
-- ─────────────────────────────────────────────────────────────
-- Activity logs (last 7 days)
SELECT log_date, activity_type, item_name, item_category, calories
FROM daily_activity_logs
WHERE user_id = auth.uid()
  AND log_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY logged_at DESC;

-- Session logs (last 30 days — for consistency streak)
SELECT login_date, login_at, logout_at, duration_min
FROM user_session_logs
WHERE user_id = auth.uid()
  AND login_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY login_at DESC;

-- Unique login days this month (consistency count)
SELECT COUNT(DISTINCT login_date) AS login_days_this_month
FROM user_session_logs
WHERE user_id = auth.uid()
  AND login_date >= DATE_TRUNC('month', CURRENT_DATE);
