-- ✅ DYNAMIC SEED - Uses YOUR current user_id (run logged in)

-- 1. Table + RLS (unchanged)
CREATE TABLE IF NOT EXISTS sticky_notes (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  content TEXT DEFAULT '',
  items JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sticky_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User notes access" ON sticky_notes;
CREATE POLICY "User notes access" ON sticky_notes FOR ALL USING (auth.uid() = user_id);

-- 2. **DYNAMIC SEED** - Inserts for YOUR auth.uid()
INSERT INTO sticky_notes (id, user_id, title, content, items) VALUES
  ('welcome-' || gen_random_uuid(), auth.uid(), '🚀 Welcome!', 'Supabase notes working!', '[]'),
  ('todo-' || gen_random_uuid(), auth.uid(), '📝 Todo List', '', 
   '[{"id":"1","text":"✅ Workout","checked":true},{"id":"2","text":"Drink water","checked":false}]'),
  ('goals-' || gen_random_uuid(), auth.uid(), '🎯 Goals', 'Daily targets', '[]')
ON CONFLICT (id) DO NOTHING;

-- 3. Verify YOUR notes
SELECT id, title, user_id = auth.uid() as "is_mine" FROM sticky_notes WHERE user_id = auth.uid() ORDER BY created_at DESC;

-- 🎉 Run → login to app → YOUR notes appear instantly!

