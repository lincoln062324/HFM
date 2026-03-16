// Recipes Screen Component - Recipes, Meals & Foods
import { StyleSheet, Text, View, ScrollView, Pressable, Alert } from "react-native";
import React, { useState } from "react";
import Icon from "react-native-vector-icons/FontAwesome6";
import Icon2 from "react-native-vector-icons/Ionicons";
import Icon3 from "react-native-vector-icons/FontAwesome5";

// Types
interface FoodItem {
  id: number;
  name: string;
  category: string;
  calories: number;
  benefits: string;
  image?: any;
  isFavorite: boolean;
}

interface Recipe {
  id: number;
  name: string;
  category: string;
  calories: number;
  prepTime: string;
  ingredients: string[];
  instructions: string[];
  benefits: string;
  isFavorite: boolean;
}

interface MealSuggestion {
  id: number;
  name: string;
  category: string;
  calories: number;
  benefits: string;
  foods: string[];
  isFavorite: boolean;
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

// Meal Categories
const MEAL_CATEGORIES = [
  { id: 'all', name: 'All', icon: 'th' },
  { id: 'weight_loss', name: 'Weight Loss', icon: 'arrow-down' },
  { id: 'muscle_gain', name: 'Muscle Gain', icon: 'arrow-up' },
  { id: 'balanced', name: 'Balanced', icon: 'balance-scale' },
  { id: 'low_carb', name: 'Low Carb', icon: 'leaf' },
  { id: 'high_protein', name: 'High Protein', icon: 'fire' },
];

// Food Categories
const FOOD_CATEGORIES = [
  { id: 'all', name: 'All', icon: 'th' },
  { id: 'fruits', name: 'Fruits', icon: 'apple-alt' },
  { id: 'vegetables', name: 'Vegetables', icon: 'carrot' },
  { id: 'grains', name: 'Grains', icon: 'bowl-rice' },
  { id: 'protein', name: 'Protein Foods', icon: 'drumstick-bite' },
  { id: 'dairy', name: 'Dairy', icon: 'cheese' },
];

// Recipe Database with Ingredients
const RECIPE_DATABASE: Recipe[] = [
  { id: 1, name: 'Oatmeal with Berries', category: 'breakfast', calories: 350, prepTime: '10 min', 
    ingredients: ['1 cup rolled oats', '1 cup almond milk', '1/2 cup mixed berries', '1 tbsp honey', '1/4 cup almonds'],
    instructions: ['Cook oats with almond milk', 'Top with berries and almonds', 'Drizzle with honey'],
    benefits: 'High in fiber, supports heart health, provides sustained energy throughout the morning.',
    isFavorite: false },
  { id: 2, name: 'Egg White Scramble', category: 'breakfast', calories: 200, prepTime: '15 min',
    ingredients: ['4 egg whites', '1/4 cup spinach', '1/4 cup mushrooms', '1/4 cup tomatoes', 'Salt and pepper'],
    instructions: ['Whisk egg whites', 'Sauté vegetables', 'Combine and scramble', 'Season to taste'],
    benefits: 'Low in calories, high in protein, supports muscle maintenance.',
    isFavorite: false },
  { id: 3, name: 'Greek Yogurt Parfait', category: 'breakfast', calories: 280, prepTime: '5 min',
    ingredients: ['1 cup Greek yogurt', '1/2 cup granola', '1/2 cup fresh fruits', '1 tbsp honey'],
    instructions: ['Layer yogurt in a glass', 'Add granola layer', 'Top with fruits', 'Drizzle honey'],
    benefits: 'Rich in probiotics, calcium, and protein for gut health.',
    isFavorite: false },
  { id: 4, name: 'Avocado Toast', category: 'breakfast', calories: 320, prepTime: '10 min',
    ingredients: ['2 slices whole wheat bread', '1 avocado', '2 eggs', 'Salt, pepper, red pepper flakes'],
    instructions: ['Toast bread', 'Mash avocado with salt', 'Spread on toast', 'Top with poached eggs'],
    benefits: 'Healthy fats, fiber, and protein for a balanced breakfast.',
    isFavorite: false },
  { id: 5, name: 'Grilled Chicken Salad', category: 'lunch', calories: 420, prepTime: '25 min',
    ingredients: ['6 oz chicken breast', '2 cups mixed greens', '1/2 cucumber', '1/2 tomatoes', '2 tbsp olive oil dressing'],
    instructions: ['Grill chicken breast', 'Prepare vegetables', 'Combine in bowl', 'Drizzle with dressing'],
    benefits: 'High protein, low carbs, supports muscle building and satiety.',
    isFavorite: false },
  { id: 6, name: 'Quinoa Buddha Bowl', category: 'lunch', calories: 480, prepTime: '30 min',
    ingredients: ['1 cup quinoa', '1/2 cup chickpeas', '1/2 avocado', '1/2 cup roasted vegetables', 'Tahini dressing'],
    instructions: ['Cook quinoa', 'Roast vegetables', 'Assemble bowl', 'Add tahini dressing'],
    benefits: 'Complete protein, fiber-rich, supports digestive health.',
    isFavorite: false },
  { id: 7, name: 'Turkey Wrap', category: 'lunch', calories: 350, prepTime: '15 min',
    ingredients: ['4 oz turkey breast', '1 whole wheat wrap', '1 slice cheese', 'Lettuce', 'Tomato', 'Mustard'],
    instructions: ['Lay out wrap', 'Add turkey and cheese', 'Add vegetables', 'Roll tightly'],
    benefits: 'Lean protein, complex carbs, satisfying and nutritious.',
    isFavorite: false },
  { id: 8, name: 'Salmon Poke Bowl', category: 'lunch', calories: 520, prepTime: '20 min',
    ingredients: ['5 oz salmon', '1 cup rice', '1/2 avocado', 'Edamame', 'Cucumber', 'Soy sauce'],
    instructions: ['Cook rice', 'Cube salmon', 'Prepare vegetables', 'Assemble bowl', 'Drizzle soy sauce'],
    benefits: 'Omega-3 fatty acids, high protein, supports brain health.',
    isFavorite: false },
  { id: 9, name: 'Baked Salmon with Vegetables', category: 'dinner', calories: 450, prepTime: '35 min',
    ingredients: ['6 oz salmon fillet', '1 cup broccoli', '1 cup carrots', '2 tbsp olive oil', 'Lemon', 'Garlic'],
    instructions: ['Preheat oven', 'Season salmon', 'Arrange vegetables', 'Bake at 400°F for 25 min'],
    benefits: 'Heart-healthy omega-3s, anti-inflammatory, rich in vitamins.',
    isFavorite: false },
  { id: 10, name: 'Chicken Stir Fry', category: 'dinner', calories: 380, prepTime: '25 min',
    ingredients: ['6 oz chicken breast', '2 cups mixed vegetables', '2 tbsp soy sauce', '1 tbsp sesame oil', 'Ginger', 'Garlic'],
    instructions: ['Cut chicken into strips', 'Stir fry vegetables', 'Add chicken', 'Season with sauces'],
    benefits: 'High protein, low fat, quick and easy meal option.',
    isFavorite: false },
  { id: 11, name: 'Beef and Broccoli', category: 'dinner', calories: 520, prepTime: '30 min',
    ingredients: ['6 oz beef sirloin', '2 cups broccoli', '2 tbsp soy sauce', '1 tbsp oyster sauce', 'Garlic'],
    instructions: ['Slice beef thinly', 'Stir fry beef', 'Add broccoli', 'Add sauces and simmer'],
    benefits: 'High iron, protein-rich, supports blood health.',
    isFavorite: false },
  { id: 12, name: 'Vegetable Pasta', category: 'dinner', calories: 420, prepTime: '25 min',
    ingredients: ['2 oz whole wheat pasta', '2 cups vegetables', '2 tbsp olive oil', 'Parmesan cheese', 'Italian herbs'],
    instructions: ['Cook pasta', 'Sauté vegetables', 'Toss together', 'Top with cheese'],
    benefits: 'Complex carbs, fiber, and antioxidants.',
    isFavorite: false },
  { id: 13, name: 'Mixed Nuts', category: 'snacks', calories: 180, prepTime: '0 min',
    ingredients: ['1 oz almonds', '1 oz walnuts', '1 oz cashews'],
    instructions: ['Combine nuts in a small container', 'Portion into servings'],
    benefits: 'Healthy fats, protein, and minerals for energy.',
    isFavorite: false },
  { id: 14, name: 'Apple with Peanut Butter', category: 'snacks', calories: 200, prepTime: '2 min',
    ingredients: ['1 medium apple', '2 tbsp peanut butter'],
    instructions: ['Slice apple', 'Serve with peanut butter'],
    benefits: 'Fiber, protein, and natural sugars for quick energy.',
    isFavorite: false },
  { id: 15, name: 'Protein Smoothie', category: 'snacks', calories: 250, prepTime: '5 min',
    ingredients: ['1 scoop protein powder', '1 banana', '1 cup almond milk', 'Ice'],
    instructions: ['Add all ingredients to blender', 'Blend until smooth'],
    benefits: 'Quick protein, post-workout recovery, convenient nutrition.',
    isFavorite: false },
  { id: 16, name: 'Dark Chocolate', category: 'desserts', calories: 170, prepTime: '0 min',
    ingredients: ['1 oz dark chocolate (70%+)'],
    instructions: ['Enjoy in moderation'],
    benefits: 'Antioxidants, may improve heart health, satisfies cravings.',
    isFavorite: false },
  { id: 17, name: 'Frozen Banana Bites', category: 'desserts', calories: 120, prepTime: '10 min',
    ingredients: ['1 banana', '2 tbsp dark chocolate chips', '1 tbsp crushed nuts'],
    instructions: ['Slice banana', 'Dip in chocolate', 'Top with nuts', 'Freeze for 2 hours'],
    benefits: 'Natural sweetness, potassium, guilt-free treat.',
    isFavorite: false },
  { id: 18, name: 'Chia Pudding', category: 'desserts', calories: 200, prepTime: '5 min',
    ingredients: ['3 tbsp chia seeds', '1 cup coconut milk', '1 tbsp maple syrup', 'Fresh fruits'],
    instructions: ['Mix chia seeds with milk', 'Add maple syrup', 'Refrigerate overnight', 'Top with fruits'],
    benefits: 'Omega-3s, fiber, supports digestive health.',
    isFavorite: false },
];

// Meal Suggestions Database
const MEAL_DATABASE: MealSuggestion[] = [
  { id: 1, name: 'Green Smoothie Bowl', category: 'weight_loss', calories: 280, 
    benefits: 'Low calorie, high fiber, detoxifying. Supports weight loss with nutrient-dense ingredients that keep you full longer.',
    foods: ['Spinach', 'Cucumber', 'Green apple', 'Celery', 'Protein powder'],
    isFavorite: false },
  { id: 2, name: 'Cauliflower Rice Bowl', category: 'weight_loss', calories: 320,
    benefits: 'Low carb alternative to rice, high in vitamins C and K. Supports fat loss while providing essential nutrients.',
    foods: ['Cauliflower', 'Grilled chicken', 'Vegetables', 'Low-sodium soy sauce'],
    isFavorite: false },
  { id: 3, name: 'Zucchini Noodles', category: 'weight_loss', calories: 250,
    benefits: 'Very low calories, high water content, gluten-free. Satisfying without the carb overload.',
    foods: ['Zucchini', 'Turkey meatballs', 'Marinara sauce', 'Parmesan'],
    isFavorite: false },
  { id: 4, name: 'Grilled Fish Tacos', category: 'weight_loss', calories: 340,
    benefits: 'High protein, healthy fats, fresh toppings. Satisfying Mexican-inspired meal under 400 calories.',
    foods: ['White fish', 'Corn tortillas', 'Cabbage', 'Lime', 'Cilantro'],
    isFavorite: false },
  { id: 5, name: 'Mass Gainer Shake', category: 'muscle_gain', calories: 650,
    benefits: 'High protein and calorie content for muscle building. Contains fast and slow-digesting proteins.',
    foods: ['Protein powder', 'Banana', 'Oats', 'Peanut butter', 'Whole milk'],
    isFavorite: false },
  { id: 6, name: 'Beef Steak Dinner', category: 'muscle_gain', calories: 720,
    benefits: 'Complete protein with iron and zinc. Essential for muscle repair and growth after intense workouts.',
    foods: ['8 oz ribeye steak', 'Sweet potato', 'Asparagus', 'Butter'],
    isFavorite: false },
  { id: 7, name: 'Chicken Rice Bowl', category: 'muscle_gain', calories: 580,
    benefits: 'Classic muscle building meal with lean protein and complex carbs for energy and recovery.',
    foods: ['Chicken breast', 'Brown rice', 'Broccoli', 'Egg'],
    isFavorite: false },
  { id: 8, name: 'Egg White Omelet', category: 'muscle_gain', calories: 320,
    benefits: 'Pure protein without excess fats. Perfect for lean muscle building.',
    foods: ['Egg whites', 'Turkey bacon', 'Cheese', 'Spinach'],
    isFavorite: false },
  { id: 9, name: 'Mediterranean Plate', category: 'balanced', calories: 480,
    benefits: 'Balanced macros with healthy fats, lean protein, and complex carbs. Supports overall health.',
    foods: ['Grilled chicken', 'Quinoa', 'Hummus', 'Cucumber', 'Olives'],
    isFavorite: false },
  { id: 10, name: 'Asian Fusion Bowl', category: 'balanced', calories: 520,
    benefits: 'Well-rounded with protein, vegetables, and carbs. Good mix of nutrients for daily energy.',
    foods: ['Tofu', 'Brown rice', 'Edamame', 'Carrots', 'Ginger dressing'],
    isFavorite: false },
  { id: 11, name: 'American Classic', category: 'balanced', calories: 550,
    benefits: 'Complete meal with all food groups. Provides sustained energy and satisfaction.',
    foods: ['Grilled chicken', 'Whole wheat bread', 'Vegetables', 'Fruit'],
    isFavorite: false },
  { id: 12, name: 'Continental Breakfast', category: 'balanced', calories: 420,
    benefits: 'Morning balance of protein, carbs, and fruits. Great start to the day.',
    foods: ['Eggs', 'Whole grain toast', 'Yogurt', 'Fresh fruits', 'Juice'],
    isFavorite: false },
  { id: 13, name: 'Keto Steak Bowl', category: 'low_carb', calories: 580,
    benefits: 'Very low carbs, high fat and protein. Puts body in fat-burning state.',
    foods: ['Ribeye steak', 'Bacon', 'Avocado', 'Eggs', 'Cheese'],
    isFavorite: false },
  { id: 14, name: 'Tuna Salad Bowl', category: 'low_carb', calories: 320,
    benefits: 'Very low carb, high protein. Perfect for low-carb dieters.',
    foods: ['Canned tuna', 'Mayo', 'Celery', 'Lettuce', 'Avocado'],
    isFavorite: false },
  { id: 15, name: 'Chicken Caesar Salad', category: 'low_carb', calories: 450,
    benefits: 'Low carb with protein. Classic restaurant favorite made healthier.',
    foods: ['Grilled chicken', 'Romaine lettuce', 'Parmesan', 'Caesar dressing'],
    isFavorite: false },
  { id: 16, name: 'Protein Pack', category: 'high_protein', calories: 480,
    benefits: 'Extremely high protein content. Perfect for post-workout recovery.',
    foods: ['Chicken breast', 'Greek yogurt', 'Cottage cheese', 'Egg whites'],
    isFavorite: false },
  { id: 17, name: 'Seafood Platter', category: 'high_protein', calories: 420,
    benefits: 'High protein from fish and shellfish. Low in fat, high in omega-3s.',
    foods: ['Shrimp', 'Salmon', 'Crab', 'Lime', 'Cocktail sauce'],
    isFavorite: false },
  { id: 18, name: 'Cottage Cheese Plate', category: 'high_protein', calories: 280,
    benefits: 'Quick high protein snack or meal. Contains casein protein for sustained release.',
    foods: ['Cottage cheese', 'Almonds', 'Berries', 'Honey'],
    isFavorite: false },
];

// Food Database
const FOOD_DATABASE: FoodItem[] = [
  { id: 1, name: 'Apple', category: 'fruits', calories: 95, benefits: 'Good source of fiber, vitamin C, and antioxidants. Helps improve digestion and heart health.', image: null, isFavorite: false },
  { id: 2, name: 'Banana', category: 'fruits', calories: 105, benefits: 'Rich in potassium, vitamin B6, and fiber. Provides quick energy and supports muscle function.', image: null, isFavorite: false },
  { id: 3, name: 'Orange', category: 'fruits', calories: 62, benefits: 'Excellent source of vitamin C, fiber, and folate. Boosts immune system.', image: null, isFavorite: false },
  { id: 4, name: 'Strawberries', category: 'fruits', calories: 49, benefits: 'Low in calories, high in antioxidants, vitamin C, and manganese.', image: null, isFavorite: false },
  { id: 5, name: 'Blueberries', category: 'fruits', calories: 84, benefits: 'Packed with antioxidants, vitamins C and K. Supports brain health.', image: null, isFavorite: false },
  { id: 6, name: 'Broccoli', category: 'vegetables', calories: 55, benefits: 'Rich in fiber, vitamin C, and cancer-fighting compounds. Supports bone health.', image: null, isFavorite: false },
  { id: 7, name: 'Spinach', category: 'vegetables', calories: 23, benefits: 'High in iron, vitamins A, C, and K. Great for eye health and blood pressure.', image: null, isFavorite: false },
  { id: 8, name: 'Carrots', category: 'vegetables', calories: 25, benefits: 'Excellent source of beta-carotene, fiber, and vitamin A. Promotes eye health.', image: null, isFavorite: false },
  { id: 9, name: 'Bell Pepper', category: 'vegetables', calories: 31, benefits: 'High in vitamin C, antioxidants, and capsaicin. Boosts metabolism.', image: null, isFavorite: false },
  { id: 10, name: 'Tomato', category: 'vegetables', calories: 22, benefits: 'Contains lycopene, vitamin C, and potassium. Supports heart health.', image: null, isFavorite: false },
  { id: 11, name: 'Brown Rice', category: 'grains', calories: 216, benefits: 'Whole grain high in fiber, manganese, and selenium. Supports digestion.', image: null, isFavorite: false },
  { id: 12, name: 'Oatmeal', category: 'grains', calories: 158, benefits: 'High in fiber, beta-glucan, and antioxidants. Lowers cholesterol levels.', image: null, isFavorite: false },
  { id: 13, name: 'Quinoa', category: 'grains', calories: 222, benefits: 'Complete protein with all essential amino acids. Gluten-free and high in fiber.', image: null, isFavorite: false },
  { id: 14, name: 'Whole Wheat Bread', category: 'grains', calories: 81, benefits: 'Good source of fiber, B vitamins, and iron. Sustains energy levels.', image: null, isFavorite: false },
  { id: 15, name: 'Sweet Potato', category: 'grains', calories: 103, benefits: 'Rich in beta-carotene, fiber, and vitamin C. Stabilizes blood sugar.', image: null, isFavorite: false },
  { id: 16, name: 'Chicken Breast', category: 'protein', calories: 165, benefits: 'Lean protein source, low in fat. Supports muscle growth and repair.', image: null, isFavorite: false },
  { id: 17, name: 'Salmon', category: 'protein', calories: 208, benefits: 'Rich in omega-3 fatty acids, protein, and vitamin D. Supports heart and brain health.', image: null, isFavorite: false },
  { id: 18, name: 'Eggs', category: 'protein', calories: 155, benefits: 'Complete protein with all essential amino acids. Rich in choline and vitamin D.', image: null, isFavorite: false },
  { id: 19, name: 'Greek Yogurt', category: 'protein', calories: 100, benefits: 'High protein, contains probiotics for gut health. Rich in calcium.', image: null, isFavorite: false },
  { id: 20, name: 'Lentils', category: 'protein', calories: 230, benefits: 'Plant-based protein high in fiber, iron, and folate. Supports heart health.', image: null, isFavorite: false },
  { id: 21, name: 'Milk', category: 'dairy', calories: 149, benefits: 'Good source of calcium, protein, and vitamin D. Strengthens bones.', image: null, isFavorite: false },
  { id: 22, name: 'Cheese', category: 'dairy', calories: 113, benefits: 'High in calcium, protein, and vitamin B12. Supports bone health.', image: null, isFavorite: false },
  { id: 23, name: 'Cottage Cheese', category: 'dairy', calories: 163, benefits: 'Low-fat, high-protein dairy product. Rich in B vitamins and selenium.', image: null, isFavorite: false },
  { id: 24, name: 'Almond Milk', category: 'dairy', calories: 39, benefits: 'Dairy-free, low in calories, fortified with calcium and vitamin D.', image: null, isFavorite: false },
  { id: 25, name: 'Greek Yogurt', category: 'dairy', calories: 100, benefits: 'High protein, probiotics for gut health. Excellent source of calcium.', image: null, isFavorite: false },
];

export default function RecipesScreen({ onClose, onFoodAdded }: { onClose: () => void; onFoodAdded?: (calories: number) => void }) {
  const [activeTab, setActiveTab] = useState<'recipes' | 'meals' | 'foods'>('recipes');
  const [selectedCalories, setSelectedCalories] = useState(0);
  const [showIntakeBar, setShowIntakeBar] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedRecipeCategory, setSelectedRecipeCategory] = useState('all');
  const [selectedMealCategory, setSelectedMealCategory] = useState('all');
  const [selectedFoodCategory, setSelectedFoodCategory] = useState('all');
  const [recipes, setRecipes] = useState<Recipe[]>(RECIPE_DATABASE);
  const [meals, setMeals] = useState<MealSuggestion[]>(MEAL_DATABASE);
  const [foods, setFoods] = useState<FoodItem[]>(FOOD_DATABASE);
  const [expandedRecipe, setExpandedRecipe] = useState<number | null>(null);
  const [expandedMeal, setExpandedMeal] = useState<number | null>(null);
  const [expandedFood, setExpandedFood] = useState<number | null>(null);

