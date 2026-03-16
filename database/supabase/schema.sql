-- MobileApp Supabase Schema v1.0
-- Full database structure for all screens/components
-- Run this FIRST in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===============================================
-- CORE TABLES
-- ===============================================

-- 1. Users Profile (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    country TEXT,
    current_weight DECIMAL(5,2),
    target_weight DECIMAL(5,2),
    profile_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Daily Metrics (dashboard, goals, steps)
CREATE TABLE IF NOT EXISTS public.daily_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    calories_consumed INTEGER DEFAULT 0,
    calories_burned INTEGER DEFAULT 0,
    steps INTEGER DEFAULT 0,
    distance_km DECIMAL(4,2) DEFAULT 0,
    active_minutes INTEGER DEFAULT 0,
    water_intake_ml INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- 3. Goals (goals screen)
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('weight', 'calories_food', 'calories_exercise', 'steps', 'consistency')),
    target_value DECIMAL(10,2),
    current_value DECIMAL(10,2) DEFAULT 0,
    start_date DATE,
    achieved_days INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'paused')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Habits/Reminders (reminders screen, dashboard)
CREATE TABLE IF NOT EXISTS public.habits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    benefits TEXT,
    alarm_time TIME,
    repeat_type TEXT CHECK (repeat_type IN ('daily', 'weekdays', 'weekends', 'custom')),
    is_active BOOLEAN DEFAULT true,
    total_done INTEGER DEFAULT 0,
    total_undone INTEGER DEFAULT 0,
    last_completed TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Exercises Catalog (exercise screen)
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('cardio', 'strength', 'flexibility', 'balance')),
    benefits TEXT,
    steps TEXT[],
    instructions TEXT,
    reps TEXT,
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    is_favorite BOOLEAN DEFAULT false, -- user-specific would need user_id
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Recipes (recipes screen)
CREATE TABLE IF NOT EXISTS public.recipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snacks', 'desserts')),
    calories INTEGER,
    prep_time TEXT,
    ingredients TEXT[],
    instructions TEXT[],
    benefits TEXT,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Foods (nutrition database)
CREATE TABLE IF NOT EXISTS public.foods (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('fruits', 'vegetables', 'grains', 'protein', 'dairy')),
    calories INTEGER,
    benefits TEXT,
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Meal Suggestions
CREATE TABLE IF NOT EXISTS public.meals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('weight_loss', 'muscle_gain', 'balanced', 'low_carb', 'high_protein')),
    calories INTEGER,
    benefits TEXT,
    foods TEXT[], -- food names or ids
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Sticky Notes (dashboard)
CREATE TABLE IF NOT EXISTS public.sticky_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT,
    items JSONB[], -- list items
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Weekly Reports (weekly report screen)
CREATE TABLE IF NOT EXISTS public.weekly_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    consistency JSONB, -- [{day: 'Mon', status: 'onTrack'}]
    total_food_calories INTEGER,
    total_exercise_calories INTEGER,
    total_steps INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, week_start)
);

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        CREATE TRIGGER profiles_update_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    -- Add for other tables as needed
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_date ON public.daily_metrics(user_id, date);
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_user ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_sticky_notes_user ON public.sticky_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_user_week ON public.weekly_reports(user_id, week_start);

-- Views for quick queries
-- Daily summary view
CREATE OR REPLACE VIEW public.daily_summary AS
SELECT 
    dm.user_id,
    dm.date,
    dm.calories_consumed,
    dm.calories_burned,
    dm.steps,
    COALESCE(g.target_value, 0) as daily_goal,
    (dm.steps::float / NULLIF(g.target_value, 0)) * 100 as step_progress_pct
FROM public.daily_metrics dm
LEFT JOIN public.goals g ON dm.user_id = g.user_id AND g.type = 'steps';

-- Weekly consistency view
CREATE OR REPLACE VIEW public.weekly_consistency AS
SELECT 
    user_id,
    DATE_TRUNC('week', date) as week_start,
    COUNT(*) FILTER (WHERE total_done > total_undone) as good_days,
    COUNT(*) as total_days,
    ROUND((COUNT(*) FILTER (WHERE total_done > total_undone)::float / COUNT(*)) * 100, 2) as consistency_pct
FROM public.habits 
WHERE is_active = true
GROUP BY user_id, week_start
ORDER BY week_start DESC;

COMMENT ON TABLE public.profiles IS 'User profile extensions for fitness app';
COMMENT ON TABLE public.daily_metrics IS 'Daily tracking: calories, steps, etc';
COMMENT ON TABLE public.goals IS 'User goals and progress tracking';
COMMENT ON TABLE public.habits IS 'Habit reminders with completion tracking';
COMMENT ON TABLE public.exercises IS 'Exercise catalog for app';
COMMENT ON TABLE public.recipes IS 'Recipe database with nutrition info';

