-- FIXED: Helper Functions & Triggers (No view dependencies)
-- Run AFTER schema.sql + rls.sql

-- Function: Get user consistency rate (uses habits tracking)
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
    CROSS JOIN LATERAL (
        SELECT date::date 
        FROM generate_series(NOW() - INTERVAL '1 day' * days_back, NOW(), '1 day') AS gs(date)
    ) dh
    WHERE h.user_id = user_id AND h.is_active;
    
    IF total_days = 0 THEN RETURN 0; END IF;
    RETURN ROUND((total_done::DECIMAL / total_days) * 100, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Upsert today's daily_metrics
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
    RETENDING id INTO metric_id;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Generate weekly report (dashboard/weekly screen)
CREATE OR REPLACE FUNCTION public.generate_weekly_report(user_id UUID, week_start DATE)
RETURNS JSONB AS $$
DECLARE
    report JSONB;
BEGIN
    SELECT jsonb_build_object(
        'week_start', week_start,
        'consistency', jsonb_agg(jsonb_build_object('day', to_char(d.date, 'Dy'), 'status', 
            CASE 
                WHEN COALESCE(h.total_done, 0) > COALESCE(h.total_undone, 0) THEN 'onTrack'
                WHEN COALESCE(h.total_done, 0) * 2 > COALESCE(h.total_undone, 0) THEN 'atRisk'
                ELSE 'critical'
            END)),
        'total_steps', COALESCE(SUM(dm.steps), 0),
        'avg_daily_steps', COALESCE(AVG(dm.steps), 0),
        'total_food_calories', COALESCE(SUM(dm.calories_consumed), 0),
        'total_exercise_calories', COALESCE(SUM(dm.calories_burned), 0)
    ) INTO report
    FROM generate_series(week_start, week_start + INTERVAL '6 days', '1 day') d(date)
    LEFT JOIN public.habits h ON h.user_id = user_id AND h.is_active
    LEFT JOIN public.daily_metrics dm ON dm.user_id = user_id AND dm.date = d.date::date;
    
    RETURN report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update goals progress from daily_metrics (steps)
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.goals SET 
        current_value = COALESCE((
            SELECT AVG(steps) FROM public.daily_metrics 
            WHERE user_id = NEW.user_id AND date >= start_date 
            AND date <= CURRENT_DATE AND type = 'steps'
            LIMIT 30
        ), 0),
        updated_at = NOW()
    WHERE user_id = NEW.user_id AND type = 'steps';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_goal_progress ON public.daily_metrics;
CREATE TRIGGER trigger_update_goal_progress
AFTER INSERT OR UPDATE ON public.daily_metrics
FOR EACH ROW EXECUTE FUNCTION update_goal_progress();

COMMENT ON FUNCTION public.get_consistency_rate IS 'User consistency % over N days';

