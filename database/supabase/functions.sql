-- Helper Functions & Triggers

-- Function: Get user consistency rate
CREATE OR REPLACE FUNCTION public.get_consistency_rate(user_id UUID, days_back INTEGER DEFAULT 7)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_done INT := 0;
    total_days INT := 0;
BEGIN
    SELECT 
        COALESCE(SUM(h.total_done), 0),
        COUNT(DISTINCT dh.date)
    INTO total_done, total_days
    FROM public.habits h
    JOIN LATERAL (
        SELECT date::date 
        FROM generate_series(NOW() - INTERVAL '1 day' * days_back, NOW(), '1 day') AS gs(date)
    ) dh ON true
    WHERE h.user_id = user_id AND h.is_active;
    
    IF total_days = 0 THEN RETURN 0; END IF;
    RETURN ROUND((total_done::DECIMAL / total_days) * 100, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create today's daily_metrics if not exists
CREATE OR REPLACE FUNCTION public.upsert_daily_metrics(user_id UUID)
RETURNS UUID AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    metric_id UUID;
BEGIN
    INSERT INTO public.daily_metrics (user_id, date)
    VALUES (user_id, today_date)
    ON CONFLICT (user_id, date) 
    DO UPDATE SET updated_at = NOW()
    RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-update goals progress from daily_metrics
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.goals g
    SET 
        current_value = COALESCE((
            SELECT AVG(dm.steps) 
            FROM public.daily_metrics dm 
            WHERE dm.user_id = g.user_id 
            AND dm.date >= g.start_date 
            AND dm.date <= CURRENT_DATE
            LIMIT 30
        ), 0),
        updated_at = NOW()
    WHERE g.type = 'steps'
    AND g.user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to daily_metrics
DROP TRIGGER IF EXISTS trigger_update_goal_progress ON public.daily_metrics;
CREATE TRIGGER trigger_update_goal_progress
    AFTER INSERT OR UPDATE ON public.daily_metrics
    FOR EACH ROW EXECUTE FUNCTION update_goal_progress();

-- Function: Generate weekly report (used by app or cron)
CREATE OR REPLACE FUNCTION public.generate_weekly_report(user_id UUID, week_start DATE)
RETURNS JSONB AS $$
DECLARE
    report JSONB;
BEGIN
    SELECT jsonb_build_object(
        'week_start', week_start,
        'consistency', (
            SELECT jsonb_agg(jsonb_build_object('day', to_char(d.date, 'Dy'), 'status', 
                CASE 
                    WHEN h.total_done > h.total_undone THEN 'onTrack'
                    WHEN h.total_done * 2 > h.total_undone THEN 'atRisk'
                    ELSE 'critical'
                END))
            FROM generate_series(week_start, week_start + INTERVAL '6 days', '1 day') d(date)
            LEFT JOIN public.habits h ON h.user_id = user_id AND h.is_active
        ),
        'total_steps', COALESCE(SUM(dm.steps), 0),
        'avg_daily_steps', COALESCE(AVG(dm.steps), 0),
        'total_food_calories', COALESCE(SUM(dm.calories_consumed), 0),
        'total_exercise_calories', COALESCE(SUM(dm.calories_burned), 0)
    ) INTO report
    FROM public.daily_metrics dm
    WHERE dm.user_id = user_id 
    AND dm.date >= week_start 
    AND dm.date < week_start + INTERVAL '7 days';
    
    -- Upsert report
    INSERT INTO public.weekly_reports (user_id, week_start, consistency)
    VALUES (user_id, week_start, report->'consistency')
    ON CONFLICT (user_id, week_start) DO NOTHING;
    
    RETURN report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_consistency_rate IS 'Calculate user consistency % over N days';

