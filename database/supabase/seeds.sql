-- Sample Data for Testing
-- Run AFTER schema.sql (OPTIONAL for development)

-- Insert test user profile
INSERT INTO public.profiles (id, name, email, country, current_weight, target_weight)
VALUES 
    ('00000000-0000-0000-0000-000000000000'::uuid, 'John Doe', 'john@example.com', 'United States', 165.0, 150.0)
ON CONFLICT (id) DO NOTHING;

-- Sample daily metrics (last 7 days)
INSERT INTO public.daily_metrics (user_id, date, calories_consumed, calories_burned, steps, distance_km, active_minutes)
SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid,
    (CURRENT_DATE - offs)::date,
    1800 + (random() * 400)::int,
    300 + (random() * 200)::int,
    7000 + (random() * 5000)::int,
    5.0 + (random() * 3)::numeric,
    30 + (random() * 30)::int
FROM generate_series(0, 6) AS t(offs)
ON CONFLICT (user_id, date) DO NOTHING;

-- Sample goals
INSERT INTO public.goals (user_id, type, target_value, current_value, start_date)
VALUES 
    ('00000000-0000-0000-0000-000000000000'::uuid, 'steps', 10000, 8500, CURRENT_DATE - INTERVAL '7 days'),
    ('00000000-0000-0000-0000-000000000000'::uuid, 'calories_exercise', 300, 280, CURRENT_DATE - INTERVAL '7 days')
ON CONFLICT DO NOTHING;

-- Sample habits
INSERT INTO public.habits (user_id, name, benefits, alarm_time, repeat_type, total_done, total_undone)
VALUES 
    ('00000000-0000-0000-0000-000000000000'::uuid, 'Drink more water', 'Hydrates body', '08:00'::time, 'daily', 5, 2),
    ('00000000-0000-0000-0000-000000000000'::uuid, 'Exercise 30min', 'Improves health', '18:00'::time, 'weekdays', 4, 3)
ON CONFLICT DO NOTHING;

-- Public catalog data (exercises, recipes, etc)
INSERT INTO public.exercises (name, category, benefits, difficulty)
VALUES 
    ('Running', 'cardio', 'Cardiovascular health', 'intermediate'),
    ('Push-ups', 'strength', 'Upper body strength', 'beginner')
ON CONFLICT DO NOTHING;

INSERT INTO public.recipes (name, category, calories, benefits)
VALUES 
    ('Oatmeal w/ Berries', 'breakfast', 350, 'High fiber breakfast'),
    ('Grilled Chicken Salad', 'lunch', 420, 'High protein lunch')
ON CONFLICT DO NOTHING;

-- Generate sample weekly report
SELECT public.generate_weekly_report('00000000-0000-0000-0000-000000000000'::uuid, CURRENT_DATE - INTERVAL '7 days');

-- Verify data
SELECT 'Setup complete! Rows in daily_metrics: ' || COUNT(*) as status 
FROM public.daily_metrics 
WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid;

