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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create foods table
CREATE TABLE IF NOT EXISTS foods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('fruits', 'vegetables', 'grains', 'protein', 'dairy')),
  calories INTEGER NOT NULL,
  benefits TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for foods
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read foods" ON foods FOR SELECT USING (true);

-- Create meals table
CREATE TABLE IF NOT EXISTS meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('weight_loss', 'muscle_gain', 'balanced', 'low_carb', 'high_protein')),
  calories INTEGER NOT NULL,
  benefits TEXT NOT NULL,
  foods TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for meals
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read meals" ON meals FOR SELECT USING (true);


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

