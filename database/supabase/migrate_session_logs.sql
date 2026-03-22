-- ============================================================
-- MIGRATION: Add full_name to user_session_logs
-- Run this once in Supabase SQL Editor
-- ============================================================

-- 1. Add full_name column (nullable — guests have no name)
ALTER TABLE user_session_logs
  ADD COLUMN IF NOT EXISTS full_name TEXT;

-- 2. Backfill existing rows from user_profiles (optional but useful)
UPDATE user_session_logs usl
SET full_name = up.full_name
FROM user_profiles up
WHERE usl.user_id = up.user_id
  AND usl.full_name IS NULL;

-- 3. Verify — shows each session with the user's name, login time, logout, and duration
SELECT
  usl.full_name,
  usl.login_date,
  usl.login_at,
  usl.logout_at,
  usl.duration_min,
  CASE
    WHEN usl.logout_at IS NULL THEN 'Active'
    ELSE 'Completed'
  END AS session_status
FROM user_session_logs usl
ORDER BY usl.login_at DESC
LIMIT 20;