  const getFilteredRecipes = () => {
    if (showFavorites) return recipes.filter(r => r.isFavorite);
    if (selectedRecipeCategory === 'all') return recipes;
    return recipes.filter(r => r.category === selectedRecipeCategory);
  };

  const getFilteredMeals = () => {
    if (showFavorites) return meals.filter(m => m.isFavorite);
    if (selectedMealCategory === 'all') return meals;
    return meals.filter(m => m.category === selectedMealCategory);
  };

  const getFilteredFoods = () => {
    if (showFavorites) return foods.filter(f => f.isFavorite);
    if (selectedFoodCategory === 'all') return foods;
    return foods.filter(f => f.category === selectedFoodCategory);
  };

  const toggleRecipeFavorite = (id: number) => {
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r));
  };

  const toggleMealFavorite = (id: number) => {
    setMeals(prev => prev.map(m => m.id === id ? { ...m, isFavorite: !m.isFavorite } : m));
  };

  const toggleFoodFavorite = (id: number) => {
    setFoods(prev => prev.map(f => f.id === id ? { ...f, isFavorite: !f.isFavorite } : f));
  };

  const getTotalFavoritesCalories = () => {
    const recipeCals = recipes.filter(r => r.isFavorite).reduce((sum, r) => sum + r.calories, 0);
    const mealCals = meals.filter(m => m.isFavorite).reduce((sum, m) => sum + m.calories, 0);
    const foodCals = foods.filter(f => f.isFavorite).reduce((sum, f) => sum + f.calories, 0);
    return recipeCals + mealCals + foodCals;
  };

  const getFavoritesCount = () => {
    return recipes.filter(r => r.isFavorite).length + 
           meals.filter(m => m.isFavorite).length + 
           foods.filter(f => f.isFavorite).length;
  };

  const resetSelection = () => {
    setSelectedCalories(0);
    setShowIntakeBar(false);
  };

