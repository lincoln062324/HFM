-- ============================================================
-- user_reminders — add missing columns + fix RLS for user_id
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add columns if not already present
ALTER TABLE user_reminders ADD COLUMN IF NOT EXISTS user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE user_reminders ADD COLUMN IF NOT EXISTS name       TEXT;
ALTER TABLE user_reminders ADD COLUMN IF NOT EXISTS benefits   TEXT;
ALTER TABLE user_reminders ADD COLUMN IF NOT EXISTS alarm_time TEXT;
ALTER TABLE user_reminders ADD COLUMN IF NOT EXISTS date       DATE DEFAULT CURRENT_DATE;
ALTER TABLE user_reminders ADD COLUMN IF NOT EXISTS repeat     TEXT DEFAULT 'Daily';
ALTER TABLE user_reminders ADD COLUMN IF NOT EXISTS is_active  BOOLEAN DEFAULT TRUE;
ALTER TABLE user_reminders ADD COLUMN IF NOT EXISTS total_done    INTEGER DEFAULT 0;
ALTER TABLE user_reminders ADD COLUMN IF NOT EXISTS total_undone  INTEGER DEFAULT 0;
ALTER TABLE user_reminders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_user_reminders_user ON user_reminders (user_id, created_at DESC);

-- 3. RLS — users see only their own reminders
ALTER TABLE user_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own reminders" ON user_reminders;
CREATE POLICY "Users manage own reminders" ON user_reminders
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- 4. Verify
SELECT name, alarm_time, repeat, is_active, total_done
FROM user_reminders
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;
