-- User reminders table
CREATE TABLE IF NOT EXISTS user_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  alarm_time TEXT NOT NULL,
  date DATE NOT NULL,
  repeat TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_done BOOLEAN DEFAULT false,
  total_done INTEGER DEFAULT 0,
  total_undone INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE user_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reminders" ON user_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminders" ON user_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON user_reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reminders" ON user_reminders FOR DELETE USING (auth.uid() = user_id);

