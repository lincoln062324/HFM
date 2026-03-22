// Profile Screen Component
import { StyleSheet, Text, View, Image, ScrollView, Pressable, Dimensions, TextInput, Alert, ActivityIndicator } from "react-native";
import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/FontAwesome";
import Icon5 from "react-native-vector-icons/FontAwesome5";
import supabase from "../lib/supabase";
import Icon1 from "react-native-vector-icons/Foundation";
import Icon2 from "react-native-vector-icons/Entypo";
import * as ImagePicker from "expo-image-picker";
import { LineChart } from "react-native-gifted-charts";
import { ThemeColors, DEFAULT_THEME } from '../components/theme';


interface ProfileScreenProps {
  onClose: () => void;
  onGoalUpdate?: (goal: number) => void;
  themeColors?: ThemeColors;
}

// ─── UserProfile type (matches user_profiles table) ──────────────────────────
interface UserProfile {
  full_name: string | null;
  email: string | null;
  gender: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  activity_level: string | null;
  diet_preference: string | null;
  goals: string[];
  daily_calorie_goal: number;
  daily_steps_goal: number;
  water_goal_l: number;
  onboarding_complete: boolean;
  avatar_url: string | null;
}

// ─── Persistent avatar cache key ─────────────────────────────────────────────
const AVATAR_CACHE_KEY = '@fitlife_avatar_url';

const GOAL_LABELS: Record<string, string> = {
  lose_weight: '🏃 Lose Weight',
  gain_muscle: '💪 Gain Muscle',
  stay_fit: '❤️ Stay Fit',
  eat_healthy: '🥗 Eat Healthier',
  more_energy: '⚡ Boost Energy',
  reduce_stress: '😌 Reduce Stress',
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly Active',
  moderate: 'Moderately Active',
  active: 'Active',
  very_active: 'Very Active',
};

const DIET_LABELS: Record<string, string> = {
  none: 'No Preference',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  keto: 'Keto',
  paleo: 'Paleo',
  gluten_free: 'Gluten-Free',
};

