-- ============================================================
-- USER PROFILES & AUTH SETUP
-- Run this in Supabase SQL Editor after enabling Auth
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. user_profiles table
--    Links to auth.users. Created automatically on registration.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT        NOT NULL,
  full_name           TEXT,

  -- Onboarding fields
  onboarding_complete BOOLEAN     DEFAULT FALSE,
  goals               TEXT[]      DEFAULT '{}',           -- e.g. ['lose_weight','more_energy']
  age                 INTEGER,
  gender              TEXT        CHECK (gender IN ('male','female','other')),
  height_cm           NUMERIC(5,1),
  weight_kg           NUMERIC(5,1),
  target_weight_kg    NUMERIC(5,1),
  activity_level      TEXT        CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  diet_preference     TEXT        CHECK (diet_preference IN ('none','vegetarian','vegan','keto','paleo','gluten_free')),

  -- Daily targets
  daily_calorie_goal  INTEGER     DEFAULT 2000,
  daily_steps_goal    INTEGER     DEFAULT 8000,
  water_goal_l        NUMERIC(3,1) DEFAULT 2.0,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id)
);

-- ─────────────────────────────────────────────────────────────
-- 2. Indexes
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email   ON user_profiles (email);

-- ─────────────────────────────────────────────────────────────
-- 3. Row Level Security — users can only see their own row
-- ─────────────────────────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own profile" ON user_profiles;
CREATE POLICY "Users manage own profile" ON user_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Allow insert during registration (before session is fully active)
DROP POLICY IF EXISTS "Service insert profile" ON user_profiles;
CREATE POLICY "Service insert profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 4. Auto-update updated_at on every change
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON user_profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 5. SUPABASE AUTH CONFIGURATION (Dashboard settings)
-- ─────────────────────────────────────────────────────────────
-- Go to: Supabase Dashboard → Authentication → Providers → Email
--
--  ✅ Enable Email provider
--  ✅ Enable "Confirm email"          ← triggers OTP email
--  ✅ Enable "Secure email change"
--
-- Go to: Authentication → Email Templates → Confirm signup
--  → The default template sends a 6-digit OTP automatically.
--    You can customise the subject/body there.
--
-- Go to: Authentication → URL Configuration
--  Site URL:      your-app-scheme://  (or leave as default for mobile)
--  Redirect URLs: (leave empty for OTP flow)
--
-- ─────────────────────────────────────────────────────────────
-- 6. Enable Realtime (optional — for profile sync)
-- ─────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;

-- ─────────────────────────────────────────────────────────────
-- 7. Verify
-- ─────────────────────────────────────────────────────────────
SELECT
  up.full_name,
  up.email,
  up.onboarding_complete,
  up.goals,
  up.activity_level,
  up.daily_calorie_goal,
  up.created_at
FROM user_profiles up
ORDER BY up.created_at DESC
LIMIT 20;

-- ─────────────────────────────────────────────────────────────
-- 8. Migration (if user_profiles already exists without new cols)
-- ─────────────────────────────────────────────────────────────
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS goals TEXT[] DEFAULT '{}';
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS age INTEGER;
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS gender TEXT;
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1);
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,1);
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC(5,1);
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS activity_level TEXT;
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS diet_preference TEXT;
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS daily_calorie_goal INTEGER DEFAULT 2000;
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS daily_steps_goal INTEGER DEFAULT 8000;
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS water_goal_l NUMERIC(3,1) DEFAULT 2.0;
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT FALSE;

-- 🎉 Done! Auth + user_profiles ready.
--    Registration → OTP email → verify → onboarding form → dashboard.
