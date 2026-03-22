// Exercise Screen Component with Categories, Details, and Persistent Favorites (RecipesScreen-style)
import { StyleSheet, Text, View, ScrollView, Pressable, Dimensions, Alert, Modal, Animated } from "react-native";
import { toggleFavoriteLocal, loadFavorites } from './PersistentFavoritesStorage';
import React, { useState, useEffect, useRef, useCallback } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import Icon2 from "react-native-vector-icons/FontAwesome";
import supabase from '../lib/supabase';
import { EXERCISE_CATEGORIES } from './ExerciseCategories';
import { ThemeColors, DEFAULT_THEME } from '../components/theme';


interface SupabaseExercise {
  id: string;
  name: string;
  category: string;
  estimated_calories: number;
  benefits: string;
  steps: string[];
  instructions: string;
  reps: string;
  difficulty: string;
  created_at: string;
}

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
  themeColors?: ThemeColors;
}

export default function ExerciseScreen({ onClose, onExerciseBurned, themeColors = DEFAULT_THEME }: ExerciseScreenProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCalories, setSelectedCalories] = useState(0);
  const [showIntakeBar, setShowIntakeBar] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [userFavoritesIds, setUserFavoritesIds] = useState<Set<string>>(new Set());
  const [pendingExercises, setPendingExercises] = useState<{name: string; calories: number; category: string}[]>([]);

  // ── Timer state ───────────────────────────────────────────────────────────
  const [timerExercise, setTimerExercise] = useState<Exercise | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerFinished, setTimerFinished] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Parse duration in seconds from instructions / reps strings
  // Handles: "30 seconds", "2 minutes", "45 sec", "1 min 30 sec", "3x30s", etc.
  const parseTimerSeconds = useCallback((exercise: Exercise): number => {
    const text = `${exercise.instructions} ${exercise.reps}`.toLowerCase();

    // "X min Y sec" or "X minute Y second"
    const minSec = text.match(/(\d+)\s*min(?:ute)?s?\s*(\d+)\s*sec(?:ond)?s?/);
    if (minSec) return parseInt(minSec[1]) * 60 + parseInt(minSec[2]);

    // "X minutes" or "X min"
    const minOnly = text.match(/(\d+)\s*min(?:ute)?s?/);
    if (minOnly) return parseInt(minOnly[1]) * 60;

    // "X seconds" or "Xs"
    const secOnly = text.match(/(\d+)\s*s(?:ec(?:ond)?s?)?(?:|$)/);
    if (secOnly && parseInt(secOnly[1]) > 5) return parseInt(secOnly[1]);

    // reps-based: default 30s per rep set
    const repsMatch = exercise.reps.match(/(\d+)\s*(?:reps|rep|x)/i);
    if (repsMatch) return parseInt(repsMatch[1]) * 2; // 2 sec per rep

    // Fallback based on category
    const catDefaults: Record<string, number> = {
      cardio: 180, strength: 120, flexibility: 60, balance: 90, core: 60
    };
    return catDefaults[exercise.category] ?? 60;
  }, []);

  // Fetch exercises from Supabase
  useEffect(() => {
    async function fetchExercises() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('exercises')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;

        // Map to Exercise interface
        const mappedExercises: Exercise[] = data?.map((ex: SupabaseExercise) => ({
          id: ex.id,
          name: ex.name,
          category: ex.category,
          estimatedCalories: ex.estimated_calories,
          benefits: ex.benefits,
          steps: ex.steps,
          instructions: ex.instructions,
          reps: ex.reps,
          difficulty: ex.difficulty,
        })) || [];

        setExercises(mappedExercises);
      } catch (error) {
        Alert.alert('Error', 'Failed to load exercises');
        console.error('Error fetching exercises:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchExercises();
  }, []);

// Load favorites on mount — Supabase first, then merge local
  useEffect(() => {
    async function loadAllFavorites() {
      try {
        // 1. Load local favorites immediately for instant UI
        const localFavs = await loadFavorites();
        const localSet = new Set<string>(localFavs);
        setUserFavoritesIds(localSet);

        // 2. Fetch from Supabase (works for both guests and logged-in users)
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id ?? null;

        let query = supabase.from('user_favorites_exercise').select('exercise_id');
        if (userId) {
          query = query.eq('user_id', userId);
        } else {
          query = query.is('user_id', null);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (data && data.length > 0) {
          const dbIds = data.map((row: { exercise_id: string }) => row.exercise_id);
          // Merge DB + local so nothing is lost
          const merged = new Set<string>([...localSet, ...dbIds]);
          setUserFavoritesIds(merged);
          console.log('Favorites loaded from Supabase:', dbIds.length, 'entries');
        } else {
          console.log('No Supabase favorites found, using local only');
        }
      } catch (e) {
        console.log('Supabase load failed, using local favorites:', e);
      }
    }
    loadAllFavorites();
  }, []);

  const addCalories = (calories: number, exerciseName?: string, exerciseCategory?: string) => {
    const name = exerciseName || exercises.find(ex => ex.estimatedCalories === calories)?.name || 'Exercise';
    const category = exerciseCategory || exercises.find(ex => ex.estimatedCalories === calories)?.category || '';
    setSelectedCalories(prev => prev + calories);
    setShowIntakeBar(true);
    setPendingExercises(prev => [...prev, { name, calories, category }]);
    Alert.alert('Exercise Added', `${name} (${calories} kcal) has been added to your count!`);
  };

  const resetSelection = () => {
    setSelectedCalories(0);
    setShowIntakeBar(false);
  };

  const addToIntake = async () => {
    if (onExerciseBurned && selectedCalories > 0) {
      onExerciseBurned(selectedCalories);

      // Log each exercise to daily_activity_logs
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id ?? null;
        const today = new Date().toISOString().split('T')[0];

        const logEntries = pendingExercises.map(ex => ({
          user_id: userId,
          log_date: today,
          activity_type: 'exercise',
          item_name: ex.name,
          item_category: ex.category,
          calories: ex.calories,
          logged_at: new Date().toISOString(),
        }));

        if (logEntries.length > 0) {
          await supabase.from('daily_activity_logs').insert(logEntries);
        }

        // Upsert today's exercise total in goal_logs
        const { data: existing } = await supabase
          .from('goal_logs')
          .select('calories_burned')
          .eq('log_date', today)
          .eq('user_id', userId)
          .single();

        const prev = existing?.calories_burned ?? 0;
        await supabase.from('goal_logs').upsert({
          user_id: userId,
          log_date: today,
          calories_burned: prev + selectedCalories,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,log_date' });

      } catch (e: any) {
        console.warn('Exercise log error:', e?.message);
      }

      Alert.alert('Total Exercise Calories Added', `${selectedCalories} kcal added to your exercise total!`);
      setPendingExercises([]);
      resetSelection();
    }
  };

  // ── Timer functions ──────────────────────────────────────────────────────
  const startTimer = (exercise: Exercise) => {
    const secs = parseTimerSeconds(exercise);
    setTimerExercise(exercise);
    setTimerSeconds(secs);
    setTimerElapsed(0);
    setTimerRunning(true);
    setTimerFinished(false);
    progressAnim.setValue(0);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    setTimerFinished(false);
    setTimerExercise(null);
    setTimerElapsed(0);
    progressAnim.setValue(0);
  };

  const pauseTimer = () => setTimerRunning(r => !r);

  // Tick the timer every second
  useEffect(() => {
    if (!timerRunning || !timerExercise) return;
    timerRef.current = setInterval(() => {
      setTimerElapsed(prev => {
        const next = prev + 1;
        const total = timerSeconds;
        // Animate progress bar
        Animated.timing(progressAnim, {
          toValue: next / total,
          duration: 900,
          useNativeDriver: false,
        }).start();
        if (next >= total) {
          clearInterval(timerRef.current!);
          setTimerRunning(false);
          setTimerFinished(true);
        }
        return next;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning, timerExercise]);

  // Auto-log calories when timer completes
  const handleTimerComplete = async () => {
    if (!timerExercise) return;
    const cal = timerExercise.estimatedCalories;
    const name = timerExercise.name;
    const category = timerExercise.category;

    // Add to local pending so intakeBar shows it
    setSelectedCalories(prev => prev + cal);
    setShowIntakeBar(true);
    setPendingExercises(prev => [...prev, { name, calories: cal, category }]);

    // Immediately push to dashboard + Supabase
    if (onExerciseBurned) onExerciseBurned(cal);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('daily_activity_logs').insert([{
        user_id: userId, log_date: today, activity_type: 'exercise',
        item_name: name, item_category: category, calories: cal,
        logged_at: new Date().toISOString(),
      }]);
      const { data: existing } = await supabase.from('goal_logs')
        .select('calories_burned').eq('log_date', today).eq('user_id', userId).single();
      const prev = existing?.calories_burned ?? 0;
      await supabase.from('goal_logs').upsert({
        user_id: userId, log_date: today,
        calories_burned: prev + cal,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,log_date' });
    } catch (e: any) {
      console.warn('Timer log error:', e?.message);
    }

    Alert.alert('🔥 Exercise Complete!', `${name} done! ${cal} kcal burned and logged.`);
    stopTimer();
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const toggleFavorite = async (exerciseId: string, exerciseName: string, exerciseCategory: string) => {
    const isFav = userFavoritesIds.has(exerciseId);

    // 1. Instant UI + local persistence
    const newFavorites = await toggleFavoriteLocal(exerciseId, userFavoritesIds);
    setUserFavoritesIds(newFavorites);
    
    if (isFav) {
      Alert.alert("Removed", `Removed from favorites (${newFavorites.size})`);
    } else {
      Alert.alert("Added", `Added to favorites (${newFavorites.size})`);
    }

    // 2. Sync to Supabase — works for both guests (user_id=NULL) and logged-in users
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;

      if (isFav) {
        // Remove from Supabase
        let deleteQuery = supabase
          .from('user_favorites_exercise')
          .delete()
          .eq('exercise_id', exerciseId);
        if (userId) {
          deleteQuery = deleteQuery.eq('user_id', userId);
        } else {
          deleteQuery = deleteQuery.is('user_id', null);
        }
        const { error } = await deleteQuery;
        if (error) throw error;
        console.log('Supabase: removed favorite', exerciseId, exerciseName);
      } else {
        // Insert into Supabase with exercise_name so the DB row is human-readable
        const { error } = await supabase
          .from('user_favorites_exercise')
          .insert({ user_id: userId, exercise_id: exerciseId, exercise_name: exerciseName, exercise_category: exerciseCategory });
        if (error) throw error;
        console.log('Supabase: saved favorite', exerciseId, exerciseName, exerciseCategory, '| user:', userId ?? 'guest');
      }
    } catch (e) {
      console.log('Supabase sync failed — local save still OK:', e);
    }
  };


  const isFavorite = (exerciseId: string) => userFavoritesIds.has(exerciseId);

  const filteredExercises = selectedCategory
    ? exercises.filter((e) => e.category === selectedCategory)
    : exercises;

  const displayExercises = showFavorites ? exercises.filter(e => isFavorite(e.id)) : filteredExercises;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading exercises...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header1, { backgroundColor: themeColors.background }]} />
      <View style={[styles.header, { backgroundColor: themeColors.secondary, borderBottomColor: themeColors.primary + "44" }]}>
        <Text style={[styles.title, { color: themeColors.text }]}>Exercises</Text>
        <Pressable onPress={onClose}>
          <Icon style={[styles.closeIcon, { color: themeColors.text }]} name="times-circle" />
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
          <Text style={[styles.favText, showFavorites && styles.favTextActive]}>Favorites ({userFavoritesIds.size})</Text>
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
  {EXERCISE_CATEGORIES.map((category: any) => (
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
        {showFavorites && userFavoritesIds.size === 0 ? (
          <View style={styles.emptyState}>
            <Icon2 name="heart-o" style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No favorites yet!</Text>
            <Text style={styles.emptySubtext}>Tap the heart icon on any exercise to add it here.</Text>
          </View>
        ) : (
          displayExercises.map((exercise: Exercise) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <Pressable 
                style={styles.exerciseHeader}
                onPress={() => setExpandedExercise(expandedExercise === exercise.id ? null : exercise.id)}
              >
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <View style={styles.exerciseMeta}>
                    <View style={[
                      styles.difficultyBadge,
                      exercise.difficulty.toLowerCase() === "beginner" ? styles.difficulty_beginner :
                      exercise.difficulty.toLowerCase() === "intermediate" ? styles.difficulty_intermediate :
                      styles.difficulty_advanced
                    ]}>
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
                      toggleFavorite(exercise.id, exercise.name, exercise.category);
                    }}
                  >
                    <Icon2 
                      name={isFavorite(exercise.id) ? "heart" : "heart-o"} 
                      style={[styles.heartIcon, isFavorite(exercise.id) && styles.heartIconActive]} 
                    />
                  </Pressable>
                  {/* Timer button — shown on all exercises */}
                  <Pressable
                    style={styles.timerButton}
                    onPress={(e) => { e.stopPropagation(); startTimer(exercise); }}
                  >
                    <Icon name="clock" size={18} color="#F3AF41" />
                  </Pressable>
                  <Pressable style={styles.addCalButton} onPress={() => addCalories(exercise.estimatedCalories, exercise.name, exercise.category)}>
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
                    {exercise.steps.map((step: string, index: number) => (
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
      {/* ── Exercise Timer Modal ──────────────────────────────────────────── */}
      <Modal visible={timerExercise !== null} transparent animationType="slide">
        <View style={styles.timerOverlay}>
          <View style={styles.timerCard}>
            {/* Exercise name */}
            <Text style={styles.timerExName} numberOfLines={2}>
              {timerExercise?.name}
            </Text>
            <Text style={styles.timerCategory}>
              {timerExercise?.category} · {timerExercise?.estimatedCalories} kcal
            </Text>

            {/* Countdown ring / display */}
            <View style={styles.timerRingWrap}>
              <View style={styles.timerRingBg} />
              <View style={styles.timerRingInner}>
                {timerFinished ? (
                  <Icon name="check-circle" size={48} color="#4CAF50" />
                ) : (
                  <>
                    <Text style={styles.timerCountdown}>
                      {formatTime(Math.max(timerSeconds - timerElapsed, 0))}
                    </Text>
                    <Text style={styles.timerCountdownSub}>remaining</Text>
                  </>
                )}
              </View>
              {/* Animated progress ring (simplified bar) */}
              <View style={styles.timerProgressBg}>
                <Animated.View style={[styles.timerProgressFill, {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1], outputRange: ['0%', '100%']
                  })
                }]} />
              </View>
            </View>

            {/* Elapsed */}
            <Text style={styles.timerElapsed}>
              {formatTime(timerElapsed)} elapsed
            </Text>

            {/* Instructions reminder */}
            <View style={styles.timerInstrBox}>
              <Text style={styles.timerInstrText} numberOfLines={3}>
                {timerExercise?.instructions}
              </Text>
            </View>

            {/* Steps scroll */}
            {timerExercise?.steps && timerExercise.steps.length > 0 && (
              <ScrollView style={styles.timerStepsList} showsVerticalScrollIndicator={false}>
                {timerExercise.steps.map((step, i) => (
                  <View key={i} style={styles.timerStepRow}>
                    <View style={styles.timerStepNum}>
                      <Text style={styles.timerStepNumTxt}>{i + 1}</Text>
                    </View>
                    <Text style={styles.timerStepTxt}>{step}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Buttons */}
            {timerFinished ? (
              <View style={styles.timerBtnRow}>
                <Pressable style={[styles.timerBtn, styles.timerBtnComplete]} onPress={handleTimerComplete}>
                  <Icon name="fire-alt" size={18} color="#fff" />
                  <Text style={styles.timerBtnTxt}>Log {timerExercise?.estimatedCalories} kcal</Text>
                </Pressable>
                <Pressable style={[styles.timerBtn, styles.timerBtnStop]} onPress={stopTimer}>
                  <Icon name="times" size={18} color="#fff" />
                  <Text style={styles.timerBtnTxt}>Dismiss</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.timerBtnRow}>
                <Pressable style={[styles.timerBtn, timerRunning ? styles.timerBtnPause : styles.timerBtnStart]} onPress={pauseTimer}>
                  <Icon name={timerRunning ? "pause" : "play"} size={18} color="#fff" />
                  <Text style={styles.timerBtnTxt}>{timerRunning ? 'Pause' : 'Resume'}</Text>
                </Pressable>
                <Pressable style={[styles.timerBtn, styles.timerBtnStop]} onPress={stopTimer}>
                  <Icon name="stop" size={18} color="#fff" />
                  <Text style={styles.timerBtnTxt}>Stop</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#15041f",
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
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

  // ── Timer button ─────────────────────────────────────────────────────────
  timerButton: {
    padding: 5,
  },

  // ── Timer Modal ───────────────────────────────────────────────────────────
  timerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  timerCard: {
    backgroundColor: '#1e1929',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: '#362c3a',
    gap: 12,
    maxHeight: '90%',
  },
  timerExName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  timerCategory: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timerRingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    gap: 10,
  },
  timerRingBg: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 6,
    borderColor: '#2a2335',
  },
  timerRingInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCountdown: {
    top: 20,
    fontSize: 44,
    fontWeight: '900',
    color: '#F3AF41',
  },
  timerCountdownSub: {
    top: 20,
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  timerProgressBg: {
    height: 8,
    width: '100%',
    backgroundColor: '#2a2335',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 25,
  },
  timerProgressFill: {
    height: 8,
    backgroundColor: '#F3AF41',
    borderRadius: 4,
  },
  timerElapsed: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  timerInstrBox: {
    backgroundColor: '#211c24',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#c67ee2',
  },
  timerInstrText: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 18,
  },
  timerStepsList: {
    maxHeight: 140,
  },
  timerStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  timerStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#c67ee2',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  timerStepNumTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  timerStepTxt: {
    flex: 1,
    fontSize: 13,
    color: '#ccc',
    lineHeight: 18,
  },
  timerBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  timerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  timerBtnStart: { backgroundColor: '#c67ee2' },
  timerBtnPause: { backgroundColor: '#F3AF41' },
  timerBtnStop:  { backgroundColor: '#3a2a3a' },
  timerBtnComplete: { backgroundColor: '#4CAF50' },
  timerBtnTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});