const addCalories = (calories: number, itemName: string = 'Food item') => {
    setSelectedCalories(prev => prev + calories);
    setShowIntakeBar(true);
    Alert.alert('Calorie has been added', `${itemName} (${calories} kcal)`);
  };

  const addToIntake = () => {
    if (onFoodAdded && selectedCalories > 0) {
      onFoodAdded(selectedCalories);
      Alert.alert('Added to Food Calories', `${selectedCalories} kcal added to your daily food total!`);
      resetSelection();
    }
  };

  const renderTabButton = (tab: 'recipes' | 'meals' | 'foods', label: string, icon: string) => (
    <Pressable 
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
  onPress={() => { setActiveTab(tab); setShowFavorites(false); resetSelection(); }}
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
        {recipes.filter(r => r.isFavorite).length > 0 && (
          <View style={styles.favSection}>
            <Text style={styles.favSectionTitle}>Recipes</Text>
            {recipes.filter(r => r.isFavorite).map(recipe => (
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
                    {recipe.ingredients.map((ing: string, idx: number) => (
                      <Text key={idx} style={styles.bullet}>• {ing}</Text>
                    ))}
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
        {meals.filter(m => m.isFavorite).length > 0 && (
          <View style={styles.favSection}>
            <Text style={styles.favSectionTitle}>Meal Suggestions</Text>
            {meals.filter(m => m.isFavorite).map(meal => (
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
        {foods.filter(f => f.isFavorite).length > 0 && (
          <View style={styles.favSection}>
            <Text style={styles.favSectionTitle}>Foods</Text>
            {foods.filter(f => f.isFavorite).map(food => (
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
                    <Icon2 style={[styles.favIcon, recipe.isFavorite && styles.favIconActive]} name={recipe.isFavorite ? "heart" : "heart-outline"} />
                  </Pressable>
                  <Pressable style={styles.addCalButton} onPress={() => addCalories(recipe.calories, recipe.name)}>
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
                  {recipe.ingredients.map((ing: string, idx: number) => (
                    <Text key={idx} style={styles.bullet}>• {ing}</Text>
                  ))}
                  <Text style={styles.expTitle}>Instructions:</Text>
                  {recipe.instructions.map((inst: string, idx: number) => (
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
                    <Icon2 style={[styles.favIcon, meal.isFavorite && styles.favIconActive]} name={meal.isFavorite ? "heart" : "heart-outline"} />
                  </Pressable>
                  <Pressable style={styles.addCalButton} onPress={() => addCalories(meal.calories, meal.name)}>
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
                  {meal.foods.map((food: string, idx: number) => (
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
                    <Icon2 style={[styles.favIcon, food.isFavorite && styles.favIconActive]} name={food.isFavorite ? "heart" : "heart-outline"} />
                  </Pressable>
                  <Pressable style={styles.addCalButton} onPress={() => addCalories(food.calories, food.name)}>
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
    <View style={styles.container}>
      <View style={styles.header1} />
      <View style={styles.header}>
        <Text style={styles.title}>Recipes, Meals & Foods</Text>
        <Pressable onPress={onClose}>
          <Icon style={styles.closeIcon} name="times-circle" />
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
          <Pressable style={[styles.favButton, showFavorites && styles.favButtonActive]} onPress={() => {setShowFavorites(!showFavorites); if (!showFavorites) resetSelection(); }}>
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
}

const styles = StyleSheet.create({
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
  container: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#15041f", zIndex: 400 },
  header1: { height: 35, backgroundColor: "#15041f" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15, backgroundColor: "#1e1929", borderBottomWidth: 1, borderBottomColor: "#362c3a" },
  title: { fontSize: 20, fontWeight: "bold", color: "#FFFFFF" },
  closeIcon: { fontSize: 30, color: "#FFFFFF" },
  tabNav: { flexDirection: "row", backgroundColor: "#1e1929", paddingHorizontal: 10, paddingVertical: 10, gap: 5 },
  tabButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#362c3a", paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, gap: 5 },
  tabButtonActive: { backgroundColor: "#c67ee2" },
  tabIcon: { fontSize: 16, color: "#CCCCCC" },
  tabIconActive: { color: "#FFFFFF" },
  tabText: { fontSize: 14, color: "#CCCCCC", fontWeight: "500" },
  tabTextActive: { color: "#FFFFFF", fontWeight: "bold" },
  favToggle: { padding: 15, backgroundColor: "#1e1929" },
  favButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#362c3a", padding: 12, borderRadius: 10, gap: 10 },
  favButtonActive: { backgroundColor: "#c67ee2" },
  favBtnIcon: { fontSize: 20, color: "#CCCCCC" },
  favBtnIconActive: { color: "#FFFFFF" },
  favBtnText: { fontSize: 16, fontWeight: "bold", color: "#CCCCCC" },
  favBtnTextActive: { color: "#FFFFFF" },
  categories: { paddingHorizontal: 15, paddingVertical: 15 },
  catButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#362c3a", paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, marginRight: 10, gap: 8 },
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

