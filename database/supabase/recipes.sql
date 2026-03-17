-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snacks', 'desserts')),
  calories INTEGER NOT NULL,
  prep_time TEXT,
  ingredients TEXT[] NOT NULL,
  instructions TEXT[] NOT NULL,
  benefits TEXT NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (anon)
CREATE POLICY "Public can read recipes" ON recipes
  FOR SELECT USING (true);

-- Create user_favorites_recipes table for favorites
CREATE TABLE IF NOT EXISTS user_favorites_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, recipe_id)
);

-- Enable RLS on user_favorites_recipes
ALTER TABLE user_favorites_recipes ENABLE ROW LEVEL SECURITY;

-- Policies for user_favorites_recipes
CREATE POLICY "Users can view own recipe favorites" ON user_favorites_recipes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipe favorites" ON user_favorites_recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipe favorites" ON user_favorites_recipes
  FOR DELETE USING (auth.uid() = user_id);

