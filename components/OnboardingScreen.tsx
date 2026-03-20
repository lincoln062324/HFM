import React, { useState, useRef } from 'react';
import {
  StyleSheet, Text, View, Pressable, TextInput,
  ScrollView, Animated, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import supabase from '../lib/supabase';

interface OnboardingScreenProps {
  onComplete: () => void;
  userId: string;
  email: string;
}

// ─── Step data ────────────────────────────────────────────────────────────────
const GOAL_OPTIONS = [
  { id: 'lose_weight',    label: 'Lose Weight',       icon: 'arrow-down',       color: '#4CAF50' },
  { id: 'gain_muscle',    label: 'Gain Muscle',        icon: 'arrow-up',         color: '#2196F3' },
  { id: 'stay_fit',       label: 'Stay Fit',           icon: 'heartbeat',        color: '#c67ee2' },
  { id: 'eat_healthy',    label: 'Eat Healthier',      icon: 'apple-alt',        color: '#FF9800' },
  { id: 'more_energy',    label: 'Boost Energy',       icon: 'bolt',             color: '#F3AF41' },
  { id: 'reduce_stress',  label: 'Reduce Stress',      icon: 'smile',            color: '#00BCD4' },
];

const ACTIVITY_LEVELS = [
  { id: 'sedentary',   label: 'Sedentary',     desc: 'Little or no exercise',        icon: 'couch' },
  { id: 'light',       label: 'Light',         desc: '1–3 days/week',                icon: 'walking' },
  { id: 'moderate',    label: 'Moderate',      desc: '3–5 days/week',                icon: 'running' },
  { id: 'active',      label: 'Active',        desc: '6–7 days/week',                icon: 'dumbbell' },
  { id: 'very_active', label: 'Very Active',   desc: 'Twice a day / hard training',  icon: 'fire' },
];

const DIET_PREFERENCES = [
  { id: 'none',        label: 'No Preference',  icon: 'utensils' },
  { id: 'vegetarian',  label: 'Vegetarian',     icon: 'leaf' },
  { id: 'vegan',       label: 'Vegan',          icon: 'seedling' },
  { id: 'keto',        label: 'Keto',           icon: 'bacon' },
  { id: 'paleo',       label: 'Paleo',          icon: 'drumstick-bite' },
  { id: 'gluten_free', label: 'Gluten-Free',    icon: 'bread-slice' },
];

const STEPS = [
  { title: 'Your Goals',         subtitle: 'What do you want to achieve?',       key: 'goals' },
  { title: 'Body Measurements',  subtitle: 'Help us personalise your plan',       key: 'body' },
  { title: 'Activity Level',     subtitle: 'How active are you currently?',       key: 'activity' },
  { title: 'Diet Preference',    subtitle: 'Any dietary restrictions?',           key: 'diet' },
  { title: 'Daily Targets',      subtitle: 'Set your starting calorie goals',     key: 'targets' },
];

export default function OnboardingScreen({ onComplete, userId, email }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Form state
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [dietPreference, setDietPreference] = useState('');
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState('2000');
  const [dailyStepsGoal, setDailyStepsGoal] = useState('8000');
  const [waterGoalL, setWaterGoalL] = useState('2');

  const animateNext = (direction: 'forward' | 'back') => {
    const from = direction === 'forward' ? 60 : -60;
    slideAnim.setValue(from);
    Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }).start();
  };

  const goNext = () => {
    if (!validateStep()) return;
    animateNext('forward');
    setStep(s => s + 1);
  };

  const goBack = () => {
    animateNext('back');
    setStep(s => s - 1);
  };

  const toggleGoal = (id: string) => {
    setSelectedGoals(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const validateStep = (): boolean => {
    switch (STEPS[step].key) {
      case 'goals':
        if (selectedGoals.length === 0) { Alert.alert('Select at least one goal'); return false; }
        break;
      case 'body':
        if (!age || !gender || !heightCm || !weightKg) {
          Alert.alert('Please fill in all body measurements'); return false;
        }
        break;
      case 'activity':
        if (!activityLevel) { Alert.alert('Please select your activity level'); return false; }
        break;
    }
    return true;
  };

  // ── Save to Supabase ─────────────────────────────────────────────────────────
  const handleFinish = async () => {
    if (!validateStep()) return;
    if (!userId) {
      Alert.alert('Save Failed', 'User ID missing. Please go back and sign in again.');
      return;
    }
    setSaving(true);
    try {
      // userId and email are passed directly as props from AppEntry —
      // no session fetch needed, works immediately after registration
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          email: email,
          goals: selectedGoals,
          age: parseInt(age) || null,
          gender: gender || null,
          height_cm: parseFloat(heightCm) || null,
          weight_kg: parseFloat(weightKg) || null,
          target_weight_kg: parseFloat(targetWeightKg) || null,
          activity_level: activityLevel || null,
          diet_preference: dietPreference || null,
          daily_calorie_goal: parseInt(dailyCalorieGoal) || 2000,
          daily_steps_goal: parseInt(dailyStepsGoal) || 8000,
          water_goal_l: parseFloat(waterGoalL) || 2,
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Persist calorie goal locally for dashboard
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem('@dailyCalorieGoal', dailyCalorieGoal);

      onComplete();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Step renders ─────────────────────────────────────────────────────────────
  const renderGoals = () => (
    <View style={styles.optionsGrid}>
      {GOAL_OPTIONS.map(g => (
        <Pressable
          key={g.id}
          style={[styles.goalCard, selectedGoals.includes(g.id) && styles.goalCardActive]}
          onPress={() => toggleGoal(g.id)}
        >
          <View style={[styles.goalIcon, { backgroundColor: selectedGoals.includes(g.id) ? g.color : '#211c24' }]}>
            <Icon5 name={g.icon} size={20} color={selectedGoals.includes(g.id) ? '#fff' : '#888'} />
          </View>
          <Text style={[styles.goalLabel, selectedGoals.includes(g.id) && styles.goalLabelActive]}>
            {g.label}
          </Text>
          {selectedGoals.includes(g.id) && (
            <View style={styles.checkMark}>
              <Icon name="check" size={10} color="#fff" />
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );

  const renderBody = () => (
    <View style={styles.bodyForm}>
      {/* Gender */}
      <Text style={styles.fieldLabel}>Gender</Text>
      <View style={styles.genderRow}>
        {(['male', 'female', 'other'] as const).map(g => (
          <Pressable
            key={g}
            style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
            onPress={() => setGender(g)}
          >
            <Icon5
              name={g === 'male' ? 'mars' : g === 'female' ? 'venus' : 'genderless'}
              size={18}
              color={gender === g ? '#fff' : '#888'}
            />
            <Text style={[styles.genderLabel, gender === g && styles.genderLabelActive]}>
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Age */}
      <Text style={styles.fieldLabel}>Age</Text>
      <View style={styles.inputRow}>
        <Icon5 name="calendar-alt" size={14} color="#888" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="Years"
          placeholderTextColor="#555"
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          maxLength={3}
        />
        <Text style={styles.inputUnit}>yrs</Text>
      </View>

      {/* Height */}
      <Text style={styles.fieldLabel}>Height</Text>
      <View style={styles.inputRow}>
        <Icon5 name="ruler-vertical" size={14} color="#888" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="e.g. 170"
          placeholderTextColor="#555"
          value={heightCm}
          onChangeText={setHeightCm}
          keyboardType="decimal-pad"
          maxLength={5}
        />
        <Text style={styles.inputUnit}>cm</Text>
      </View>

      {/* Current weight */}
      <Text style={styles.fieldLabel}>Current Weight</Text>
      <View style={styles.inputRow}>
        <Icon5 name="weight" size={14} color="#888" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="e.g. 70"
          placeholderTextColor="#555"
          value={weightKg}
          onChangeText={setWeightKg}
          keyboardType="decimal-pad"
          maxLength={5}
        />
        <Text style={styles.inputUnit}>kg</Text>
      </View>

      {/* Target weight */}
      <Text style={styles.fieldLabel}>Target Weight <Text style={styles.optionalText}>(optional)</Text></Text>
      <View style={styles.inputRow}>
        <Icon5 name="bullseye" size={14} color="#888" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="e.g. 65"
          placeholderTextColor="#555"
          value={targetWeightKg}
          onChangeText={setTargetWeightKg}
          keyboardType="decimal-pad"
          maxLength={5}
        />
        <Text style={styles.inputUnit}>kg</Text>
      </View>
    </View>
  );

  const renderActivity = () => (
    <View style={styles.activityList}>
      {ACTIVITY_LEVELS.map(a => (
        <Pressable
          key={a.id}
          style={[styles.activityCard, activityLevel === a.id && styles.activityCardActive]}
          onPress={() => setActivityLevel(a.id)}
        >
          <View style={[styles.activityIcon, activityLevel === a.id && styles.activityIconActive]}>
            <Icon5 name={a.icon} size={18} color={activityLevel === a.id ? '#fff' : '#888'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.activityLabel, activityLevel === a.id && styles.activityLabelActive]}>
              {a.label}
            </Text>
            <Text style={styles.activityDesc}>{a.desc}</Text>
          </View>
          {activityLevel === a.id && <Icon name="check-circle" size={20} color="#c67ee2" />}
        </Pressable>
      ))}
    </View>
  );

  const renderDiet = () => (
    <View style={styles.optionsGrid}>
      {DIET_PREFERENCES.map(d => (
        <Pressable
          key={d.id}
          style={[styles.goalCard, dietPreference === d.id && styles.goalCardActive]}
          onPress={() => setDietPreference(d.id)}
        >
          <View style={[styles.goalIcon, dietPreference === d.id && { backgroundColor: '#c67ee2' }]}>
            <Icon5 name={d.icon} size={20} color={dietPreference === d.id ? '#fff' : '#888'} />
          </View>
          <Text style={[styles.goalLabel, dietPreference === d.id && styles.goalLabelActive]}>
            {d.label}
          </Text>
          {dietPreference === d.id && (
            <View style={styles.checkMark}><Icon name="check" size={10} color="#fff" /></View>
          )}
        </Pressable>
      ))}
    </View>
  );

  const renderTargets = () => (
    <View style={styles.bodyForm}>
      <View style={styles.targetNote}>
        <Icon5 name="info-circle" size={14} color="#c67ee2" />
        <Text style={styles.targetNoteText}>You can adjust these anytime in Settings.</Text>
      </View>

      <Text style={styles.fieldLabel}>Daily Calorie Goal</Text>
      <View style={styles.inputRow}>
        <Icon name="fire" size={14} color="#F3AF41" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          value={dailyCalorieGoal}
          onChangeText={setDailyCalorieGoal}
          keyboardType="number-pad"
          maxLength={5}
        />
        <Text style={styles.inputUnit}>kcal</Text>
      </View>

      <Text style={styles.fieldLabel}>Daily Steps Goal</Text>
      <View style={styles.inputRow}>
        <Icon5 name="shoe-prints" size={12} color="#84d7f4" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          value={dailyStepsGoal}
          onChangeText={setDailyStepsGoal}
          keyboardType="number-pad"
          maxLength={6}
        />
        <Text style={styles.inputUnit}>steps</Text>
      </View>

      <Text style={styles.fieldLabel}>Daily Water Goal</Text>
      <View style={styles.inputRow}>
        <Icon5 name="tint" size={16} color="#2196F3" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          value={waterGoalL}
          onChangeText={setWaterGoalL}
          keyboardType="decimal-pad"
          maxLength={3}
        />
        <Text style={styles.inputUnit}>litres</Text>
      </View>
    </View>
  );

  const stepContent = [renderGoals, renderBody, renderActivity, renderDiet, renderTargets];

  // ── Main render ──────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]}
          />
        </View>
        <Text style={styles.progressText}>{step + 1} / {STEPS.length}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          {/* Step header */}
          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>{STEPS[step].title}</Text>
            <Text style={styles.stepSubtitle}>{STEPS[step].subtitle}</Text>
          </View>

          {/* Step content */}
          {stepContent[step]()}
        </Animated.View>
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        {step > 0 ? (
          <Pressable style={styles.backNavBtn} onPress={goBack}>
            <Icon name="arrow-left" size={16} color="#888" />
          </Pressable>
        ) : (
          <View style={{ width: 48 }} />
        )}

        {step < STEPS.length - 1 ? (
          <Pressable style={styles.nextBtn} onPress={goNext}>
            <Text style={styles.nextBtnText}>Next</Text>
            <Icon name="arrow-right" size={14} color="#fff" />
          </Pressable>
        ) : (
          <Pressable
            style={[styles.nextBtn, styles.finishBtn, saving && { opacity: 0.5 }]}
            onPress={handleFinish}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon5 name="check-double" size={14} color="#fff" />
                <Text style={styles.nextBtnText}>Start My Journey!</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#15041f' },
  scroll: { padding: 22, paddingBottom: 30 },

  progressContainer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22,
    paddingTop: 55, paddingBottom: 10, gap: 12,
  },
  progressTrack: { flex: 1, height: 6, backgroundColor: '#211c24', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#c67ee2', borderRadius: 3 },
  progressText: { fontSize: 13, color: '#888', fontWeight: '600', minWidth: 40, textAlign: 'right' },

  stepHeader: { marginBottom: 24 },
  stepTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 6 },
  stepSubtitle: { fontSize: 15, color: '#888' },

  // Goals grid
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  goalCard: {
    width: '47%', backgroundColor: '#1e1929', borderRadius: 16,
    padding: 16, alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#362c3a', position: 'relative',
  },
  goalCardActive: { borderColor: '#c67ee2', backgroundColor: '#2d1f3a' },
  goalIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#211c24' },
  goalLabel: { fontSize: 13, fontWeight: '600', color: '#888', textAlign: 'center' },
  goalLabelActive: { color: '#fff' },
  checkMark: {
    position: 'absolute', top: 8, right: 8,
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#c67ee2',
    justifyContent: 'center', alignItems: 'center',
  },

  // Body form
  bodyForm: { gap: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#aaa', marginBottom: 2 },
  optionalText: { color: '#555', fontWeight: '400' },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1e1929', borderRadius: 12, paddingVertical: 12,
    borderWidth: 1.5, borderColor: '#362c3a',
  },
  genderBtnActive: { borderColor: '#c67ee2', backgroundColor: '#2d1f3a' },
  genderLabel: { fontSize: 14, color: '#888', fontWeight: '600' },
  genderLabelActive: { color: '#fff' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e1929', borderRadius: 12, borderWidth: 1.5,
    borderColor: '#362c3a', paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, height: 50, fontSize: 16, color: '#fff' },
  inputUnit: { fontSize: 13, color: '#888', fontWeight: '600' },

  // Activity
  activityList: { gap: 10 },
  activityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1e1929', borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: '#362c3a',
  },
  activityCardActive: { borderColor: '#c67ee2', backgroundColor: '#2d1f3a' },
  activityIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#211c24',
    justifyContent: 'center', alignItems: 'center',
  },
  activityIconActive: { backgroundColor: '#c67ee2' },
  activityLabel: { fontSize: 15, fontWeight: '700', color: '#888', marginBottom: 2 },
  activityLabelActive: { color: '#fff' },
  activityDesc: { fontSize: 12, color: '#555' },

  // Targets
  targetNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(198,126,226,0.1)', padding: 12, borderRadius: 10, marginBottom: 6,
  },
  targetNoteText: { fontSize: 13, color: '#aaa', flex: 1 },

  // Nav
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingBottom: 36, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#1e1929',
  },
  backNavBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#1e1929',
    justifyContent: 'center', alignItems: 'center',
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#c67ee2', paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14,
  },
  finishBtn: { backgroundColor: '#4CAF50' },
  nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});