-- ============================================================
-- FAVORITES TABLES: Recipes, Meals, Foods
-- Works for guests (user_id = NULL) and logged-in users
-- Run this AFTER recipes.sql (tables must exist first)
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. USER FAVORITES: RECIPES
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS user_favorites_recipes;
CREATE TABLE user_favorites_recipes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id    UUID        REFERENCES recipes(id) ON DELETE CASCADE,
  recipe_name  TEXT,
  recipe_category TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Unique per logged-in user (guests share NULL bucket)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_fav_recipe_user
  ON user_favorites_recipes (user_id, recipe_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE user_favorites_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read recipes fav"  ON user_favorites_recipes FOR SELECT USING (true);
CREATE POLICY "User manage recipes fav"  ON user_favorites_recipes FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ─────────────────────────────────────────────
-- 2. USER FAVORITES: MEALS
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS user_favorites_meals;
CREATE TABLE user_favorites_meals (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_id        UUID        REFERENCES meals(id) ON DELETE CASCADE,
  meal_name      TEXT,
  meal_category  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_fav_meal_user
  ON user_favorites_meals (user_id, meal_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE user_favorites_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read meals fav"  ON user_favorites_meals FOR SELECT USING (true);
CREATE POLICY "User manage meals fav"  ON user_favorites_meals FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ─────────────────────────────────────────────
-- 3. USER FAVORITES: FOODS
-- ─────────────────────────────────────────────
DROP TABLE IF EXISTS user_favorites_foods;
CREATE TABLE user_favorites_foods (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id        UUID        REFERENCES foods(id) ON DELETE CASCADE,
  food_name      TEXT,
  food_category  TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_fav_food_user
  ON user_favorites_foods (user_id, food_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE user_favorites_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read foods fav"  ON user_favorites_foods FOR SELECT USING (true);
CREATE POLICY "User manage foods fav"  ON user_favorites_foods FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ─────────────────────────────────────────────
-- 4. DEMO SEED (guest rows — always works)
-- Replace UUIDs below with real IDs from your tables
-- or just leave empty and let the app populate them.
-- ─────────────────────────────────────────────

-- Preview real recipe/meal/food IDs to use above:
SELECT 'recipes'  AS tbl, id, name FROM recipes  LIMIT 5;
SELECT 'meals'    AS tbl, id, name FROM meals     LIMIT 5;
SELECT 'foods'    AS tbl, id, name FROM foods     LIMIT 5;

-- ─────────────────────────────────────────────
-- 5. VERIFY
-- ─────────────────────────────────────────────
SELECT 'user_favorites_recipes' AS tbl, COUNT(*) FROM user_favorites_recipes
UNION ALL
SELECT 'user_favorites_meals',          COUNT(*) FROM user_favorites_meals
UNION ALL
SELECT 'user_favorites_foods',          COUNT(*) FROM user_favorites_foods;

-- Migration note: if tables already exist in production, run instead:
-- ALTER TABLE user_favorites_recipes ADD COLUMN IF NOT EXISTS recipe_name TEXT;
-- ALTER TABLE user_favorites_recipes ADD COLUMN IF NOT EXISTS recipe_category TEXT;
-- ALTER TABLE user_favorites_meals   ADD COLUMN IF NOT EXISTS meal_name TEXT;
-- ALTER TABLE user_favorites_meals   ADD COLUMN IF NOT EXISTS meal_category TEXT;
-- ALTER TABLE user_favorites_foods   ADD COLUMN IF NOT EXISTS food_name TEXT;
-- ALTER TABLE user_favorites_foods   ADD COLUMN IF NOT EXISTS food_category TEXT;

-- 🎉 Done! Three clean favorites tables ready.
