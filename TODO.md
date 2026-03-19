# TODO - Project Tasks

## Notes Refresh Fix
- [ ] Run SQL: ALTER TABLE sticky_notes ALTER COLUMN id TYPE TEXT;
- [ ] Fix dashboard.tsx handleSaveNote() refresh logic
- [ ] Test: Create note → verify savedNotesSection updates instantly
- [ ] Test Supabase sync (login/logout)

## ✅ Exercise Favorites COMPLETE
- [x] Created `seed.exercise.favorite.sql` - Dynamic table + seed for user_id
- [x] Table `user_favorites` (polymorphic: exercise_id + recipe/food/meal)
- [x] RLS policy ready
- [ ] **YOUR ACTION:** Run seed.exercise.favorite.sql in Supabase (logged in)
- [ ] Test: Login → ExerciseScreen → tap hearts → verify Favorites tab
- [x] ExerciseScreen.tsx already has full favorites UI (tabs, optimistic toggle, empty state)
