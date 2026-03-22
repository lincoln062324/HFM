// Recipes Screen Component - Recipes, Meals & Foods (Supabase-powered like ExerciseScreen)
import { StyleSheet, Text, View, ScrollView, Pressable, Alert } from "react-native";
import React, { useState, useEffect } from "react";
import Icon from "react-native-vector-icons/FontAwesome6";
import Icon2 from "react-native-vector-icons/Ionicons";
import Icon3 from "react-native-vector-icons/FontAwesome5";
import supabase from '../lib/supabase';
import { ThemeColors, DEFAULT_THEME } from '../components/theme';


interface FoodItem {
  id: string;
  name: string;
  category: string;
  calories: number;
  benefits: string;
}

interface Recipe {
  id: string;
  name: string;
  category: string;
  calories: number;
  prepTime: string;
  ingredients: string[];
  instructions: string[];
  benefits: string;
}

interface MealSuggestion {
  id: string;
  name: string;
  category: string;
  calories: number;
  benefits: string;
  foods: string[];
}

// Recipe Categories
const RECIPE_CATEGORIES = [
  { id: 'all', name: 'All', icon: 'th' },
  { id: 'breakfast', name: 'Breakfast', icon: 'coffee' },
  { id: 'lunch', name: 'Lunch', icon: 'sun' },
  { id: 'dinner', name: 'Dinner', icon: 'moon' },
  { id: 'snacks', name: 'Snacks', icon: 'cookie' },
  { id: 'desserts', name: 'Desserts', icon: 'birthday-cake' },
];

const MEAL_CATEGORIES = [
  { id: 'all', name: 'All', icon: 'th' },
  { id: 'weight_loss', name: 'Weight Loss', icon: 'arrow-down' },
  { id: 'muscle_gain', name: 'Muscle Gain', icon: 'arrow-up' },
  { id: 'balanced', name: 'Balanced', icon: 'balance-scale' },
  { id: 'low_carb', name: 'Low Carb', icon: 'leaf' },
  { id: 'high_protein', name: 'High Protein', icon: 'fire' },
];

const FOOD_CATEGORIES = [
  { id: 'all', name: 'All', icon: 'th' },
  { id: 'fruits', name: 'Fruits', icon: 'apple-alt' },
  { id: 'vegetables', name: 'Vegetables', icon: 'carrot' },
  { id: 'grains', name: 'Grains', icon: 'bowl-rice' },
  { id: 'protein', name: 'Protein Foods', icon: 'drumstick-bite' },
  { id: 'dairy', name: 'Dairy', icon: 'cheese' },
];

