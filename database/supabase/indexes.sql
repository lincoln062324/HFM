-- Performance Indexes
-- Run after schema.sql for optimal query performance

-- Daily metrics (most queried time-series)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_metrics_user_date ON public.daily_metrics (user_id, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_metrics_date ON public.daily_metrics (date DESC);

-- Goals (user-specific)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_user_type ON public.goals (user_id, type);

-- Habits (tracking queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habits_user_active ON public.habits (user_id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habits_user_created ON public.habits (user_id, created_at DESC);

-- Sticky notes (dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sticky_notes_user_updated ON public.sticky_notes (user_id, updated_at DESC);

-- Weekly reports
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_weekly_reports_user_week ON public.weekly_reports (user_id, week_start DESC);

-- Auth integration
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_id ON public.profiles (id);

-- Composite for reports/views
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_summary_user_date ON public.daily_summary (user_id, date DESC);

-- Full-text search indexes (future)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exercises_search ON public.exercises USING GIN (to_tsvector('english', name || ' ' || benefits));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipes_search ON public.recipes USING GIN (to_tsvector('english', name || ' ' || benefits));

-- JSONB indexes for flexible data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sticky_notes_items ON public.sticky_notes USING GIN (items);

COMMENT ON INDEX idx_daily_metrics_user_date IS 'Primary index for user daily data queries';
COMMENT ON INDEX idx_habits_user_active IS 'Fast active habits lookup';

