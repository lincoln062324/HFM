# Supabase Database Upload TODO
Track progress on uploading database schema.

## [ ] 1. Prerequisites
- [ ] Supabase project created (https://supabase.com/dashboard)
- [ ] Note project URL and anon key

## [ ] 2. Dashboard SQL Editor Method (Recommended)
- [ ] Go to SQL Editor: https://supabase.com/project/[your-ref]/sql
- [ ] Enable RLS: `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;` (repeat for daily_metrics, goals, habits, sticky_notes, weekly_reports)
- [ ] Run schema.sql
- [ ] Run rls.sql  
- [ ] Run functions.sql
- [ ] Run indexes.sql
- [ ] Run seeds.sql (optional test data)

## [ ] 3. Verify Upload
- [ ] Check Tables page: See profiles, daily_metrics, etc.
- [ ] Test query: `SELECT * FROM profiles LIMIT 1;`

## [ ] 4. App Integration
- [ ] `cd MobileApp && npx expo install @supabase/supabase-js`
- [ ] Create lib/supabase.ts with client
- [ ] Add EXPO_PUBLIC_SUPABASE_URL and ANON_KEY to app.json/expo env
- [ ] Test: `npx expo start`

## [ ] 5. CLI Alternative (if preferred)
- [ ] Install: `npm i -g supabase`
- [ ] `supabase init`
- [ ] Copy SQL to supabase/migrations/
- [ ] `supabase link --project-ref [ref]`
- [ ] `supabase db push`

**Status: Ready to execute! Update checkboxes as you complete.**

