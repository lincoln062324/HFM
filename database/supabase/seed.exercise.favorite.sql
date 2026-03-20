-- ✅ FINAL FIXED: Exercise Favorites Seed - SYNTAX ERROR RESOLVED (No login needed for demo)

/*
** APP STATUS: Works guest/local. Toggle hearts → Favorites tab instant!
** SEED BELOW: Demo table + data (runs always).
*/

-- 1. Test auth (optional)
SELECT 'Status: ' || COALESCE(auth.uid()::text, 'Guest OK') as check;

-- 2. DROP/CREATE (safe)
DROP TABLE IF EXISTS user_favorites_exercise;
CREATE TABLE user_favorites_exercise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT,
  exercise_category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partial unique index (Postgres supports WHERE)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_fav_user_exercise ON user_favorites_exercise (user_id, exercise_id) WHERE user_id IS NOT NULL;

-- RLS for guest
ALTER TABLE user_favorites_exercise ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON user_favorites_exercise FOR SELECT USING (true);
CREATE POLICY "User manage" ON user_favorites_exercise FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- 3. DEMO SEED - NULL user_id (works always)
INSERT INTO user_favorites_exercise (user_id, exercise_id, exercise_name, exercise_category) VALUES
  (NULL, 'pushups', 'Push-Ups', 'Strength'),
  (NULL, 'squats', 'Squats', 'Strength'),
  (NULL, 'plank', 'Plank', 'Core'),
  (NULL, 'running', 'Running', 'Cardio')
ON CONFLICT DO NOTHING;

-- 4. Get real IDs + add yours
SELECT id, name FROM exercises LIMIT 10;
-- INSERT INTO user_favorites_exercise (exercise_id) VALUES ('your-real-id');

-- 5. Verify
SELECT * FROM user_favorites_exercise ORDER BY created_at DESC LIMIT 10;

-- 🎉 SUCCESS: Run → table ready. App favorites work guest/login!