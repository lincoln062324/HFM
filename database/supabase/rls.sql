-- Row Level Security (RLS) Policies
-- ENABLE RLS FIRST: ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Profiles (users can only access own profile)
CREATE POLICY "Users can view own profile" ON public.profiles
FOR ALL USING (auth.uid() = id);

-- Daily Metrics (own data only)
CREATE POLICY "Users view own daily metrics" ON public.daily_metrics
FOR ALL USING (auth.uid() = user_id);

-- Goals (own goals)
CREATE POLICY "Users manage own goals" ON public.goals
FOR ALL USING (auth.uid() = user_id);

-- Habits (own habits)
CREATE POLICY "Users manage own habits" ON public.habits
FOR ALL USING (auth.uid() = user_id);

-- Sticky Notes (own notes)
CREATE POLICY "Users manage own notes" ON public.sticky_notes
FOR ALL USING (auth.uid() = user_id);

-- Weekly Reports (own reports)
CREATE POLICY "Users view own reports" ON public.weekly_reports
FOR ALL USING (auth.uid() = user_id);

-- Public read-only tables (exercises, recipes, foods, meals)
CREATE POLICY "Public read exercises" ON public.exercises
FOR SELECT USING (true);

CREATE POLICY "Public read recipes" ON public.recipes
FOR SELECT USING (true);

CREATE POLICY "Public read foods" ON public.foods
FOR SELECT USING (true);

CREATE POLICY "Public read meals" ON public.meals
FOR SELECT USING (true);

-- Users table policy (Supabase auth)
CREATE POLICY "Public profiles" ON public.profiles 
FOR SELECT USING (true); -- Allow public profile reads (name, country)

-- Views inherit RLS from base tables

COMMENT ON POLICY "Users can view own profile" ON public.profiles IS 'Users access only own profile';

