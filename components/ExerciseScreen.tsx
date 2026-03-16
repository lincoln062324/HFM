// Exercise Screen Component with Categories, Details, and Persistent Favorites (RecipesScreen-style)
import { StyleSheet, Text, View, ScrollView, Pressable, Dimensions, Alert } from "react-native";
import React, { useState, useEffect } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import Icon2 from "react-native-vector-icons/FontAwesome";

interface Exercise {
  id: string;
  name: string;
  category: string;
  estimatedCalories: number;
  benefits: string;
  steps: string[];
  instructions: string;
  reps: string;
  difficulty: string;
}

interface ExerciseScreenProps {
  onClose: () => void;
  onExerciseBurned?: (calories: number) => void;
}

const EXERCISE_CATEGORIES = [
  { id: "cardio", name: "Cardio", icon: "heartbeat" },
  { id: "strength", name: "Strength", icon: "dumbbell" },
  { id: "flexibility", name: "Flexibility", icon: "child" },
  { id: "balance", name: "Balance", icon: "balance-scale" },
];

const EXERCISES: Exercise[] = [
  {
    id: "running",
    name: "Running",
    category: "cardio",
    estimatedCalories: 300,
    benefits: "Improves cardiovascular health, burns calories, strengthens legs, boosts mood through endorphins.",
    steps: ["Warm up for 5 minutes", "Start at a comfortable pace", "Gradually increase speed", "Cool down for 5 minutes"],
    instructions: "Run at a steady pace, maintaining good form. Keep your arms at 90 degrees and land midfoot.",
    reps: "20-30 minutes",
    difficulty: "Intermediate",
  },
  {
    id: "jumping-jacks",
    name: "Jumping Jacks",
    category: "cardio",
    estimatedCalories: 15,
    benefits: "Full body workout, improves coordination, increases heart rate, burns calories efficiently.",
    steps: ["Stand with feet together, arms at sides", "Jump while spreading legs and raising arms overhead", "Return to starting position", "Repeat continuously"],
    instructions: "Keep the movement fluid and maintain a steady rhythm. Land softly on your feet.",
    reps: "3 sets of 20 reps",
    difficulty: "Beginner",
  },
  {
    id: "burpees",
    name: "Burpees",
    category: "cardio",
    estimatedCalories: 20,
    benefits: "Full body conditioning, builds muscle, burns fat, improves cardiovascular endurance.",
    steps: ["Start standing", "Drop into a squat with hands on floor", "Jump feet back to plank", "Do a push-up", "Jump feet forward", "Jump up with arms overhead"],
    instructions: "Maintain proper form throughout. Modify by stepping instead of jumping.",
    reps: "3 sets of 10 reps",
    difficulty: "Advanced",
  },
  {
    id: "push-ups",
    name: "Push-Ups",
    category: "strength",
    estimatedCalories: 10,
    benefits: "Builds chest, shoulders, and triceps, strengthens core, improves posture.",
    steps: ["Start in plank position", "Lower body until chest nearly touches floor", "Push back up to starting position", "Keep core tight throughout"],
    instructions: "Keep your body in a straight line. Don't let hips sag or pike up.",
    reps: "3 sets of 15 reps",
    difficulty: "Intermediate",
  },
  {
    id: "squats",
    name: "Squats",
    category: "strength",
    estimatedCalories: 12,
    benefits: "Strengthens legs and glutes, improves balance, increases mobility, burns calories.",
    steps: ["Stand with feet shoulder-width apart", "Push hips back and bend knees", "Lower until thighs are parallel to floor", "Push through heels to stand"],
    instructions: "Keep your chest up and knees tracking over toes. Don't let knees cave inward.",
    reps: "3 sets of 20 reps",
    difficulty: "Beginner",
  },
  {
    id: "plank",
    name: "Plank",
    category: "strength",
    estimatedCalories: 5,
    benefits: "Strengthens core, improves posture, builds stability, reduces back pain.",
    steps: ["Start in forearm plank position", "Keep body in straight line from head to heels", "Engage core and hold", "Don't let hips drop or rise"],
    instructions: "Draw your belly button toward your spine. Breathe steadily throughout.",
    reps: "3 sets of 30-60 seconds",
    difficulty: "Intermediate",
  },
  {
    id: "yoga-sun-salutation",
    name: "Sun Salutation",
    category: "flexibility",
    estimatedCalories: 50,
    benefits: "Increases flexibility, builds strength, calms mind, improves circulation.",
    steps: ["Start in mountain pose", "Raise arms overhead", "Fold forward", "Half lift with flat back", "Plank", "Chaturanga", "Upward dog", "Downward dog", "Step forward and fold", "Rise up"],
    instructions: "Flow through each pose with your breath. Move slowly and mindfully.",
    reps: "5-10 rounds",
    difficulty: "Intermediate",
  },
  {
    id: "hamstring-stretch",
    name: "Hamstring Stretch",
    category: "flexibility",
    estimatedCalories: 2,
    benefits: "Lengthens hamstrings, reduces lower back tension, improves flexibility.",
    steps: ["Sit with one leg extended", "Bend other leg with foot against inner thigh", "Reach toward extended foot", "Hold and breathe", "Switch sides"],
    instructions: "Keep your back straight and hinge from the hips. Don't bounce.",
    reps: "30 seconds per side",
    difficulty: "Beginner",
  },
  {
    id: "tree-pose",
    name: "Tree Pose",
    category: "balance",
    estimatedCalories: 3,
    benefits: "Improves balance, strengthens legs, increases focus, builds stability.",
    steps: ["Stand on one leg", "Place other foot on inner thigh or calf", "Bring hands to prayer position", "Focus on a fixed point", "Hold and breathe", "Switch sides"],
    instructions: "Avoid placing foot on knee. Engage your core and stand tall.",
    reps: "30-60 seconds per side",
    difficulty: "Intermediate",
  },
  {
    id: "wall-sit",
    name: "Wall Sit",
    category: "balance",
    estimatedCalories: 8,
    benefits: "Strengthens legs, builds endurance, improves posture.",
    steps: ["Stand with back against wall", "Slide down until thighs are parallel to floor", "Keep knees at 90 degrees", "Hold position", "Slide back up"],
    instructions: "Keep your back flat against the wall. Don't let knees go past toes.",
    reps: "3 sets of 30-60 seconds",
    difficulty: "Intermediate",
  },
  {
    id: "cycling",
    name: "Cycling",
    category: "cardio",
    estimatedCalories: 250,
    benefits: "Good for leg muscles and cardiovascular fitness, low impact on joints, improves endurance, burns calories.",
    steps: ["Adjust bike seat to hip height", "Start pedaling at moderate pace", "Maintain steady cadence", "Shift gears as needed", "Cool down gradually"],
    instructions: "Keep posture upright, engage core, avoid hunching shoulders.",
    reps: "20-40 minutes",
    difficulty: "Beginner",
  },
  {
    id: "jump-rope",
    name: "Jump Rope",
    category: "cardio",
    estimatedCalories: 120,
    benefits: "Burns calories and improves coordination, increases foot speed and rhythm.",
    steps: ["Hold rope handles loosely", "Jump 1-2 inches off ground", "Turn rope with wrists", "Land on balls of feet", "Maintain steady rhythm"],
    instructions: "Stay relaxed, use wrists not arms, find comfortable jumping height.",
    reps: "3 sets of 1 minute",
    difficulty: "Intermediate",
  },
  {
    id: "lunges",
    name: "Lunges",
    category: "strength",
    estimatedCalories: 15,
    benefits: "Targets legs and improves stability, strengthens quads, glutes, hamstrings.",
    steps: ["Step forward with right foot", "Lower until both knees are bent 90 degrees", "Push through front heel to start", "Alternate legs"],
    instructions: "Keep front knee above ankle, torso upright, back knee near floor.",
    reps: "3 sets of 10-12 per leg",
    difficulty: "Intermediate",
  },
  {
    id: "bicep-curls",
    name: "Bicep Curls",
    category: "strength",
    estimatedCalories: 8,
    benefits: "Strengthens the arms, builds bicep peaks, improves grip.",
    steps: ["Stand with dumbbells at sides, palms forward", "Curl weights to shoulders", "Squeeze biceps at top", "Lower with control"],
    instructions: "Keep elbows fixed at sides, no swinging body.",
    reps: "3 sets of 12 reps",
    difficulty: "Beginner",
  },
  {
    id: "shoulder-stretch",
    name: "Shoulder Stretch",
    category: "flexibility",
    estimatedCalories: 1,
    benefits: "Increases shoulder mobility, relieves tightness.",
    steps: ["Extend right arm across chest", "Hook left arm around right arm", "Pull gently across body", "Switch arms"],
    instructions: "Keep shoulders down, feel stretch in upper arm.",
    reps: "20-30 seconds per side",
    difficulty: "Beginner",
  },
  {
    id: "cobra-stretch",
    name: "Cobra Stretch",
    category: "flexibility",
    estimatedCalories: 2,
    benefits: "Stretches abdomen and lower back, opens chest.",
    steps: ["Lie face down, palms under shoulders", "Press chest up, elbows slightly bent", "Look forward, shoulders down"],
    instructions: "Press hips down, lengthen spine, hold steady breaths.",
    reps: "20-30 seconds, 3 reps",
    difficulty: "Beginner",
  },
  {
    id: "butterfly-stretch",
    name: "Butterfly Stretch",
    category: "flexibility",
    estimatedCalories: 1,
    benefits: "Stretches inner thighs and hips.",
    steps: ["Sit, soles together, knees out", "Hold feet, flap knees gently", "Press knees down lightly"],
    instructions: "Sit tall, lean forward from hips.",
    reps: "30 seconds",
    difficulty: "Beginner",
  },
  {
    id: "side-stretch",
    name: "Side Stretch",
    category: "flexibility",
    estimatedCalories: 1,
    benefits: "Improves flexibility in torso and waist.",
    steps: ["Stand tall, feet together", "Reach right arm overhead", "Bend to left side", "Switch sides"],
    instructions: "Lengthen side body, keep hips stable.",
    reps: "20-30 seconds per side",
    difficulty: "Beginner",
  },
  {
    id: "single-leg-stand",
    name: "Single-Leg Stand",
    category: "balance",
    estimatedCalories: 2,
    benefits: "Improves stability and balance.",
    steps: ["Stand on one leg", "Lift other knee", "Fix gaze forward", "Hold, then switch"],
    instructions: "Engage core, arms out if needed.",
    reps: "30 seconds per leg",
    difficulty: "Beginner",
  },
  {
    id: "heel-to-toe-walk",
    name: "Heel-to-Toe Walk",
    category: "balance",
    estimatedCalories: 5,
    benefits: "Enhances coordination and balance control.",
    steps: ["Place heel of front foot touching toes of back", "Walk 10 steps straight", "Turn, return"],
    instructions: "Arms out for balance, eyes forward.",
    reps: "3 passes",
    difficulty: "Beginner",
  },
  {
    id: "tai-chi-movements",
    name: "Tai Chi Movements",
    category: "balance",
    estimatedCalories: 25,
    benefits: "Slow movements that improve body control.",
    steps: ["Stand feet shoulder width", "Shift weight slowly", "Flow arms in circles", "Breathe deeply"],
    instructions: "Move smoothly, stay relaxed.",
    reps: "5 minutes",
    difficulty: "Intermediate",
  },
  {
    id: "balance-board-exercise",
    name: "Balance Board Exercise",
    category: "balance",
    estimatedCalories: 10,
    benefits: "Strengthens stabilizing muscles.",
    steps: ["Step on board carefully", "Shift weight front to back", "Side to side", "Knees soft"],
    instructions: "Engage core, small movements first.",
    reps: "30-60 seconds",
    difficulty: "Intermediate",
  },
  {
    id: "high-knees",
    name: "High Knees",
    category: "cardio",
    estimatedCalories: 100,
    benefits: "Running in place while lifting knees high to increase heart rate, improves leg drive and coordination.",
    steps: ["Run in place", "Drive knees high", "Pump arms vigorously", "Stay on balls of feet"],
    instructions: "Keep core tight, quick feet, high knees.",
    reps: "30-60 seconds",
    difficulty: "Intermediate",
  },
  {
    id: "mountain-climbers",
    name: "Mountain Climbers",
    category: "cardio",
    estimatedCalories: 80,
    benefits: "Fast-paced exercise that works the whole body and improves endurance.",
    steps: ["Plank position", "Alternate driving knees to chest", "Keep hips low", "Fast pace"],
    instructions: "Core tight, quick alternating legs.",
    reps: "3 sets of 30 seconds",
    difficulty: "Intermediate",
  },
  {
    id: "stair-climbing",
    name: "Stair Climbing",
    category: "cardio",
    estimatedCalories: 200,
    benefits: "Walking or running up stairs for a strong cardio workout, builds leg strength.",
    steps: ["Find stairs", "Walk or run up", "Walk down for recovery", "Repeat"],
    instructions: "Use handrail if needed, drive through heels.",
    reps: "5-10 minutes",
    difficulty: "Intermediate",
  },
  {
    id: "dancing",
    name: "Dancing",
    category: "cardio",
    estimatedCalories: 150,
    benefits: "Enjoyable way to improve cardiovascular fitness, full body movement.",
    steps: ["Put on favorite music", "Move freely", "Add jumps, spins", "Maintain rhythm"],
    instructions: "Smile and enjoy, vary intensity.",
    reps: "15-30 minutes",
    difficulty: "Beginner",
  },
  {
    id: "skaters",
    name: "Skaters (Side-to-Side Jumps)",
    category: "cardio",
    estimatedCalories: 90,
    benefits: "Improves agility and burns calories, lateral movement.",
    steps: ["Jump side to side", "Land on one foot", "Reach opposite arm", "Alternate sides"],
    instructions: "Low stance, explosive jumps.",
    reps: "3 sets of 20 reps",
    difficulty: "Intermediate",
  },
  {
    id: "tricep-dips",
    name: "Tricep Dips",
    category: "strength",
    estimatedCalories: 12,
    benefits: "Targets the back of the arms using chair or bench.",
    steps: ["Sit on edge of chair", "Hands beside hips", "Slide off, lower body", "Push back up"],
    instructions: "Elbows back, shoulders down.",
    reps: "3 sets of 12 reps",
    difficulty: "Intermediate",
  },
  {
    id: "glute-bridge",
    name: "Glute Bridge",
    category: "strength",
    estimatedCalories: 8,
    benefits: "Strengthens the glutes and lower back.",
    steps: ["Lie on back, knees bent", "Feet flat", "Lift hips up", "Squeeze glutes"],
    instructions: "Full hip extension, hold top.",
    reps: "3 sets of 15 reps",
    difficulty: "Beginner",
  },
  {
    id: "deadlifts",
    name: "Deadlifts",
    category: "strength",
    estimatedCalories: 25,
    benefits: "Builds strength in the back, legs, and core.",
    steps: ["Feet hip width", "Hinge at hips", "Grip barbell", "Lift by driving hips", "Lower with control"],
    instructions: "Flat back, hips back.",
    reps: "3 sets of 8-10 reps",
    difficulty: "Advanced",
  },
  {
    id: "shoulder-press",
    name: "Shoulder Press",
    category: "strength",
    estimatedCalories: 15,
    benefits: "Strengthens shoulders and upper arms.",
    steps: ["Dumbbells at shoulders", "Press overhead", "Lower to shoulders"],
    instructions: "Core tight, no arching back.",
    reps: "3 sets of 10-12 reps",
    difficulty: "Intermediate",
  },
  {
    id: "quadriceps-stretch",
    name: "Quadriceps Stretch",
    category: "flexibility",
    estimatedCalories: 1,
    benefits: "Stretches the front of the thighs.",
    steps: ["Stand, bend one knee back", "Grab ankle", "Pull heel to glute", "Switch"],
    instructions: "Knees together, hips forward.",
    reps: "30 seconds per leg",
    difficulty: "Beginner",
  },
  {
    id: "neck-stretch",
    name: "Neck Stretch",
    category: "flexibility",
    estimatedCalories: 1,
    benefits: "Improves flexibility and reduces tension in the neck.",
    steps: ["Sit/stand tall", "Tilt head to shoulder", "Use hand for gentle pull", "Switch sides"],
    instructions: "Relax shoulders, no crunching.",
    reps: "20-30 seconds per side",
    difficulty: "Beginner",
  },
  {
    id: "cat-cow-stretch",
    name: "Cat-Cow Stretch",
    category: "flexibility",
    estimatedCalories: 3,
    benefits: "Increases flexibility in the spine and back.",
    steps: ["Hands and knees", "Arch back up (cat)", "Drop belly, look up (cow)", "Flow with breath"],
    instructions: "Slow movement, full range.",
    reps: "10 breaths",
    difficulty: "Beginner",
  },
  {
    id: "standing-toe-touch",
    name: "Standing Toe Touch",
    category: "flexibility",
    estimatedCalories: 1,
    benefits: "Stretches the hamstrings and lower back.",
    steps: ["Stand tall", "Hinge at hips", "Reach toward toes", "Hold"],
    instructions: "Knees soft, back straight.",
    reps: "20-30 seconds",
    difficulty: "Beginner",
  },
  {
    id: "hip-flexor-stretch",
    name: "Hip Flexor Stretch",
    category: "flexibility",
    estimatedCalories: 2,
    benefits: "Improves flexibility in the hips and thighs.",
    steps: ["Lunge position", "Front leg bent", "Push hips forward", "Feel stretch in back leg"],
    instructions: "Torso upright, switch sides.",
    reps: "30 seconds per side",
    difficulty: "Beginner",
  },
  {
    id: "flamingo-stand",
    name: "Flamingo Stand",
    category: "balance",
    estimatedCalories: 2,
    benefits: "Standing on one leg while maintaining posture.",
    steps: ["Stand on one leg", "Other foot behind", "Arms out", "Hold"],
    instructions: "Gaze fixed, core engaged.",
    reps: "30 seconds per leg",
    difficulty: "Intermediate",
  },
  {
    id: "side-leg-raises",
    name: "Side Leg Raises",
    category: "balance",
    estimatedCalories: 5,
    benefits: "Improves hip strength and balance.",
    steps: ["Stand on one leg", "Raise other leg to side", "Lower slowly", "Switch"],
    instructions: "Controlled movement, no swinging.",
    reps: "10-15 per side",
    difficulty: "Intermediate",
  },
  {
    id: "tightrope-walk",
    name: "Tightrope Walk",
    category: "balance",
    estimatedCalories: 10,
    benefits: "Walking in a straight line to improve balance.",
    steps: ["Heel to toe line", "Walk straight 20 feet", "Turn, return"],
    instructions: "Arms out, slow steps.",
    reps: "3-5 passes",
    difficulty: "Beginner",
  },
  {
    id: "single-leg-deadlift",
    name: "Single-Leg Deadlift",
    category: "balance",
    estimatedCalories: 12,
    benefits: "Strengthens legs while improving stability.",
    steps: ["Stand on one leg", "Hinge forward", "Reach toward ground", "Return"],
    instructions: "Back flat, hinge at hip.",
    reps: "8-10 per leg",
    difficulty: "Advanced",
  },
  {
    id: "standing-march",
    name: "Standing March",
    category: "balance",
    estimatedCalories: 8,
    benefits: "Slowly lifting knees while standing to improve coordination and balance.",
    steps: ["Stand tall", "Slowly lift one knee", "Lower, alternate", "Controlled motion"],
    instructions: "Arms swing naturally, steady pace.",
    reps: "1 minute",
    difficulty: "Beginner",
  },
];