const RecipesScreen = ({ onClose, onFoodAdded, themeColors = DEFAULT_THEME }: { onClose: () => void; onFoodAdded?: (calories: number) => void; themeColors?: ThemeColors }) => {
  const [activeTab, setActiveTab] = useState<'recipes' | 'meals' | 'foods'>('recipes');
  const [selectedCalories, setSelectedCalories] = useState(0);
  const [showIntakeBar, setShowIntakeBar] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedRecipeCategory, setSelectedRecipeCategory] = useState('all');
  const [selectedMealCategory, setSelectedMealCategory] = useState('all');
  const [selectedFoodCategory, setSelectedFoodCategory] = useState('all');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [meals, setMeals] = useState<MealSuggestion[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [expandedFood, setExpandedFood] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipeFavoritesIds, setRecipeFavoritesIds] = useState<Set<string>>(new Set());
  const [mealFavoritesIds, setMealFavoritesIds] = useState<Set<string>>(new Set());
  const [foodFavoritesIds, setFoodFavoritesIds] = useState<Set<string>>(new Set());
  const [pendingItems, setPendingItems] = useState<{name: string; calories: number; category: string; type: string}[]>([]);

  // Fetch recipes from Supabase
  useEffect(() => {
    async function fetchRecipes() {
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .order('name');

        if (error) throw error;

        const mappedRecipes: Recipe[] = data?.map((r: any) => ({
          id: r.id,
          name: r.name,
          category: r.category,
          calories: r.calories,
          prepTime: r.prep_time,
          ingredients: r.ingredients || [],
          instructions: r.instructions || [],
          benefits: r.benefits || '',
        })) || [];
        setRecipes(mappedRecipes);
      } catch (error) {
        console.error('Error fetching recipes:', error);
      }
    }
    fetchRecipes();
  }, []);

  // Fetch foods from Supabase
  useEffect(() => {
    async function fetchFoods() {
      try {
        const { data, error } = await supabase
          .from('foods')
          .select('*')
          .order('name');

        if (error) throw error;

        const mappedFoods: FoodItem[] = data?.map((f: any) => ({
          id: f.id,
          name: f.name,
          category: f.category,
          calories: f.calories,
          benefits: f.benefits || '',
        })) || [];
        setFoods(mappedFoods);
      } catch (error) {
        console.error('Error fetching foods:', error);
      }
    }
    fetchFoods();
  }, []);

  // Fetch meals from Supabase
  useEffect(() => {
    async function fetchMeals() {
      try {
        const { data, error } = await supabase
          .from('meals')
          .select('*')
          .order('name');

        if (error) throw error;

        const mappedMeals: MealSuggestion[] = data?.map((m: any) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          calories: m.calories,
          benefits: m.benefits || '',
          foods: m.foods || [],
        })) || [];
        setMeals(mappedMeals);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching meals:', error);
        setLoading(false);
      }
    }
    fetchMeals();
  }, []);

  // Fetch user favorites from three dedicated tables (guests + logged-in users)
  useEffect(() => {
    async function fetchUserFavorites() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id ?? null;

        const buildQuery = (table: string, idCol: string) => {
          let q = supabase.from(table).select(idCol);
          return userId ? q.eq('user_id', userId) : q.is('user_id', null);
        };

        const [recipesRes, mealsRes, foodsRes] = await Promise.all([
          buildQuery('user_favorites_recipes', 'recipe_id'),
          buildQuery('user_favorites_meals',   'meal_id'),
          buildQuery('user_favorites_foods',   'food_id'),
        ]);

        if (recipesRes.data) {
          setRecipeFavoritesIds(new Set(recipesRes.data.map((r: any) => r.recipe_id)));
        }
        if (mealsRes.data) {
          setMealFavoritesIds(new Set(mealsRes.data.map((m: any) => m.meal_id)));
        }
        if (foodsRes.data) {
          setFoodFavoritesIds(new Set(foodsRes.data.map((f: any) => f.food_id)));
        }

        console.log('Favorites loaded | user:', userId ?? 'guest');
      } catch (error) {
        console.error('Error fetching favorites:', error);
      }
    }

    fetchUserFavorites();
  }, []);

  const isRecipeFavorite = (id: string) => recipeFavoritesIds.has(id);
  const isMealFavorite = (id: string) => mealFavoritesIds.has(id);
  const isFoodFavorite = (id: string) => foodFavoritesIds.has(id);

  const toggleRecipeFavorite = async (recipeId: string) => {
    const isFav = isRecipeFavorite(recipeId);
    const recipe = recipes.find(r => r.id === recipeId);

    // Instant UI update
    if (isFav) {
      setRecipeFavoritesIds(prev => { const s = new Set(prev); s.delete(recipeId); return s; });
    } else {
      setRecipeFavoritesIds(prev => new Set(prev).add(recipeId));
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;

      if (isFav) {
        let q = supabase.from('user_favorites_recipes').delete().eq('recipe_id', recipeId);
        const { error } = await (userId ? q.eq('user_id', userId) : q.is('user_id', null));
        if (error) throw error;
        console.log('Supabase: removed recipe favorite', recipe?.name);
      } else {
        const { error } = await supabase.from('user_favorites_recipes').insert({
          user_id:         userId,
          recipe_id:       recipeId,
          recipe_name:     recipe?.name,
          recipe_category: recipe?.category,
        });
        if (error) throw error;
        console.log('Supabase: saved recipe', recipe?.name, recipe?.category, '| user:', userId ?? 'guest');
      }
    } catch (error) {
      console.error('Recipe favorite sync failed:', error);
    }
  };

  const toggleMealFavorite = async (mealId: string) => {
    const isFav = isMealFavorite(mealId);
    const meal = meals.find(m => m.id === mealId);

    // Instant UI update
    if (isFav) {
      setMealFavoritesIds(prev => { const s = new Set(prev); s.delete(mealId); return s; });
    } else {
      setMealFavoritesIds(prev => new Set(prev).add(mealId));
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;

      if (isFav) {
        let q = supabase.from('user_favorites_meals').delete().eq('meal_id', mealId);
        const { error } = await (userId ? q.eq('user_id', userId) : q.is('user_id', null));
        if (error) throw error;
        console.log('Supabase: removed meal favorite', meal?.name);
      } else {
        const { error } = await supabase.from('user_favorites_meals').insert({
          user_id:       userId,
          meal_id:       mealId,
          meal_name:     meal?.name,
          meal_category: meal?.category,
        });
        if (error) throw error;
        console.log('Supabase: saved meal', meal?.name, meal?.category, '| user:', userId ?? 'guest');
      }
    } catch (error) {
      console.error('Meal favorite sync failed:', error);
    }
  };

  const toggleFoodFavorite = async (foodId: string) => {
    const isFav = isFoodFavorite(foodId);
    const food = foods.find(f => f.id === foodId);

    // Instant UI update
    if (isFav) {
      setFoodFavoritesIds(prev => { const s = new Set(prev); s.delete(foodId); return s; });
    } else {
      setFoodFavoritesIds(prev => new Set(prev).add(foodId));
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;

      if (isFav) {
        let q = supabase.from('user_favorites_foods').delete().eq('food_id', foodId);
        const { error } = await (userId ? q.eq('user_id', userId) : q.is('user_id', null));
        if (error) throw error;
        console.log('Supabase: removed food favorite', food?.name);
      } else {
        const { error } = await supabase.from('user_favorites_foods').insert({
          user_id:       userId,
          food_id:       foodId,
          food_name:     food?.name,
          food_category: food?.category,
        });
        if (error) throw error;
        console.log('Supabase: saved food', food?.name, food?.category, '| user:', userId ?? 'guest');
      }
    } catch (error) {
      console.error('Food favorite sync failed:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer]}>
          <Text style={styles.loadingText}>Loading recipes...</Text>
        </View>
      </View>
    );
  }

  const getFilteredRecipes = () => {
    if (showFavorites) return recipes.filter(r => isRecipeFavorite(r.id));
    if (selectedRecipeCategory === 'all') return recipes;
    return recipes.filter(r => r.category === selectedRecipeCategory);
  };

  const getFilteredMeals = () => {
    if (showFavorites) return meals.filter(m => isMealFavorite(m.id));
    if (selectedMealCategory === 'all') return meals;
    return meals.filter(m => m.category === selectedMealCategory);
  };

  const getFilteredFoods = () => {
    if (showFavorites) return foods.filter(f => isFoodFavorite(f.id));
    if (selectedFoodCategory === 'all') return foods;
    return foods.filter(f => f.category === selectedFoodCategory);
  };

  const getTotalFavoritesCalories = () => {
    const recipeCals = recipes.filter(r => isRecipeFavorite(r.id)).reduce((sum, r) => sum + r.calories, 0);
    const mealCals = meals.filter(m => isMealFavorite(m.id)).reduce((sum, m) => sum + m.calories, 0);
    const foodCals = foods.filter(f => isFoodFavorite(f.id)).reduce((sum, f) => sum + f.calories, 0);
    return recipeCals + mealCals + foodCals;
  };

  const getFavoritesCount = () => {
    return recipes.filter(r => isRecipeFavorite(r.id)).length + 
           meals.filter(m => isMealFavorite(m.id)).length + 
           foods.filter(f => isFoodFavorite(f.id)).length;
  };

  const resetSelection = () => {
    setSelectedCalories(0);
    setShowIntakeBar(false);
  };

  const addCalories = (calories: number, itemName: string = 'Food item', category: string = '', type: string = 'food') => {
    setSelectedCalories(prev => prev + calories);
    setShowIntakeBar(true);
    setPendingItems(prev => [...prev, { name: itemName, calories, category, type }]);
    Alert.alert('Calorie has been added', `${itemName} (${calories} kcal)`);
  };

  const addToIntake = async () => {
    if (onFoodAdded && selectedCalories > 0) {
      onFoodAdded(selectedCalories);

      // Log each item to daily_activity_logs
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id ?? null;
        const today = new Date().toISOString().split('T')[0];

        const logEntries = pendingItems.map(item => ({
          user_id: userId,
          log_date: today,
          activity_type: 'food',
          item_name: item.name,
          item_category: item.category || item.type,
          calories: item.calories,
          logged_at: new Date().toISOString(),
        }));

        if (logEntries.length > 0) {
          await supabase.from('daily_activity_logs').insert(logEntries);
        }

        // Upsert today's calorie total in goal_logs
        const { data: existing } = await supabase
          .from('goal_logs')
          .select('calories_consumed')
          .eq('log_date', today)
          .eq('user_id', userId)
          .single();

        const prev = existing?.calories_consumed ?? 0;
        await supabase.from('goal_logs').upsert({
          user_id: userId,
          log_date: today,
          calories_consumed: prev + selectedCalories,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,log_date' });

      } catch (e: any) {
        console.warn('Food log error:', e?.message);
      }

      Alert.alert('Added to Food Calories', `${selectedCalories} kcal added to your daily food total!`);
      setPendingItems([]);
      resetSelection();
    }
  };

  const renderTabButton = (tab: 'recipes' | 'meals' | 'foods', label: string, icon: string) => (
    <Pressable 
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
      onPress={() => { 
        setActiveTab(tab); 
        setShowFavorites(false); 
        resetSelection(); 
      }}
    >
      <Icon style={[styles.tabIcon, activeTab === tab && styles.tabIconActive]} name={icon} />
      <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );

  const renderFavorites = () => (
    <View style={styles.favContainer}>
      <View style={styles.favHeader}>
        <Text style={styles.favTitle}>My Favorites</Text>
        <View style={styles.favStats}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{getFavoritesCount()}</Text>
            <Text style={styles.statLbl}>Items</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{getTotalFavoritesCalories()}</Text>
            <Text style={styles.statLbl}>Total kcal</Text>
          </View>
        </View>
      </View>
      <ScrollView style={styles.favList}>
        {recipes.filter(r => isRecipeFavorite(r.id)).length > 0 && (
          <View style={styles.favSection}>
            <Text style={styles.favSectionTitle}>Recipes</Text>
            {recipes.filter(r => isRecipeFavorite(r.id)).map(recipe => (
              <Pressable key={recipe.id} style={styles.favItem} onPress={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}>
                <View style={styles.favItemInfo}>
                  <Text style={styles.favItemName}>{recipe.name}</Text>
                  <Text style={styles.favItemMeta}>{recipe.calories} kcal</Text>
                </View>
                <View style={styles.favItemActions}>
                  <Pressable onPress={() => toggleRecipeFavorite(recipe.id)}>
                    <Icon2 style={styles.favIconActive} name="heart" />
                  </Pressable>
                  <Icon style={styles.expandIcon} name={expandedRecipe === recipe.id ? 'chevron-up' : 'chevron-down'} />
                </View>
                {expandedRecipe === recipe.id && (
                  <View style={styles.expanded}>
                    <Text style={styles.expTitle}>Ingredients:</Text>
                    {recipe.ingredients.map((ing, idx) => (
                      <Text key={idx} style={styles.bullet}>• {ing}</Text>
                    ))}
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
        {meals.filter(m => isMealFavorite(m.id)).length > 0 && (
          <View style={styles.favSection}>
            <Text style={styles.favSectionTitle}>Meal Suggestions</Text>
            {meals.filter(m => isMealFavorite(m.id)).map(meal => (
              <Pressable key={meal.id} style={styles.favItem} onPress={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}>
                <View style={styles.favItemInfo}>
                  <Text style={styles.favItemName}>{meal.name}</Text>
                  <Text style={styles.favItemMeta}>{meal.calories} kcal</Text>
                </View>
                <View style={styles.favItemActions}>
                  <Pressable onPress={() => toggleMealFavorite(meal.id)}>
                    <Icon style={styles.favIconActive} name="heart" />
                  </Pressable>
                  <Icon style={styles.expandIcon} name={expandedMeal === meal.id ? 'chevron-up' : 'chevron-down'} />
                </View>
                {expandedMeal === meal.id && (
                  <View style={styles.expanded}>
                    <Text style={styles.expTitle}>Benefits:</Text>
                    <Text style={styles.benefits}>{meal.benefits}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
        {foods.filter(f => isFoodFavorite(f.id)).length > 0 && (
          <View style={styles.favSection}>
            <Text style={styles.favSectionTitle}>Foods</Text>
            {foods.filter(f => isFoodFavorite(f.id)).map(food => (
              <Pressable key={food.id} style={styles.favItem} onPress={() => setExpandedFood(expandedFood === food.id ? null : food.id)}>
                <View style={styles.favItemInfo}>
                  <Text style={styles.favItemName}>{food.name}</Text>
                  <Text style={styles.favItemMeta}>{food.calories} kcal</Text>
                </View>
                <View style={styles.favItemActions}>
                  <Pressable onPress={() => toggleFoodFavorite(food.id)}>
                    <Icon style={styles.favIconActive} name="heart" />
                  </Pressable>
                  <Icon style={styles.expandIcon} name={expandedFood === food.id ? 'chevron-up' : 'chevron-down'} />
                </View>
                {expandedFood === food.id && (
                  <View style={styles.expanded}>
                    <Text style={styles.benefits}>{food.benefits}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
        {getFavoritesCount() === 0 && (
          <View style={styles.emptyState}>
            <Icon2 style={styles.emptyIcon} name="heart" />
            <Text style={styles.emptyText}>No favorites yet</Text>
            <Text style={styles.emptySubText}>Tap the heart icon on any item to save it here</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderRecipesTab = () => (
    <View style={styles.tabContent}>
      {!showFavorites && (
        <View style={styles.categories}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {RECIPE_CATEGORIES.map(cat => (
              <Pressable key={cat.id} style={[styles.catButton, selectedRecipeCategory === cat.id && styles.catButtonActive]} onPress={() => setSelectedRecipeCategory(cat.id)}>
                <Icon style={[styles.catIcon, selectedRecipeCategory === cat.id && styles.catIconActive]} name={cat.icon} />
                <Text style={[styles.catText, selectedRecipeCategory === cat.id && styles.catTextActive]}>{cat.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {!showFavorites && (
        <ScrollView style={styles.list}>
          <Text style={styles.listTitle}>{selectedRecipeCategory === 'all' ? 'All Recipes' : RECIPE_CATEGORIES.find(c => c.id === selectedRecipeCategory)?.name}</Text>
          {getFilteredRecipes().map(recipe => (
            <Pressable key={recipe.id} style={styles.item} onPress={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}>
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{recipe.name}</Text>
                  <Text style={styles.itemMeta}>{recipe.calories} kcal • {recipe.prepTime}</Text>
                </View>
                <View style={styles.itemActions}>
                  <Pressable onPress={() => toggleRecipeFavorite(recipe.id)}>
                    <Icon2 style={[styles.favIcon, isRecipeFavorite(recipe.id) && styles.favIconActive]} name={isRecipeFavorite(recipe.id) ? "heart" : "heart-outline"} />
                  </Pressable>
                  <Pressable style={styles.addCalButton} onPress={() => addCalories(recipe.calories, recipe.name, recipe.category, 'recipe')}>
                    <Icon name="plus" size={18} color="#4CAF50" />
                  </Pressable>
                  <Icon style={styles.expandIcon} name={expandedRecipe === recipe.id ? 'chevron-up' : 'chevron-down'} />
                </View>
              </View>
              {expandedRecipe === recipe.id && (
                <View style={styles.expanded}>
                  <Text style={styles.expTitle}>Benefits:</Text>
                  <Text style={styles.benefits}>{recipe.benefits}</Text>
                  <Text style={styles.expTitle}>Ingredients:</Text>
                  {recipe.ingredients.map((ing, idx) => (
                    <Text key={idx} style={styles.bullet}>• {ing}</Text>
                  ))}
                  <Text style={styles.expTitle}>Instructions:</Text>
                  {recipe.instructions.map((inst, idx) => (
                    <Text key={idx} style={styles.bullet}>{idx + 1}. {inst}</Text>
                  ))}
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderMealsTab = () => (
    <View style={styles.tabContent}>
      {!showFavorites && (
        <View style={styles.categories}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {MEAL_CATEGORIES.map(cat => (
              <Pressable key={cat.id} style={[styles.catButton, selectedMealCategory === cat.id && styles.catButtonActive]} onPress={() => setSelectedMealCategory(cat.id)}>
                <Icon style={[styles.catIcon, selectedMealCategory === cat.id && styles.catIconActive]} name={cat.icon} />
                <Text style={[styles.catText, selectedMealCategory === cat.id && styles.catTextActive]}>{cat.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {!showFavorites && (
        <ScrollView style={styles.list}>
          <Text style={styles.listTitle}>{selectedMealCategory === 'all' ? 'All Meal Suggestions' : MEAL_CATEGORIES.find(c => c.id === selectedMealCategory)?.name}</Text>
          {getFilteredMeals().map(meal => (
            <Pressable key={meal.id} style={styles.item} onPress={() => setExpandedMeal(expandedMeal === meal.id ? null : meal.id)}>
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{meal.name}</Text>
                  <Text style={styles.itemMeta}>{meal.calories} kcal</Text>
                </View>
                <View style={styles.itemActions}>
                  <Pressable onPress={() => toggleMealFavorite(meal.id)}>
                    <Icon2 style={[styles.favIcon, isMealFavorite(meal.id) && styles.favIconActive]} name={isMealFavorite(meal.id) ? "heart" : "heart-outline"} />
                  </Pressable>
                  <Pressable style={styles.addCalButton} onPress={() => addCalories(meal.calories, meal.name, meal.category, 'meal')}>
                    <Icon name="plus" size={18} color="#4CAF50" />
                  </Pressable>
                  <Icon style={styles.expandIcon} name={expandedMeal === meal.id ? 'chevron-up' : 'chevron-down'} />
                </View>
              </View>
              {expandedMeal === meal.id && (
                <View style={styles.expanded}>
                  <Text style={styles.expTitle}>Benefits:</Text>
                  <Text style={styles.benefits}>{meal.benefits}</Text>
                  <Text style={styles.expTitle}>Contains:</Text>
                  {meal.foods.map((food, idx) => (
                    <Text key={idx} style={styles.bullet}>• {food}</Text>
                  ))}
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderFoodsTab = () => (
    <View style={styles.tabContent}>
      {!showFavorites && (
        <View style={styles.categories}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {FOOD_CATEGORIES.map(cat => (
              <Pressable key={cat.id} style={[styles.catButton, selectedFoodCategory === cat.id && styles.catButtonActive]} onPress={() => setSelectedFoodCategory(cat.id)}>
                <Icon style={[styles.catIcon, selectedFoodCategory === cat.id && styles.catIconActive]} name={cat.icon} />
                <Text style={[styles.catText, selectedFoodCategory === cat.id && styles.catTextActive]}>{cat.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {!showFavorites && (
        <ScrollView style={styles.list}>
          <Text style={styles.listTitle}>{selectedFoodCategory === 'all' ? 'All Foods' : FOOD_CATEGORIES.find(c => c.id === selectedFoodCategory)?.name}</Text>
          {getFilteredFoods().map(food => (
            <Pressable key={food.id} style={styles.item} onPress={() => setExpandedFood(expandedFood === food.id ? null : food.id)}>
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{food.name}</Text>
                  <Text style={styles.itemMeta}>{food.calories} kcal</Text>
                </View>
                <View style={styles.itemActions}>
                  <Pressable onPress={() => toggleFoodFavorite(food.id)}>
                    <Icon2 style={[styles.favIcon, isFoodFavorite(food.id) && styles.favIconActive]} name={isFoodFavorite(food.id) ? "heart" : "heart-outline"} />
                  </Pressable>
                  <Pressable style={styles.addCalButton} onPress={() => addCalories(food.calories, food.name, food.category, 'food')}>
                    <Icon name="plus" size={18} color="#4CAF50" />
                  </Pressable>
                  <Icon style={styles.expandIcon} name={expandedFood === food.id ? 'chevron-up' : 'chevron-down'} />
                </View>
              </View>
              {expandedFood === food.id && (
                <View style={styles.expanded}>
                  <Text style={styles.benefits}>{food.benefits}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header1, { backgroundColor: themeColors.background }]} />
      <View style={[styles.header, { backgroundColor: themeColors.secondary, borderBottomColor: themeColors.primary + "44" }]}>
        <Text style={[styles.title, { color: themeColors.text }]}>Recipes, Meals & Foods</Text>
        <Pressable onPress={onClose}>
          <Icon style={[styles.closeIcon, { color: themeColors.text }]} name="times-circle" />
        </Pressable>
      </View>
      <View style={styles.tabNav}>
        {renderTabButton('recipes', 'Recipes', 'book')}
        {renderTabButton('meals', 'Meals', 'lightbulb')}
        {renderTabButton('foods', 'Foods', 'apple-alt')}
      </View>
      {showIntakeBar && (
        <View style={styles.intakeBar}>
          <Text style={styles.intakeText}>Selected: <Text style={styles.intakeCalories}>{selectedCalories} kcal</Text></Text>
          <Pressable style={styles.addButton} onPress={addToIntake}>
            <Text style={styles.addButtonText}>Add to Intake</Text>
          </Pressable>
          <Pressable style={styles.clearButton} onPress={resetSelection}>
            <Icon3 name="times" size={20} color="#CCCCCC" />
          </Pressable>
        </View>
      )}
      <View style={styles.favToggle}>
        <Pressable style={[styles.favButton, showFavorites && styles.favButtonActive]} onPress={() => {
          setShowFavorites(!showFavorites);
          if (!showFavorites) resetSelection();
        }}>
          <Icon2 style={[styles.favBtnIcon, showFavorites && styles.favBtnIconActive]} name="heart" />
          <Text style={[styles.favBtnText, showFavorites && styles.favBtnTextActive]}>
            My Favorites {getFavoritesCount() > 0 ? `(${getFavoritesCount()})` : ''}
          </Text>
        </Pressable>
      </View>
      {showFavorites ? renderFavorites() : (
        <>
          {activeTab === 'recipes' && renderRecipesTab()}
          {activeTab === 'meals' && renderMealsTab()}
          {activeTab === 'foods' && renderFoodsTab()}
        </>
      )}
    </View>
  );
};

export default RecipesScreen;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  // ... rest of existing styles unchanged
  addCalButton: {
    padding: 5,
  },
  intakeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1929',
    padding: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#362c3a',
  },
  intakeText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  intakeCalories: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  clearButton: {
    padding: 8,
  },
  container: { 
    position: "absolute", 
    top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: "#15041f", 
    zIndex: 400 
  },
  header1: { height: 35, backgroundColor: "#15041f" },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    backgroundColor: "#1e1929", 
    borderBottomWidth: 1, 
    borderBottomColor: "#362c3a" 
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#FFFFFF" },
  closeIcon: { fontSize: 30, color: "#FFFFFF" },
  tabNav: { flexDirection: "row", backgroundColor: "#1e1929", paddingHorizontal: 10, paddingVertical: 10, gap: 5 },
  tabButton: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#362c3a", 
    paddingVertical: 10, 
    paddingHorizontal: 10, 
    borderRadius: 10, 
    gap: 5 
  },
  tabButtonActive: { backgroundColor: "#c67ee2" },
  tabIcon: { fontSize: 16, color: "#CCCCCC" },
  tabIconActive: { color: "#FFFFFF" },
  tabText: { fontSize: 14, color: "#CCCCCC", fontWeight: "500" },
  tabTextActive: { color: "#FFFFFF", fontWeight: "bold" },
  favToggle: { padding: 15, backgroundColor: "#1e1929" },
  favButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#362c3a", 
    padding: 12, 
    borderRadius: 10, 
    gap: 10 
  },
  favButtonActive: { backgroundColor: "#c67ee2" },
  favBtnIcon: { fontSize: 20, color: "#CCCCCC" },
  favBtnIconActive: { color: "#FFFFFF" },
  favBtnText: { fontSize: 16, fontWeight: "bold", color: "#CCCCCC" },
  favBtnTextActive: { color: "#FFFFFF" },
  categories: { paddingHorizontal: 15, paddingVertical: 15 },
  catButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#362c3a", 
    paddingVertical: 10, 
    paddingHorizontal: 15, 
    borderRadius: 20, 
    marginRight: 10, 
    gap: 8 
  },
  catButtonActive: { backgroundColor: "#c67ee2" },
  catIcon: { fontSize: 16, color: "#CCCCCC" },
  catIconActive: { color: "#FFFFFF" },
  catText: { fontSize: 14, color: "#CCCCCC" },
  catTextActive: { color: "#FFFFFF", fontWeight: "bold" },
  tabContent: { flex: 1 },
  list: { flex: 1, padding: 15 },
  listTitle: { fontSize: 18, fontWeight: "bold", color: "#c67ee2", marginBottom: 15 },
  item: { backgroundColor: "#211c24", padding: 15, borderRadius: 10, marginBottom: 10 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "bold", color: "#FFFFFF" },
  itemMeta: { fontSize: 14, color: "#FF9800", marginTop: 4 },
  itemActions: { flexDirection: "row", alignItems: "center", gap: 15 },
  favIcon: { fontSize: 25, color: "#CCCCCC" },
  favIconActive: { color: "#FF6B6B", fontSize: 25 },
  expandIcon: { fontSize: 18, color: "#CCCCCC" },
  expanded: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#362c3a" },
  expTitle: { fontSize: 15, fontWeight: "bold", color: "#c67ee2", marginBottom: 8, marginTop: 8 },
  benefits: { fontSize: 14, color: "#CCCCCC", lineHeight: 20 },
  bullet: { fontSize: 14, color: "#DDDDDD", lineHeight: 22, paddingLeft: 5 },
  favContainer: { flex: 1 },
  favHeader: { padding: 15, backgroundColor: "#1e1929" },
  favTitle: { fontSize: 20, fontWeight: "bold", color: "#FFFFFF", marginBottom: 15 },
  favStats: { flexDirection: "row", gap: 15 },
  statBox: { backgroundColor: "#362c3a", paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, alignItems: "center", minWidth: 100 },
  statNum: { fontSize: 22, fontWeight: "bold", color: "#c67ee2" },
  statLbl: { fontSize: 12, color: "#CCCCCC" },
  favList: { flex: 1, padding: 15 },
  favSection: { marginBottom: 20 },
  favSectionTitle: { fontSize: 16, fontWeight: "bold", color: "#FFFFFF", marginBottom: 10, paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: "#c67ee2" },
  favItem: { backgroundColor: "#211c24", padding: 12, borderRadius: 8, marginBottom: 8 },
  favItemInfo: { flex: 1 },
  favItemName: { fontSize: 15, fontWeight: "bold", color: "#FFFFFF" },
  favItemMeta: { fontSize: 13, color: "#AAAAAA", marginTop: 2 },
  favItemActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  emptyState: { alignItems: "center", padding: 40 },
  emptyIcon: { fontSize: 48, color: "#666666", marginBottom: 15 },
  emptyText: { fontSize: 18, fontWeight: "bold", color: "#CCCCCC", marginBottom: 5 },
  emptySubText: { fontSize: 14, color: "#888888", textAlign: "center" },
});