export default function ProfileScreen({ onClose, onGoalUpdate, themeColors = DEFAULT_THEME }: ProfileScreenProps) {
  const [dailyGoalAchieved, setDailyGoalAchieved] = useState(false);
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(2000);
  const [foodValue, setFoodValue] = useState(0);
  const [exerciseValue, setExerciseValue] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);
  const [editingGoal, setEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(2000);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // ── Edit name state ───────────────────────────────────────────────────────
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // ── Photo state ───────────────────────────────────────────────────────────
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── Activity overview state ──────────────────────────────────────────────
  const [activityData, setActivityData] = useState({
    exerciseFavorites: [] as { exercise_name: string; exercise_category: string }[],
    notes: [] as { title: string; content: string; items: any[] }[],
    recipeFavorites: [] as { recipe_name: string; recipe_category: string }[],
    mealFavorites: [] as { meal_name: string; meal_category: string }[],
    foodFavorites: [] as { food_name: string; food_category: string }[],
    reminders: [] as { name: string; alarmTime: string; isActive: boolean; totalDone: number; repeat?: string }[],
    totalCaloriesLogged: 0,
    goalReachedToday: false,
  });
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    loadGoalStatus();
    loadCachedAvatar(); // load instantly from cache before Supabase responds
    loadProfile();
    loadActivityData();
  }, []);

  // ── Load avatar from AsyncStorage cache (instant on every open) ───────────
  const loadCachedAvatar = async () => {
    try {
      const cached = await AsyncStorage.getItem(AVATAR_CACHE_KEY);
      if (cached) setPhotoUri(cached);
    } catch {}
  };

  // ── Fetch user_profiles row from Supabase ─────────────────────────────────
  const loadProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfile(data as UserProfile);
        // Sync calorie goal from DB to local + dashboard
        if (data.daily_calorie_goal) {
          setDailyCalorieGoal(data.daily_calorie_goal);
          await AsyncStorage.setItem('@dailyCalorieGoal', String(data.daily_calorie_goal));
        }
        // Sync avatar_url from DB — update both state and cache so it persists
        if (data.avatar_url) {
          setPhotoUri(data.avatar_url);
          await AsyncStorage.setItem(AVATAR_CACHE_KEY, data.avatar_url);
        }
      }
    } catch (err: any) {
      console.warn('Profile load error:', err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // ── Load all activity overview data from Supabase + AsyncStorage ────────────
  const loadActivityData = async () => {
    setActivityLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;

      // Helper to build user filter
      const userFilter = (q: any) => userId ? q.eq('user_id', userId) : q.is('user_id', null);

      const [exFavRes, notesRes, recipeFavRes, mealFavRes, foodFavRes, remindersRes] =
        await Promise.all([
          // Exercise favorites
          userFilter(supabase.from('user_favorites_exercise')
            .select('exercise_name, exercise_category')
            .order('created_at', { ascending: false })),
          // Sticky notes
          userId
            ? supabase.from('sticky_notes').select('title, content, items')
                .eq('user_id', userId).order('updated_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          // Recipe favorites
          userFilter(supabase.from('user_favorites_recipes')
            .select('recipe_name, recipe_category')
            .order('created_at', { ascending: false })),
          // Meal favorites
          userFilter(supabase.from('user_favorites_meals')
            .select('meal_name, meal_category')
            .order('created_at', { ascending: false })),
          // Food favorites
          userFilter(supabase.from('user_favorites_foods')
            .select('food_name, food_category')
            .order('created_at', { ascending: false })),
          // Reminders
          userId
            ? supabase.from('user_reminders')
                .select('name, benefits, alarm_time, is_active, total_done, repeat')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [], error: null }),
        ]);

      // AsyncStorage values
      const [food, exercise, goalFlag] = await Promise.all([
        AsyncStorage.getItem('@foodValue'),
        AsyncStorage.getItem('@exerciseValue'),
        AsyncStorage.getItem('@goalReachedToday'),
      ]);

      setActivityData({
        exerciseFavorites: exFavRes.data ?? [],
        notes: notesRes.data ?? [],
        recipeFavorites: recipeFavRes.data ?? [],
        mealFavorites: mealFavRes.data ?? [],
        foodFavorites: foodFavRes.data ?? [],
        reminders: (remindersRes.data ?? []).map((r: any) => ({
          name: r.name ?? 'Habit',
          alarmTime: r.alarm_time ?? '—',
          isActive: r.is_active ?? true,
          totalDone: r.total_done ?? 0,
          repeat: r.repeat ?? '',
        })),
        totalCaloriesLogged: (parseInt(food ?? '0')) + (parseInt(exercise ?? '0')),
        goalReachedToday: goalFlag === 'true',
      });
    } catch (err: any) {
      console.warn('Activity data load error:', err.message);
    } finally {
      setActivityLoading(false);
    }
  };

  // ── Save edited name to Supabase ─────────────────────────────────────────
  const saveName = async () => {
    if (!tempName.trim()) { Alert.alert('Name cannot be empty'); return; }
    setSavingName(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: tempName.trim(), updated_at: new Date().toISOString() })
        .eq('user_id', session.user.id);

      if (error) throw error;
      setProfile(prev => prev ? { ...prev, full_name: tempName.trim() } : prev);
      setEditingName(false);
      Alert.alert('Saved', 'Your name has been updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save name.');
    } finally {
      setSavingName(false);
    }
  };

  // ── Pick photo from gallery with permission request ───────────────────────
  const pickPhoto = async () => {
    // 1. Request gallery permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'FitLife needs access to your photo library to set a profile picture.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Allow', onPress: async () => {
              const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (result.status === 'granted') pickPhoto();
            }
          },
        ]
      );
      return;
    }

    // 2. Launch picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri;
    setPhotoUri(uri);
    setUploadingPhoto(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('Not authenticated');

      // 3. Upload to Supabase Storage
      const ext = uri.split('.').pop() ?? 'jpg';
      const fileName = `avatar_${session.user.id}_${Date.now()}.${ext}`;
      const filePath = `avatars/${fileName}`;

      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

      if (uploadError) throw uploadError;

      // 4. Get public URL + save to user_profiles
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('user_id', session.user.id);

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev);
      // Persist URL to AsyncStorage so avatar survives screen close/reopen
      await AsyncStorage.setItem(AVATAR_CACHE_KEY, publicUrl);
    } catch (err: any) {
      console.warn('Photo upload error:', err.message);
      // Keep local preview even if upload fails — also cache local URI as fallback
      if (uri) {
        await AsyncStorage.setItem(AVATAR_CACHE_KEY, uri).catch(() => {});
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const loadGoalStatus = async () => {
    try {
      const achieved = await AsyncStorage.getItem('@goalReachedToday');
      const goal = await AsyncStorage.getItem('@dailyCalorieGoal');
      const food = await AsyncStorage.getItem('@foodValue');
      const exercise = await AsyncStorage.getItem('@exerciseValue');

      setDailyGoalAchieved(achieved === 'true');
      if (goal) setDailyCalorieGoal(parseInt(goal));
      if (food) setFoodValue(parseInt(food));
      if (exercise) setExerciseValue(parseInt(exercise));
      setTotalProgress((parseInt(food || '0') + parseInt(exercise || '0')));
    } catch (error) {
      console.log('Error loading goal status:', error);
    }
  };

  const lineData = [
    { value: 0, label: 'Mon' },
    { value: 0, label: 'Tue' },
    { value: 0, label: 'Wed' },
    { value: 0, label: 'Thu' },
    { value: 0, label: 'Fri' },
    { value: 0, label: 'Sat' },
    { value: 0, label: 'Sun' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
    <View style={[styles.header1, { backgroundColor: themeColors.background }]}>

    </View>
      <View style={[styles.header, { backgroundColor: themeColors.secondary, borderBottomColor: themeColors.primary + "44" }]}>
        <Text style={[styles.title, { color: themeColors.text }]}>Profile</Text>
        <Pressable onPress={onClose}>
          <Icon style={[styles.closeIcon, { color: themeColors.text }]} name="times-circle" />
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info Section */}
        <View style={styles.userInfoSection}>

          {/* Profile photo / avatar — tap to change */}
          <Pressable style={styles.avatarWrapper} onPress={pickPhoto}>
            {uploadingPhoto ? (
              <View style={styles.avatarCircle}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : (photoUri || profile?.avatar_url) ? (
              <Image
                source={{ uri: photoUri ?? profile?.avatar_url ?? undefined }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {profile?.full_name
                    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                    : '?'}
                </Text>
              </View>
            )}
            {/* Camera badge */}
            <View style={styles.cameraBadge}>
              <Icon name="camera" size={12} color="#fff" />
            </View>
          </Pressable>

          {/* Editable name */}
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameInput}
                value={tempName}
                onChangeText={setTempName}
                autoFocus
                placeholder="Your name"
                placeholderTextColor="#666"
                onSubmitEditing={saveName}
              />
              <Pressable style={styles.nameEditSave} onPress={saveName} disabled={savingName}>
                {savingName
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Icon name="check" size={14} color="#fff" />}
              </Pressable>
              <Pressable style={styles.nameEditCancel} onPress={() => setEditingName(false)}>
                <Icon name="times" size={14} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.nameRow}
              onPress={() => { setTempName(profile?.full_name ?? ''); setEditingName(true); }}
            >
              <Text style={styles.userName}>
                {profileLoading ? 'Loading...' : (profile?.full_name ?? 'Tap to set name')}
              </Text>
              <Icon name="pencil" size={14} color="#c67ee2" style={styles.nameEditIcon} />
            </Pressable>
          )}

          <Text style={styles.userEmail}>{profile?.email ?? ''}</Text>
          {profile?.gender || profile?.age ? (
            <Text style={styles.userMeta}>
              {[profile?.gender && (profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)),
                profile?.age && `${profile.age} yrs`].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </View>

        {/* Profile Details Card */}
        {profile && (
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>My Profile</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Icon5 name="ruler-vertical" size={16} color="#c67ee2" />
                <Text style={styles.infoLabel}>Height</Text>
                <Text style={styles.infoValue}>
                  {profile.height_cm ? `${profile.height_cm} cm` : '—'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Icon5 name="weight" size={16} color="#c67ee2" />
                <Text style={styles.infoLabel}>Weight</Text>
                <Text style={styles.infoValue}>
                  {profile.weight_kg ? `${profile.weight_kg} kg` : '—'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Icon5 name="bullseye" size={16} color="#4CAF50" />
                <Text style={styles.infoLabel}>Target</Text>
                <Text style={styles.infoValue}>
                  {profile.target_weight_kg ? `${profile.target_weight_kg} kg` : '—'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Icon5 name="running" size={16} color="#F3AF41" />
                <Text style={styles.infoLabel}>Activity</Text>
                <Text style={styles.infoValue}>
                  {profile.activity_level ? ACTIVITY_LABELS[profile.activity_level] ?? profile.activity_level : '—'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Icon5 name="utensils" size={16} color="#84d7f4" />
                <Text style={styles.infoLabel}>Diet</Text>
                <Text style={styles.infoValue}>
                  {profile.diet_preference ? DIET_LABELS[profile.diet_preference] ?? profile.diet_preference : '—'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Icon5 name="tint" size={16} color="#2196F3" />
                <Text style={styles.infoLabel}>Water</Text>
                <Text style={styles.infoValue}>
                  {profile.water_goal_l ? `${profile.water_goal_l} L/day` : '—'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Goals from onboarding */}
        {profile?.goals && profile.goals.length > 0 && (
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>My Goals</Text>
            <View style={styles.goalsWrap}>
              {profile.goals.map((g: string) => (
                <View key={g} style={styles.goalChip}>
                  <Text style={styles.goalChipText}>{GOAL_LABELS[g] ?? g}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Weight Progress */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>Weight Progress</Text>
          <View style={styles.weightInfo}>
            <View style={styles.weightItem}>
              <Text style={styles.weightLabel}>Current</Text>
              <Text style={styles.weightValue}>
                {profile?.weight_kg ? `${profile.weight_kg} kg` : '—'}
              </Text>
            </View>
            <View style={styles.weightItem}>
              <Text style={styles.weightLabel}>Target</Text>
              <Text style={styles.weightValue}>
                {profile?.target_weight_kg ? `${profile.target_weight_kg} kg` : '—'}
              </Text>
            </View>
            <View style={styles.weightItem}>
              <Text style={styles.weightLabel}>To Go</Text>
              <Text style={styles.weightValue}>
                {profile?.weight_kg && profile?.target_weight_kg
                  ? `${Math.abs(profile.weight_kg - profile.target_weight_kg).toFixed(1)} kg`
                  : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Weekly Progress Line Graph */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>Weekly Weight Progress</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={lineData}
              width={280}
              height={150}
              spacing={40}
              color="#c67ee2"
              thickness={3}
              dataPointsColor="#c67ee2"
              dataPointsRadius={5}
              xAxisColor="#666666"
              yAxisColor="#666666"
              xAxisLabelTextStyle={{ color: "#CCCCCC", fontSize: 12 }}
              yAxisTextStyle={{ color: "#CCCCCC", fontSize: 12 }}
              noOfSections={4}
              maxValue={180}
            />
          </View>
        </View>

        {/* Daily Targets from user_profiles */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <Text style={styles.sectionTitles}>Daily Targets</Text>
          <View style={styles.stepsContainer}>
            <Image source={require("../assets/images/fs.png")} style={styles.stepsIcon} />
            <View style={styles.stepsMain}>
              <Text style={styles.stepsValue}>
                {(profile?.daily_steps_goal ?? 8000).toLocaleString()}
              </Text>
              <Text style={styles.stepsLabel}>steps goal</Text>
            </View>
            <Image source={require("../assets/images/kcal.png")} style={styles.stepsIcon} />
            <View style={styles.caloriesBurned}>
              <Text style={styles.caloriesValue}>
                {(profile?.daily_calorie_goal ?? 2000)} kcal
              </Text>
              <Text style={styles.caloriesLabel}>Calorie Goal</Text>
            </View>
          </View>
        </View>

        {/* ── Activity Overview ─────────────────────────────────────────── */}

        {/* Daily Progress Summary */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>📊 Today's Progress</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressCard}>
              <Icon5 name="fire" size={20} color="#F3AF41" />
              <Text style={styles.progressNum}>{activityData.totalCaloriesLogged}</Text>
              <Text style={styles.progressLbl}>kcal logged</Text>
            </View>
            <View style={styles.progressCard}>
              <Icon5 name="bullseye" size={20} color="#c67ee2" />
              <Text style={styles.progressNum}>{profile?.daily_calorie_goal ?? 2000}</Text>
              <Text style={styles.progressLbl}>kcal goal</Text>
            </View>
            <View style={styles.progressCard}>
              <Icon name={activityData.goalReachedToday ? 'check-circle' : 'circle-o'} size={20}
                color={activityData.goalReachedToday ? '#4CAF50' : '#666'} />
              <Text style={[styles.progressNum, { color: activityData.goalReachedToday ? '#4CAF50' : '#888' }]}>
                {activityData.goalReachedToday ? 'Done!' : 'In progress'}
              </Text>
              <Text style={styles.progressLbl}>daily goal</Text>
            </View>
          </View>

          {/* Calorie progress bar */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, {
              width: `${Math.min((activityData.totalCaloriesLogged / (profile?.daily_calorie_goal ?? 2000)) * 100, 100)}%`
            }]} />
          </View>
          <Text style={styles.progressBarLabel}>
            {Math.round((activityData.totalCaloriesLogged / (profile?.daily_calorie_goal ?? 2000)) * 100)}% of daily goal
          </Text>
        </View>

        {/* Exercise Favorites */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>🏋️ Exercise Favorites</Text>
            <Text style={styles.sectionCount}>{activityData.exerciseFavorites.length}</Text>
          </View>
          {activityLoading ? <ActivityIndicator color="#c67ee2" style={{ marginVertical: 10 }} /> :
           activityData.exerciseFavorites.length === 0 ? (
            <Text style={styles.emptyHint}>No exercise favorites yet. Heart an exercise to save it.</Text>
          ) : (
            <View style={styles.tagWrap}>
              {activityData.exerciseFavorites.slice(0, 8).map((ex, i) => (
                <View key={i} style={[styles.activityTag, { backgroundColor: 'rgba(243,175,65,0.15)', borderColor: 'rgba(243,175,65,0.3)' }]}>
                  <Icon5 name="dumbbell" size={11} color="#F3AF41" />
                  <Text style={[styles.activityTagText, { color: '#F3AF41' }]}>{ex.exercise_name ?? '—'}</Text>
                </View>
              ))}
              {activityData.exerciseFavorites.length > 8 && (
                <Text style={styles.moreText}>+{activityData.exerciseFavorites.length - 8} more</Text>
              )}
            </View>
          )}
        </View>

        {/* Notes & Lists */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>📝 Notes & Lists</Text>
            <Text style={styles.sectionCount}>{activityData.notes.length}</Text>
          </View>
          {activityLoading ? <ActivityIndicator color="#c67ee2" style={{ marginVertical: 10 }} /> :
           activityData.notes.length === 0 ? (
            <Text style={styles.emptyHint}>No notes saved yet. Create one from the dashboard.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {activityData.notes.slice(0, 4).map((note, i) => (
                <View key={i} style={styles.noteRow}>
                  <Icon5 name={note.items?.length > 0 && !note.content ? 'list' : 'sticky-note'} size={13} color="#c67ee2" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.noteTitle} numberOfLines={1}>{note.title}</Text>
                    {note.content ? (
                      <Text style={styles.notePreview} numberOfLines={1}>{note.content}</Text>
                    ) : note.items?.length > 0 ? (
                      <Text style={styles.notePreview}>{note.items.length} list item{note.items.length !== 1 ? 's' : ''}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
              {activityData.notes.length > 4 && (
                <Text style={styles.moreText}>+{activityData.notes.length - 4} more notes</Text>
              )}
            </View>
          )}
        </View>

        {/* Favorite Recipes, Meals & Foods */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>❤️ Saved Favorites</Text>
            <Text style={styles.sectionCount}>
              {activityData.recipeFavorites.length + activityData.mealFavorites.length + activityData.foodFavorites.length}
            </Text>
          </View>
          {activityLoading ? <ActivityIndicator color="#c67ee2" style={{ marginVertical: 10 }} /> : (
            <View style={{ gap: 12 }}>
              {/* Recipes */}
              {activityData.recipeFavorites.length > 0 && (
                <View>
                  <Text style={styles.favSubLabel}>Recipes</Text>
                  <View style={styles.tagWrap}>
                    {activityData.recipeFavorites.slice(0, 5).map((r, i) => (
                      <View key={i} style={[styles.activityTag, { backgroundColor: 'rgba(198,126,226,0.12)', borderColor: 'rgba(198,126,226,0.3)' }]}>
                        <Icon5 name="book-open" size={11} color="#c67ee2" />
                        <Text style={[styles.activityTagText, { color: '#c67ee2' }]}>{r.recipe_name ?? '—'}</Text>
                      </View>
                    ))}
                    {activityData.recipeFavorites.length > 5 && <Text style={styles.moreText}>+{activityData.recipeFavorites.length - 5} more</Text>}
                  </View>
                </View>
              )}
              {/* Meals */}
              {activityData.mealFavorites.length > 0 && (
                <View>
                  <Text style={styles.favSubLabel}>Meals</Text>
                  <View style={styles.tagWrap}>
                    {activityData.mealFavorites.slice(0, 5).map((m, i) => (
                      <View key={i} style={[styles.activityTag, { backgroundColor: 'rgba(132,215,244,0.12)', borderColor: 'rgba(132,215,244,0.3)' }]}>
                        <Icon5 name="utensils" size={11} color="#84d7f4" />
                        <Text style={[styles.activityTagText, { color: '#84d7f4' }]}>{m.meal_name ?? '—'}</Text>
                      </View>
                    ))}
                    {activityData.mealFavorites.length > 5 && <Text style={styles.moreText}>+{activityData.mealFavorites.length - 5} more</Text>}
                  </View>
                </View>
              )}
              {/* Foods */}
              {activityData.foodFavorites.length > 0 && (
                <View>
                  <Text style={styles.favSubLabel}>Foods</Text>
                  <View style={styles.tagWrap}>
                    {activityData.foodFavorites.slice(0, 5).map((f, i) => (
                      <View key={i} style={[styles.activityTag, { backgroundColor: 'rgba(76,175,80,0.12)', borderColor: 'rgba(76,175,80,0.3)' }]}>
                        <Icon5 name="apple-alt" size={11} color="#4CAF50" />
                        <Text style={[styles.activityTagText, { color: '#4CAF50' }]}>{f.food_name ?? '—'}</Text>
                      </View>
                    ))}
                    {activityData.foodFavorites.length > 5 && <Text style={styles.moreText}>+{activityData.foodFavorites.length - 5} more</Text>}
                  </View>
                </View>
              )}
              {activityData.recipeFavorites.length === 0 && activityData.mealFavorites.length === 0 && activityData.foodFavorites.length === 0 && (
                <Text style={styles.emptyHint}>No favorites saved yet. Heart recipes, meals or foods.</Text>
              )}
            </View>
          )}
        </View>

        {/* Habits & Reminders */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>🔔 Habits & Reminders</Text>
            <Text style={styles.sectionCount}>{activityData.reminders.length}</Text>
          </View>
          {activityLoading ? <ActivityIndicator color="#c67ee2" style={{ marginVertical: 10 }} /> :
           activityData.reminders.length === 0 ? (
            <Text style={styles.emptyHint}>No habits set yet. Add one from Reminders.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {activityData.reminders.slice(0, 5).map((r, i) => (
                <View key={i} style={styles.reminderRow}>
                  <View style={[styles.reminderDot, { backgroundColor: r.isActive ? '#4CAF50' : '#555' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reminderName}>{r.name}</Text>
                    <Text style={styles.reminderMeta}>{r.alarmTime}{r.repeat ? ` · ${r.repeat}` : ''} · {r.totalDone ?? 0}× completed</Text>
                  </View>
                  <View style={[styles.reminderBadge, { backgroundColor: r.isActive ? 'rgba(76,175,80,0.15)' : 'rgba(100,100,100,0.15)' }]}>
                    <Text style={[styles.reminderBadgeText, { color: r.isActive ? '#4CAF50' : '#888' }]}>
                      {r.isActive ? 'Active' : 'Paused'}
                    </Text>
                  </View>
                </View>
              ))}
              {activityData.reminders.length > 5 && (
                <Text style={styles.moreText}>+{activityData.reminders.length - 5} more habits</Text>
              )}
            </View>
          )}
        </View>

        {/* Daily Goal Status */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>Daily Goal Status</Text>
          <View style={styles.goalStatus}>
            <Icon 
              style={[styles.goalIcon, dailyGoalAchieved && styles.goalIconAchieved]} 
              name={dailyGoalAchieved ? "check-circle" : "times-circle"} 
            />
            <Text style={styles.goalText}>
              {dailyGoalAchieved ? "✅ Goal Reached Today!" : "🎯 Keep going!"}
            </Text>
            {editingGoal ? (
              <View style={styles.goalInputRow}>
                <TextInput
                  style={styles.goalInput}
                  value={tempGoal.toString()}
                  onChangeText={(text) => setTempGoal(parseInt(text) || 2000)}
                  keyboardType="numeric"
                />
                <Text style={styles.goalUnit}>kcal</Text>
              </View>
            ) : (
              <Text style={styles.goalSubText}>
                Current Goal: {dailyCalorieGoal} kcal | Progress: {totalProgress} kcal
              </Text>
            )}
            <View style={styles.goalButtons}>
              {editingGoal ? (
                <>
                  <Pressable style={styles.saveButton} onPress={async () => {
                    try {
                      await AsyncStorage.setItem('@dailyCalorieGoal', tempGoal.toString());
                      setDailyCalorieGoal(tempGoal);
                      setEditingGoal(false);
                      onGoalUpdate?.(tempGoal);
                      Alert.alert('Success', 'Daily goal updated!');
                    } catch (error) {
                      console.log('Error saving goal:', error);
                      Alert.alert('Error', 'Failed to save goal');
                    }
                  }}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </Pressable>
                  <Pressable style={styles.cancelButton} onPress={() => {
                    setEditingGoal(false);
                    setTempGoal(dailyCalorieGoal);
                  }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable style={styles.editGoalButton} onPress={() => {
                  setEditingGoal(true);
                  setTempGoal(dailyCalorieGoal);
                }}>
                  <Text style={styles.editGoalText}>Edit Goal</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 10,
    fontStyle: 'italic',
  },
  goalSubText: {
    fontSize: 14,
    color: '#CCCCCC',
    textAlign: 'center',
    marginTop: 5,
  },
  goalInputRow: {
    marginTop: 10,
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    fontSize: 20,
    width: 100,
    textAlign: 'center',
    marginRight: 10,
  },
  goalUnit: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  goalButtons: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#666',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  editGoalButton: {
    backgroundColor: '#c67ee2',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  editGoalText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  // ── New profile styles ──────────────────────────────────────────────────────
  avatarWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#c67ee2', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#362c3a',
  },
  avatarImage: {
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 3, borderColor: '#c67ee2',
  },
  avatarText: {
    fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 1,
  },
  cameraBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#c67ee2', borderWidth: 2, borderColor: '#15041f',
    justifyContent: 'center', alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
  },
  nameEditIcon: {
    marginTop: 2,
  },
  nameEditRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 4, marginTop: 2,
  },
  nameInput: {
    backgroundColor: '#211c24', color: '#fff', fontSize: 18, fontWeight: '700',
    borderBottomWidth: 2, borderBottomColor: '#c67ee2',
    paddingHorizontal: 10, paddingVertical: 4, minWidth: 160,
    borderRadius: 8,
  },
  nameEditSave: {
    backgroundColor: '#4CAF50', width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  nameEditCancel: {
    backgroundColor: '#666', width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  userEmail: {
    fontSize: 13, color: '#888', marginBottom: 4,
  },
  userMeta: {
    fontSize: 14, color: '#aaa', marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  infoItem: {
    width: '30%', backgroundColor: '#2a2335', borderRadius: 10,
    padding: 10, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#362c3a',
  },
  infoLabel: {
    fontSize: 11, color: '#888', fontWeight: '600',
  },
  infoValue: {
    fontSize: 13, color: '#fff', fontWeight: '700', textAlign: 'center',
  },
  goalsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  goalChip: {
    backgroundColor: 'rgba(198,126,226,0.15)', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(198,126,226,0.3)',
  },
  goalChipText: {
    fontSize: 13, color: '#c67ee2', fontWeight: '600',
  },
  // ────────────────────────────────────────────────────────────────────────────
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
  content: {
    flex: 1,
    padding: 15,
    marginBottom: 25,
  },
  userInfoSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  userCountry: {
    fontSize: 16,
    color: "#CCCCCC",
  },
  section: {
    backgroundColor: "#211c24",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#c67ee2",
    marginBottom: 15,
  },
  weightInfo: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  weightItem: {
    alignItems: "center",
  },
  weightLabel: {
    fontSize: 14,
    color: "#CCCCCC",
    marginBottom: 5,
  },
  weightValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  chartContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  sectionTitles: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#c67ee2",
    marginBottom: 15,
  },
  stepsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepsMain: {
    position: "relative",
    alignItems: "center",
  },
  stepsIcon: {
    position: "relative",
    width: 70,
    height: 60,
  },
  stepsValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#c67ee2",
  },
  stepsLabel: {
    fontSize: 14,
    color: "#CCCCCC",
  },
  caloriesBurned: {
    top: 3,
    alignItems: "center",
  },
  caloriesLabel: {
    fontSize: 14,
    color: "#CCCCCC",
    marginBottom: 5,
  },
  caloriesValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fc9139",
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryItem: {
    width: "30%",
    backgroundColor: "#313031",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  categoryIcon: {
    fontSize: 24,
    color: "#c67ee2",
    marginBottom: 5,
  },
  categoryLabel: {
    fontSize: 12,
    color: "#CCCCCC",
    textAlign: "center",
    marginBottom: 3,
  },
  categoryValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  exerciseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#362c3a",
  },
  exerciseLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exerciseIcon: {
    fontSize: 25,
    color: "#fcd2c7",
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  exerciseDuration: {
    fontSize: 14,
    color: "#CCCCCC",
  },
  exerciseCalories: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fc9139",
  },
  goalStatus: {
    alignItems: "center",
    justifyContent: "center",
  },
  goalIcon: {
    fontSize: 30,
    color: "#FF6B6B",
  },
  goalIconAchieved: {
    color: "#4CAF50",
  },
  goalText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  habitItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#362c3a",
  },
  habitLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  habitIcon: {
    fontSize: 20,
    color: "#F3AF41",
  },
  habitName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  habitDate: {
    fontSize: 14,
    color: "#CCCCCC",
  },
  habitRight: {
    alignItems: "flex-end",
  },
  habitAlarm: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#c67ee2",
  },

  // ── Activity overview styles ─────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionCount: {
    fontSize: 13, color: '#888', fontWeight: '600',
    backgroundColor: '#2a2335', paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 10,
  },
  progressRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14,
  },
  progressCard: {
    flex: 1, alignItems: 'center', backgroundColor: '#2a2335',
    borderRadius: 12, padding: 12, marginHorizontal: 3, gap: 4,
    borderWidth: 1, borderColor: '#362c3a',
  },
  progressNum: {
    fontSize: 16, fontWeight: '800', color: '#fff',
  },
  progressLbl: {
    fontSize: 10, color: '#888', fontWeight: '600', textAlign: 'center',
  },
  progressBarBg: {
    height: 8, backgroundColor: '#2a2335', borderRadius: 4,
    overflow: 'hidden', marginBottom: 4,
  },
  progressBarFill: {
    height: 8, backgroundColor: '#c67ee2', borderRadius: 4,
  },
  progressBarLabel: {
    fontSize: 11, color: '#888', textAlign: 'right',
  },
  tagWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  activityTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  activityTagText: {
    fontSize: 12, fontWeight: '600',
  },
  moreText: {
    fontSize: 12, color: '#666', fontStyle: 'italic',
    alignSelf: 'center', paddingVertical: 2,
  },
  noteRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#2a2335', borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: '#362c3a',
  },
  noteTitle: {
    fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2,
  },
  notePreview: {
    fontSize: 12, color: '#888',
  },
  favSubLabel: {
    fontSize: 12, fontWeight: '700', color: '#aaa',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  reminderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#2a2335', borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: '#362c3a',
  },
  reminderDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  reminderName: {
    fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2,
  },
  reminderMeta: {
    fontSize: 11, color: '#888',
  },
  reminderBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  reminderBadgeText: {
    fontSize: 11, fontWeight: '700',
  },
});