// Helper function to get difficulty badge style
const getDifficultyStyle = (difficulty: string): object => {
  switch (difficulty.toLowerCase()) {
    case "beginner":
      return styles.difficulty_beginner;
    case "intermediate":
      return styles.difficulty_intermediate;
    case "advanced":
      return styles.difficulty_advanced;
    default:
      return {};
  }
};

// In-memory storage for favorites
let favoritesStore: Exercise[] = [];

export default function ExerciseScreen({ onClose, onExerciseBurned }: ExerciseScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCalories, setSelectedCalories] = useState(0);
  const [showIntakeBar, setShowIntakeBar] = useState(false);

const addCalories = (calories: number) => {
  const exerciseName = EXERCISES.find(ex => ex.estimatedCalories === calories)?.name || 'Exercise';
  setSelectedCalories(prev => prev + calories);
  setShowIntakeBar(true);
  Alert.alert('Exercise Added', `${exerciseName} (${calories} kcal) has been added to your count!`);
};

  const resetSelection = () => {
    setSelectedCalories(0);
    setShowIntakeBar(false);
  };

const addToIntake = () => {
    if (onExerciseBurned && selectedCalories > 0) {
      onExerciseBurned(selectedCalories);
      Alert.alert('Total Exercise Calories Added', `${selectedCalories} kcal added to your exercise total!`);
      resetSelection();
    }
  };
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Exercise[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    setFavorites([...favoritesStore]);
  }, []);

  const toggleFavorite = (exercise: Exercise) => {
    const isFavorite = favorites.some((f) => f.id === exercise.id);
    let newFavorites: Exercise[];
    
    if (isFavorite) {
      newFavorites = favorites.filter((f) => f.id !== exercise.id);
      favoritesStore = newFavorites;
      Alert.alert("Removed", exercise.name + " removed from favorites");
    } else {
      newFavorites = [...favorites, exercise];
      favoritesStore = newFavorites;
      Alert.alert("Added", exercise.name + " added to favorites!");
    }
    
    setFavorites(newFavorites);
  };

  const isFavorite = (exerciseId: string) => {
    return favorites.some((f) => f.id === exerciseId);
  };

  const filteredExercises = selectedCategory
    ? EXERCISES.filter((e) => e.category === selectedCategory)
    : EXERCISES;

  const displayExercises = showFavorites ? favorites : filteredExercises;

  return (
    <View style={styles.container}>
          <View style={styles.header1}>
            </View>
      <View style={styles.header}>
        <Text style={styles.title}>Exercises</Text>
        <Pressable onPress={onClose}>
          <Icon style={styles.closeIcon} name="times-circle" />
        </Pressable>
      </View>

      <View style={styles.favoritesToggle}>
        <Pressable 
          style={[styles.favButton, !showFavorites && styles.favButtonActive]} 
          onPress={() => { setShowFavorites(false); resetSelection(); }}
        >
          <Icon name="list" style={styles.favIcon} />
          <Text style={[styles.favText, !showFavorites && styles.favTextActive]}>All Exercises</Text>
        </Pressable>
        <Pressable 
          style={[styles.favButton, showFavorites && styles.favButtonActive]} 
          onPress={() => { setShowFavorites(true); resetSelection(); }}
        >
          <Icon name="heart" style={[styles.favIcon, showFavorites && styles.favIconActive]} />
          <Text style={[styles.favText, showFavorites && styles.favTextActive]}>Favorites ({favorites.length})</Text>
        </Pressable>
      </View>

      {showIntakeBar && (
        <View style={styles.intakeBar}>
          <Text style={styles.intakeText}>Selected: <Text style={styles.intakeCalories}>{selectedCalories} kcal</Text></Text>
          <Pressable style={styles.addButton} onPress={addToIntake}>
            <Text style={styles.addButtonText}>Add to Burn</Text>
          </Pressable>
          <Pressable style={styles.clearButton} onPress={resetSelection}>
            <Icon name="times" size={20} color="#CCCCCC" />
          </Pressable>
        </View>
      )}

      {!showFavorites && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
          <Pressable 
            style={[styles.categoryButton, !selectedCategory && styles.categoryButtonActive]} 
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>All</Text>
          </Pressable>
          {EXERCISE_CATEGORIES.map((category) => (
            <Pressable
              key={category.id}
              style={[styles.categoryButton, selectedCategory === category.id && styles.categoryButtonActive]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Icon name={category.icon} style={[styles.categoryIcon, selectedCategory === category.id && styles.categoryIconActive]} />
              <Text style={[styles.categoryText, selectedCategory === category.id && styles.categoryTextActive]}>
                {category.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <ScrollView style={styles.exerciseList}>
        {showFavorites && favorites.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon2 name="heart-o" style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No favorites yet!</Text>
            <Text style={styles.emptySubtext}>Tap the heart icon on any exercise to add it here.</Text>
          </View>
        ) : (
          displayExercises.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <Pressable 
                style={styles.exerciseHeader}
                onPress={() => setExpandedExercise(expandedExercise === exercise.id ? null : exercise.id)}
              >
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <View style={styles.exerciseMeta}>
                    <View style={[styles.difficultyBadge, getDifficultyStyle(exercise.difficulty)]}>
                      <Text style={styles.difficultyText}>{exercise.difficulty}</Text>
                    </View>
                    <Text style={styles.repsText}>{exercise.reps}</Text>
                  </View>
                </View>
                <View style={styles.exerciseActions}>
                  <Pressable 
                    style={styles.favoriteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleFavorite(exercise);
                    }}
                  >
                    <Icon2 
                      name={isFavorite(exercise.id) ? "heart" : "heart-o"} 
                      style={[styles.heartIcon, isFavorite(exercise.id) && styles.heartIconActive]} 
                    />
                  </Pressable>
                  <Pressable style={styles.addCalButton} onPress={() => addCalories(exercise.estimatedCalories)}>
                    <Icon name="plus" size={18} color="#4CAF50" />
                  </Pressable>
                  <Icon 
                    name={expandedExercise === exercise.id ? "chevron-up" : "chevron-down"} 
                    style={styles.expandIcon} 
                  />
                </View>
              </Pressable>

              {expandedExercise === exercise.id && (
                <View style={styles.exerciseDetails}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>Benefits</Text>
                    <Text style={styles.detailText}>{exercise.benefits}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>Steps</Text>
                    {exercise.steps.map((step, index) => (
                      <View key={index} style={styles.stepItem}>
                        <View style={styles.stepNumber}>
                          <Text style={styles.stepNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>Instructions</Text>
                    <Text style={styles.detailText}>{exercise.instructions}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailTitle}>Reps / Duration</Text>
                    <Text style={styles.detailText}>{exercise.reps}</Text>
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "#15041f",
    zIndex: 400,
  },
  header1: {
    height: 35,
    backgroundColor: "#15041f",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#1e1929",
    borderBottomWidth: 1,
    borderBottomColor: "#362c3a",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  closeIcon: {
    fontSize: 30,
    color: "#FFFFFF",
  },
  favoritesToggle: {
    flexDirection: "row",
    padding: 15,
    gap: 10,
  },
  favButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#211c24",
    gap: 8,
  },
  favButtonActive: {
    backgroundColor: "#c67ee2",
  },
  favIcon: {
    fontSize: 18,
    color: "#CCCCCC",
  },
  favIconActive: {
    color: "#FFFFFF",
  },
  favText: {
    fontSize: 14,
    color: "#CCCCCC",
    fontWeight: "600",
  },
  favTextActive: {
    color: "#FFFFFF",
  },
  categoryContainer: {
    paddingHorizontal: 6.4,
    marginBottom: 10,
    width: "100%",
  },
  categoryButton: {
    width: 100,
    height: 40,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#211c24",
    marginRight: 10,
    gap: 8,
  },
  categoryButtonActive: {
    backgroundColor: "#c67ee2",
  },
  categoryIcon: {
    fontSize: 16,
    color: "#CCCCCC",
  },
  categoryIconActive: {
    color: "#FFFFFF",
  },
  categoryText: {
    fontSize: 14,
    color: "#CCCCCC",
    fontWeight: "600",
  },
  categoryTextActive: {
    color: "#FFFFFF",
  },
  exerciseList: {
    position: "absolute",
    top: 215,
    width: "100%",
    height: 630,
    flex: 1,
    padding: 15,
    marginTop: 10,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 60,
    color: "#444444",
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  exerciseCard: {
    position: "relative",
    backgroundColor: "#211c24",
    borderRadius: 15,
    marginBottom: 15,
    overflow: "hidden",
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  exerciseMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  difficulty_beginner: {
    backgroundColor: "#4CAF50",
  },
  difficulty_intermediate: {
    backgroundColor: "#FF9800",
  },
  difficulty_advanced: {
    backgroundColor: "#f44336",
  },
  difficultyText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  repsText: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  exerciseActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  favoriteButton: {
    padding: 5,
  },
  heartIcon: {
    fontSize: 22,
    color: "#666",
  },
  heartIconActive: {
    color: "#f44336",
  },
  expandIcon: {
    fontSize: 18,
    color: "#CCCCCC",
  },
  exerciseDetails: {
    padding: 15,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#362c3a",
  },
  detailSection: {
    marginBottom: 15,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#c67ee2",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#CCCCCC",
    lineHeight: 20,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#c67ee2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  addCalButton: {
    padding: 5,
  },
  intakeBar: {
    position: 'absolute',
    top: 40,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e1929',
    padding: 12,
    borderBottomColor: '#362c3a',
    zIndex: 400,
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
  stepText: {
    flex: 1,
    fontSize: 14,
    color: "#CCCCCC",
    lineHeight: 20,
  },
});
