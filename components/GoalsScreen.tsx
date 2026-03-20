// GoalsScreen.tsx — Live goals with Supabase, real exercise/food data, consistency tracker
import {
  StyleSheet, Text, View, ScrollView, Pressable,
  TextInput, Alert, ActivityIndicator, Modal,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/FontAwesome";
import Icon5 from "react-native-vector-icons/FontAwesome5";
import { PieChart } from "react-native-gifted-charts";
import supabase from "../lib/supabase";

// ─── Props ────────────────────────────────────────────────────────────────────
interface GoalsScreenProps {
  onClose: () => void;
  onGoalUpdate?: (goal: number) => void;
}

// ─── Motivation goal options ──────────────────────────────────────────────────
const MOTIVATION_GOALS = [
  { id: 'lose_weight',   label: 'Lose Weight',    icon: 'arrow-down',   color: '#4CAF50' },
  { id: 'gain_muscle',   label: 'Gain Muscle',    icon: 'arrow-up',     color: '#2196F3' },
  { id: 'stay_fit',      label: 'Stay Fit',       icon: 'heartbeat',    color: '#c67ee2' },
  { id: 'eat_healthy',   label: 'Eat Healthier',  icon: 'apple-alt',    color: '#FF9800' },
  { id: 'more_energy',   label: 'Boost Energy',   icon: 'bolt',         color: '#F3AF41' },
  { id: 'reduce_stress', label: 'Reduce Stress',  icon: 'smile',        color: '#00BCD4' },
];

// ─── ProgressBar ──────────────────────────────────────────────────────────────
const ProgressBar = ({
  progress, color, bg = '#362c3a', height = 10,
}: { progress: number; color: string; bg?: string; height?: number }) => (
  <View style={[styles.pbBg, { backgroundColor: bg, height }]}>
    <View style={[styles.pbFill, { width: `${Math.min(Math.max(progress, 0), 1) * 100}%`, backgroundColor: color, height }]} />
  </View>
);

// ─── StatCard ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = '#fff' }: { label: string; value: string; sub?: string; color?: string }) => (
  <View style={styles.statCard}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
  </View>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function GoalsScreen({ onClose, onGoalUpdate }: GoalsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Calorie goal ──────────────────────────────────────────────────────────
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(2000);
  const [foodValue, setFoodValue] = useState(0);
  const [exerciseValue, setExerciseValue] = useState(0);
  const [editingCalorie, setEditingCalorie] = useState(false);
  const [tempCalorie, setTempCalorie] = useState('2000');

  // ── Weight goal ───────────────────────────────────────────────────────────
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [startWeight, setStartWeight] = useState<number | null>(null);
  const [editingWeight, setEditingWeight] = useState(false);
  const [tempTarget, setTempTarget] = useState('');
  const [tempCurrent, setTempCurrent] = useState('');

  // ── Motivation goals ──────────────────────────────────────────────────────
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [showGoalPicker, setShowGoalPicker] = useState(false);

  // ── Food intake (from recipes/food logged) ────────────────────────────────
  const [foodStats, setFoodStats] = useState({
    weeklyTotal: 0,
    avgDaily: 0,
    carbs: 0, protein: 0, fat: 0, fiber: 0,
    carbsTarget: 500, proteinTarget: 150, fatTarget: 80, fiberTarget: 30,
    weekLogs: [] as { date: string; calories: number }[],
  });

  // ── Exercise (from exercise favorites/logs) ───────────────────────────────
  const [exerciseStats, setExerciseStats] = useState({
    dailyTarget: 300,
    weeklyBurned: 0,
    avgDaily: 0,
    activities: [] as { name: string; category: string; count: number }[],
    editingTarget: false,
    tempTarget: '300',
  });

  // ── Consistency tracker ───────────────────────────────────────────────────
  const [consistency, setConsistency] = useState({
    daily:   { achieved: false, streak: 0 },
    weekly:  { days: 0, total: 7, logs: [] as boolean[] },
    monthly: { days: 0, total: 30, percentage: 0 },
  });

  // ─── Load all data ─────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;

      // AsyncStorage basics
      const [goalStr, foodStr, exStr] = await Promise.all([
        AsyncStorage.getItem('@dailyCalorieGoal'),
        AsyncStorage.getItem('@foodValue'),
        AsyncStorage.getItem('@exerciseValue'),
      ]);
      const goal = parseInt(goalStr ?? '2000');
      const food = parseInt(foodStr ?? '0');
      const ex   = parseInt(exStr ?? '0');
      setDailyCalorieGoal(goal);
      setTempCalorie(String(goal));
      setFoodValue(food);
      setExerciseValue(ex);

      if (!userId) { setLoading(false); return; }

      // ── Fetch user_profiles ──────────────────────────────────────────────
      const { data: prof } = await supabase
        .from('user_profiles')
        .select('weight_kg, target_weight_kg, goals, daily_calorie_goal')
        .eq('user_id', userId)
        .single();

      if (prof) {
        setCurrentWeight(prof.weight_kg ?? null);
        setTargetWeight(prof.target_weight_kg ?? null);
        setStartWeight(prof.weight_kg ?? null);
        setSelectedGoals(prof.goals ?? []);
        if (prof.daily_calorie_goal) {
          setDailyCalorieGoal(prof.daily_calorie_goal);
          setTempCalorie(String(prof.daily_calorie_goal));
        }
      }

      // ── Fetch goal_logs for food/exercise/consistency ────────────────────
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: logs } = await supabase
        .from('goal_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('log_date', thirtyDaysAgo)
        .order('log_date', { ascending: false });

      if (logs && logs.length > 0) {
        // Food stats from logs
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const weekLogs = logs.filter((l: any) => l.log_date >= weekAgo);
        const weeklyFood = weekLogs.reduce((s: number, l: any) => s + (l.calories_consumed ?? 0), 0);
        const avgDaily   = weekLogs.length > 0 ? Math.round(weeklyFood / weekLogs.length) : 0;
        const latestLog  = logs[0];

        setFoodStats(prev => ({
          ...prev,
          weeklyTotal: weeklyFood,
          avgDaily,
          weekLogs: weekLogs.map((l: any) => ({ date: l.log_date, calories: l.calories_consumed ?? 0 })),
          carbs:   latestLog?.carbs_g   ?? 0,
          protein: latestLog?.protein_g ?? 0,
          fat:     latestLog?.fat_g     ?? 0,
          fiber:   latestLog?.fiber_g   ?? 0,
        }));

        // Exercise stats
        const weeklyEx = weekLogs.reduce((s: number, l: any) => s + (l.calories_burned ?? 0), 0);
        setExerciseStats(prev => ({
          ...prev,
          weeklyBurned: weeklyEx,
          avgDaily: weekLogs.length > 0 ? Math.round(weeklyEx / weekLogs.length) : 0,
        }));

        // Consistency — last 7 days
        const last7 = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const log = logs.find((l: any) => l.log_date === d);
          return log ? (log.calories_consumed ?? 0) >= (prof?.daily_calorie_goal ?? goal) * 0.8 : false;
        }).reverse();

        const daysThisWeek  = last7.filter(Boolean).length;
        const last30 = logs.filter((l: any) => l.log_date >= thirtyDaysAgo);
        const daysThisMonth = last30.filter((l: any) => (l.calories_consumed ?? 0) >= (prof?.daily_calorie_goal ?? goal) * 0.8).length;

        setConsistency({
          daily:   { achieved: last7[6], streak: calcStreak(logs, prof?.daily_calorie_goal ?? goal) },
          weekly:  { days: daysThisWeek, total: 7, logs: last7 },
          monthly: { days: daysThisMonth, total: 30, percentage: Math.round((daysThisMonth / 30) * 100) },
        });
      }

      // ── Exercise favorites for activity breakdown ────────────────────────
      const { data: exFavs } = await supabase
        .from('user_favorites_exercise')
        .select('exercise_name, exercise_category')
        .eq('user_id', userId)
        .limit(10);

      if (exFavs) {
        const grouped: Record<string, { name: string; category: string; count: number }> = {};
        exFavs.forEach((e: any) => {
          const key = e.exercise_name ?? 'Unknown';
          if (!grouped[key]) grouped[key] = { name: key, category: e.exercise_category ?? '', count: 0 };
          grouped[key].count++;
        });
        setExerciseStats(prev => ({ ...prev, activities: Object.values(grouped) }));
      }

    } catch (err: any) {
      console.warn('GoalsScreen loadAll error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const calcStreak = (logs: any[], goal: number) => {
    let streak = 0;
    let day = new Date();
    for (let i = 0; i < 30; i++) {
      const dateStr = day.toISOString().split('T')[0];
      const log = logs.find((l: any) => l.log_date === dateStr);
      if (log && (log.calories_consumed ?? 0) >= goal * 0.8) { streak++; day.setDate(day.getDate() - 1); }
      else break;
    }
    return streak;
  };

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Save calorie goal ────────────────────────────────────────────────────
  const saveCalorieGoal = async () => {
    const val = parseInt(tempCalorie) || 2000;
    setSaving(true);
    try {
      await AsyncStorage.setItem('@dailyCalorieGoal', String(val));
      setDailyCalorieGoal(val);
      setEditingCalorie(false);
      onGoalUpdate?.(val);

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase.from('user_profiles')
          .update({ daily_calorie_goal: val })
          .eq('user_id', session.user.id);
      }
      Alert.alert('Saved', 'Calorie goal updated!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setSaving(false); }
  };

  // ─── Save weight goal ─────────────────────────────────────────────────────
  const saveWeightGoal = async () => {
    const tw = parseFloat(tempTarget);
    const cw = parseFloat(tempCurrent);
    if (isNaN(tw) || tw <= 0) { Alert.alert('Invalid', 'Enter a valid target weight'); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('Not authenticated');

      const update: any = { target_weight_kg: tw, updated_at: new Date().toISOString() };
      if (!isNaN(cw) && cw > 0) update.weight_kg = cw;

      await supabase.from('user_profiles').update(update).eq('user_id', session.user.id);
      setTargetWeight(tw);
      if (!isNaN(cw) && cw > 0) setCurrentWeight(cw);
      setEditingWeight(false);
      Alert.alert('Saved', 'Weight goal updated in your profile!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setSaving(false); }
  };

  // ─── Save motivation goals ────────────────────────────────────────────────
  const saveMotivationGoals = async (goals: string[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      await supabase.from('user_profiles')
        .update({ goals, updated_at: new Date().toISOString() })
        .eq('user_id', session.user.id);
    } catch (e: any) {
      console.warn('Save goals error:', e.message);
    }
  };

  const toggleGoal = (id: string) => {
    const next = selectedGoals.includes(id)
      ? selectedGoals.filter(g => g !== id)
      : [...selectedGoals, id];
    setSelectedGoals(next);
    saveMotivationGoals(next);
  };

  // ─── Save exercise target ─────────────────────────────────────────────────
  const saveExTarget = async () => {
    const val = parseInt(exerciseStats.tempTarget) || 300;
    setExerciseStats(prev => ({ ...prev, dailyTarget: val, editingTarget: false }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase.from('goal_settings')
          .upsert({ user_id: session.user.id, exercise_daily_target: val }, { onConflict: 'user_id' });
      }
    } catch (e) {}
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const totalToday = foodValue + exerciseValue;
  const weightProgress = (currentWeight && targetWeight && startWeight)
    ? Math.min(Math.abs(startWeight - currentWeight) / Math.abs(startWeight - targetWeight), 1)
    : 0;

  const getConsColor = (pct: number) =>
    pct >= 0.8 ? '#4CAF50' : pct >= 0.5 ? '#F3AF41' : '#FF6B6B';

  const pieData = [
    { value: Math.max(foodStats.carbs, 1),   color: '#F3AF41', text: 'Carbs' },
    { value: Math.max(foodStats.protein, 1), color: '#84d7f4', text: 'Protein' },
    { value: Math.max(foodStats.fat, 1),     color: '#c67ee2', text: 'Fat' },
    { value: Math.max(foodStats.fiber, 1),   color: '#4CAF50', text: 'Fiber' },
  ];

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().getDay();
  const weekDayLabels = Array.from({ length: 7 }, (_, i) =>
    dayLabels[(today - 6 + i + 7) % 7]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header1} />
        <View style={styles.header}>
          <Text style={styles.title}>Goals</Text>
          <Pressable onPress={onClose}><Icon style={styles.closeIcon} name="times-circle" /></Pressable>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#c67ee2" />
          <Text style={styles.loadingText}>Loading your goals…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header1} />
      <View style={styles.header}>
        <Text style={styles.title}>Goals</Text>
        <Pressable onPress={onClose}><Icon style={styles.closeIcon} name="times-circle" /></Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Daily Calorie Goal ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 Daily Calorie Goal</Text>

          {editingCalorie ? (
            <View style={styles.editBox}>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.numInput}
                  value={tempCalorie}
                  onChangeText={setTempCalorie}
                  keyboardType="numeric"
                  autoFocus
                />
                <Text style={styles.unitLabel}>kcal</Text>
              </View>
              <View style={styles.btnRow}>
                <Pressable style={styles.btnSave} onPress={saveCalorieGoal} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Save</Text>}
                </Pressable>
                <Pressable style={styles.btnCancel} onPress={() => { setEditingCalorie(false); setTempCalorie(String(dailyCalorieGoal)); }}>
                  <Text style={styles.btnText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.goalDisplay} onPress={() => setEditingCalorie(true)}>
              <Text style={styles.goalBig}>{dailyCalorieGoal}</Text>
              <Text style={styles.goalUnit}>kcal / day</Text>
              <Icon5 name="pencil-alt" size={14} color="#c67ee2" style={{ marginTop: 4 }} />
            </Pressable>
          )}

          <View style={styles.statsRow}>
            <StatCard label="Food" value={`${foodValue}`} sub="kcal" color="#84d7f4" />
            <StatCard label="Exercise" value={`${exerciseValue}`} sub="kcal" color="#F3AF41" />
            <StatCard label="Total" value={`${totalToday}`} sub="kcal" color="#c67ee2" />
          </View>

          <ProgressBar progress={totalToday / dailyCalorieGoal} color="#c67ee2" />
          <Text style={styles.pbLabel}>
            {Math.round((totalToday / dailyCalorieGoal) * 100)}% of daily goal
            {totalToday >= dailyCalorieGoal ? '  ✅' : ''}
          </Text>
        </View>

        {/* ── Weight Goal ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.secRow}>
            <Text style={styles.sectionTitle}>⚖️ Weight Goal</Text>
            <Pressable onPress={() => {
              setTempTarget(String(targetWeight ?? ''));
              setTempCurrent(String(currentWeight ?? ''));
              setEditingWeight(true);
            }}>
              <Icon5 name="pencil-alt" size={14} color="#c67ee2" />
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <StatCard label="Current" value={currentWeight ? `${currentWeight} kg` : '—'} color="#FFFFFF" />
            <StatCard label="Target" value={targetWeight ? `${targetWeight} kg` : '—'} color="#4CAF50" />
            <StatCard label="To Go" value={
              currentWeight && targetWeight
                ? `${Math.abs(currentWeight - targetWeight).toFixed(1)} kg`
                : '—'
            } color="#F3AF41" />
          </View>

          <ProgressBar progress={weightProgress} color="#4CAF50" />
          <Text style={styles.pbLabel}>{Math.round(weightProgress * 100)}% toward target</Text>

          {editingWeight && (
            <Modal transparent animationType="fade" visible>
              <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>Update Weight Goal</Text>
                  <Text style={styles.fieldLabel}>Current Weight (kg)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={tempCurrent}
                    onChangeText={setTempCurrent}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 75"
                    placeholderTextColor="#555"
                  />
                  <Text style={styles.fieldLabel}>Target Weight (kg)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={tempTarget}
                    onChangeText={setTempTarget}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 68"
                    placeholderTextColor="#555"
                  />
                  <View style={styles.btnRow}>
                    <Pressable style={styles.btnSave} onPress={saveWeightGoal} disabled={saving}>
                      {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Save</Text>}
                    </Pressable>
                    <Pressable style={styles.btnCancel} onPress={() => setEditingWeight(false)}>
                      <Text style={styles.btnText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
          )}
        </View>

        {/* ── Motivation Goals ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.secRow}>
            <Text style={styles.sectionTitle}>🎯 Motivation Goals</Text>
            <Pressable onPress={() => setShowGoalPicker(true)} style={styles.editChip}>
              <Icon5 name="edit" size={12} color="#c67ee2" />
              <Text style={styles.editChipText}> Edit</Text>
            </Pressable>
          </View>

          {selectedGoals.length === 0 ? (
            <Pressable style={styles.emptyGoalBtn} onPress={() => setShowGoalPicker(true)}>
              <Icon5 name="plus-circle" size={18} color="#c67ee2" />
              <Text style={styles.emptyGoalText}> Tap to choose your goals</Text>
            </Pressable>
          ) : (
            <View style={styles.goalsWrap}>
              {selectedGoals.map(id => {
                const g = MOTIVATION_GOALS.find(x => x.id === id);
                if (!g) return null;
                return (
                  <View key={id} style={[styles.goalTag, { borderColor: g.color, backgroundColor: `${g.color}18` }]}>
                    <Icon5 name={g.icon} size={13} color={g.color} />
                    <Text style={[styles.goalTagText, { color: g.color }]}>{g.label}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <Modal transparent animationType="slide" visible={showGoalPicker}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Choose Your Goals</Text>
                <Text style={styles.modalSub}>Select all that apply</Text>
                <View style={styles.goalPickerGrid}>
                  {MOTIVATION_GOALS.map(g => {
                    const sel = selectedGoals.includes(g.id);
                    return (
                      <Pressable
                        key={g.id}
                        style={[styles.goalPickerItem, sel && { borderColor: g.color, backgroundColor: `${g.color}22` }]}
                        onPress={() => toggleGoal(g.id)}
                      >
                        <Icon5 name={g.icon} size={20} color={sel ? g.color : '#666'} />
                        <Text style={[styles.goalPickerText, sel && { color: g.color }]}>{g.label}</Text>
                        {sel && <Icon name="check-circle" size={14} color={g.color} style={styles.checkIcon} />}
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable style={styles.btnSave} onPress={() => setShowGoalPicker(false)}>
                  <Text style={styles.btnText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </View>

        {/* ── Food Intake + Nutritional Breakdown ──────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🥗 Food Intake</Text>
          <Text style={styles.dataSource}>From RecipesScreen · this week</Text>

          <View style={styles.statsRow}>
            <StatCard label="Weekly Total" value={`${foodStats.weeklyTotal}`} sub="kcal" color="#84d7f4" />
            <StatCard label="Daily Avg" value={`${foodStats.avgDaily}`} sub="kcal" color="#c67ee2" />
            <StatCard label="Daily Goal" value={`${dailyCalorieGoal}`} sub="kcal" color="#F3AF41" />
          </View>

          <ProgressBar
            progress={foodStats.avgDaily > 0 ? foodStats.avgDaily / dailyCalorieGoal : 0}
            color="#84d7f4"
          />
          <Text style={styles.pbLabel}>
            Avg {Math.round((foodStats.avgDaily / dailyCalorieGoal) * 100)}% of daily goal
          </Text>

          {/* Nutritional breakdown */}
          <Text style={styles.subTitle}>Nutritional Breakdown (latest log)</Text>
          {[
            { label: 'Carbohydrates', val: foodStats.carbs, target: foodStats.carbsTarget, color: '#F3AF41', unit: 'g' },
            { label: 'Protein',       val: foodStats.protein, target: foodStats.proteinTarget, color: '#84d7f4', unit: 'g' },
            { label: 'Fats',          val: foodStats.fat,    target: foodStats.fatTarget,    color: '#c67ee2', unit: 'g' },
            { label: 'Fiber',         val: foodStats.fiber,  target: foodStats.fiberTarget,  color: '#4CAF50', unit: 'g' },
          ].map(n => (
            <View key={n.label} style={styles.nutriRow}>
              <View style={styles.nutriHeader}>
                <Text style={styles.nutriLabel}>{n.label}</Text>
                <Text style={styles.nutriValue}>{n.val} / {n.target} {n.unit}</Text>
              </View>
              <ProgressBar progress={n.val / n.target} color={n.color} height={8} />
            </View>
          ))}

          {/* Pie chart */}
          {(foodStats.carbs + foodStats.protein + foodStats.fat + foodStats.fiber) > 0 && (
            <View style={styles.pieBox}>
              <PieChart
                data={pieData}
                donut
                radius={60}
                innerRadius={35}
                innerCircleColor="#211c24"
                centerLabelComponent={() => (
                  <Text style={styles.pieCenter}>Macros</Text>
                )}
              />
              <View style={styles.pieLegend}>
                {pieData.map(p => (
                  <View key={p.text} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: p.color }]} />
                    <Text style={styles.legendText}>{p.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* ── Exercise ─────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.secRow}>
            <Text style={styles.sectionTitle}>🏋️ Exercise</Text>
            <Pressable onPress={() => setExerciseStats(p => ({ ...p, editingTarget: true, tempTarget: String(p.dailyTarget) }))}>
              <Icon5 name="pencil-alt" size={14} color="#c67ee2" />
            </Pressable>
          </View>
          <Text style={styles.dataSource}>From ExerciseScreen favorites</Text>

          {exerciseStats.editingTarget ? (
            <View style={styles.editBox}>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.numInput}
                  value={exerciseStats.tempTarget}
                  onChangeText={v => setExerciseStats(p => ({ ...p, tempTarget: v }))}
                  keyboardType="numeric"
                  autoFocus
                />
                <Text style={styles.unitLabel}>kcal / day target</Text>
              </View>
              <View style={styles.btnRow}>
                <Pressable style={styles.btnSave} onPress={saveExTarget}><Text style={styles.btnText}>Save</Text></Pressable>
                <Pressable style={styles.btnCancel} onPress={() => setExerciseStats(p => ({ ...p, editingTarget: false }))}><Text style={styles.btnText}>Cancel</Text></Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <StatCard label="Daily Target" value={`${exerciseStats.dailyTarget}`} sub="kcal" color="#F3AF41" />
            <StatCard label="Weekly Burned" value={`${exerciseStats.weeklyBurned}`} sub="kcal" color="#fc9139" />
            <StatCard label="Avg / Day" value={`${exerciseStats.avgDaily}`} sub="kcal" color="#4CAF50" />
          </View>

          <ProgressBar
            progress={exerciseStats.avgDaily > 0 ? exerciseStats.avgDaily / exerciseStats.dailyTarget : 0}
            color="#F3AF41"
          />
          <Text style={styles.pbLabel}>
            Avg {Math.round((exerciseStats.avgDaily / exerciseStats.dailyTarget) * 100)}% of daily target
          </Text>

          {/* Activity breakdown */}
          {exerciseStats.activities.length > 0 && (
            <>
              <Text style={styles.subTitle}>Activity Breakdown</Text>
              {exerciseStats.activities.slice(0, 5).map((a, i) => (
                <View key={i} style={styles.actRow}>
                  <Icon5 name="dumbbell" size={16} color="#fcd2c7" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.actName}>{a.name}</Text>
                    <Text style={styles.actCat}>{a.category}</Text>
                  </View>
                  <View style={styles.actBadge}>
                    <Text style={styles.actBadgeText}>{a.count}× saved</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

        {/* ── Consistency Tracker ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Consistency Tracker</Text>

          {/* Streak */}
          <View style={styles.streakBox}>
            <Icon5 name="fire" size={24} color="#F3AF41" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.streakNum}>{consistency.daily.streak} day streak</Text>
              <Text style={styles.streakSub}>Keep going!</Text>
            </View>
            <View style={[styles.todayBadge, { backgroundColor: consistency.daily.achieved ? '#4CAF5022' : '#FF6B6B22' }]}>
              <Text style={[styles.todayBadgeText, { color: consistency.daily.achieved ? '#4CAF50' : '#FF6B6B' }]}>
                {consistency.daily.achieved ? '✅ Today done' : '🎯 Today pending'}
              </Text>
            </View>
          </View>

          {/* This Week */}
          <Text style={styles.subTitle}>This Week</Text>
          <View style={styles.weekRow}>
            {consistency.weekly.logs.map((done, i) => (
              <View key={i} style={styles.dayCol}>
                <View style={[styles.dayCircle, { backgroundColor: done ? '#4CAF50' : '#362c3a', borderColor: done ? '#4CAF50' : '#555' }]}>
                  <Icon name={done ? 'check' : 'times'} size={13} color={done ? '#fff' : '#666'} />
                </View>
                <Text style={styles.dayLabel}>{weekDayLabels[i]}</Text>
              </View>
            ))}
          </View>

          <View style={styles.conRow}>
            <Text style={styles.conLabel}>Weekly</Text>
            <Text style={styles.conFrac}>{consistency.weekly.days} / {consistency.weekly.total} days</Text>
          </View>
          <ProgressBar
            progress={consistency.weekly.days / consistency.weekly.total}
            color={getConsColor(consistency.weekly.days / consistency.weekly.total)}
          />

          {/* Monthly */}
          <View style={[styles.conRow, { marginTop: 14 }]}>
            <Text style={styles.conLabel}>Monthly (30 days)</Text>
            <Text style={styles.conFrac}>{consistency.monthly.days} / {consistency.monthly.total} days</Text>
          </View>
          <ProgressBar
            progress={consistency.monthly.days / consistency.monthly.total}
            color={getConsColor(consistency.monthly.days / consistency.monthly.total)}
          />
          <Text style={styles.pbLabel}>{consistency.monthly.percentage}% consistency this month</Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#15041f', zIndex: 400 },
  header1: { height: 35, backgroundColor: '#15041f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#1e1929', borderBottomWidth: 1, borderBottomColor: '#362c3a' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  closeIcon: { fontSize: 30, color: '#FFFFFF' },
  content: { flex: 1, padding: 15 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#888', fontSize: 16 },

  section: { backgroundColor: '#211c24', borderRadius: 16, padding: 16, marginBottom: 15 },
  secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#c67ee2' },
  subTitle: { fontSize: 14, fontWeight: '700', color: '#aaa', marginTop: 14, marginBottom: 8 },
  dataSource: { fontSize: 11, color: '#555', marginBottom: 10, fontStyle: 'italic' },

  // Goal display
  goalDisplay: { alignItems: 'center', marginBottom: 16 },
  goalBig: { fontSize: 42, fontWeight: '900', color: '#c67ee2' },
  goalUnit: { fontSize: 14, color: '#888' },

  // Stat cards
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#2a2335', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#362c3a' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#888', fontWeight: '600', textAlign: 'center' },
  statSub: { fontSize: 10, color: '#555' },

  // Progress bar
  pbBg: { borderRadius: 6, overflow: 'hidden', marginBottom: 4 },
  pbFill: { borderRadius: 6 },
  pbLabel: { fontSize: 11, color: '#888', textAlign: 'right', marginBottom: 4 },

  // Edit inputs
  editBox: { backgroundColor: '#2a2335', borderRadius: 12, padding: 14, marginBottom: 12, gap: 10 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numInput: { backgroundColor: '#15041f', color: '#fff', fontSize: 22, fontWeight: '700', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, minWidth: 100, borderWidth: 1, borderColor: '#362c3a' },
  unitLabel: { fontSize: 14, color: '#888' },
  btnRow: { flexDirection: 'row', gap: 10 },
  btnSave: { flex: 1, backgroundColor: '#c67ee2', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  btnCancel: { flex: 1, backgroundColor: '#362c3a', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Motivation goals
  goalsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  goalTagText: { fontSize: 13, fontWeight: '600' },
  editChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(198,126,226,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(198,126,226,0.3)' },
  editChipText: { fontSize: 12, color: '#c67ee2', fontWeight: '600' },
  emptyGoalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(198,126,226,0.08)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(198,126,226,0.2)', borderStyle: 'dashed' },
  emptyGoalText: { fontSize: 14, color: '#c67ee2', fontWeight: '600' },

  // Nutritional
  nutriRow: { marginBottom: 10 },
  nutriHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  nutriLabel: { fontSize: 13, color: '#ccc', fontWeight: '600' },
  nutriValue: { fontSize: 13, color: '#888' },
  pieBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 14 },
  pieCenter: { fontSize: 11, color: '#888', fontWeight: '600' },
  pieLegend: { gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#ccc' },

  // Exercise
  actRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2335', borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: '#362c3a' },
  actName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  actCat: { fontSize: 11, color: '#888' },
  actBadge: { backgroundColor: 'rgba(252,177,42,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  actBadgeText: { fontSize: 11, color: '#fcb92a', fontWeight: '700' },

  // Consistency
  streakBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2335', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#362c3a' },
  streakNum: { fontSize: 20, fontWeight: '800', color: '#F3AF41' },
  streakSub: { fontSize: 12, color: '#888' },
  todayBadge: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  todayBadgeText: { fontSize: 12, fontWeight: '700' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  dayCol: { alignItems: 'center', gap: 4 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  dayLabel: { fontSize: 10, color: '#888' },
  conRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  conLabel: { fontSize: 13, color: '#ccc', fontWeight: '600' },
  conFrac: { fontSize: 13, color: '#888' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#1e1929', borderRadius: 20, padding: 24, width: '100%', borderWidth: 1, borderColor: '#362c3a', gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center' },
  modalSub: { fontSize: 13, color: '#888', textAlign: 'center' },
  modalInput: { backgroundColor: '#15041f', borderRadius: 10, borderWidth: 1, borderColor: '#362c3a', color: '#fff', fontSize: 16, paddingHorizontal: 14, paddingVertical: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#aaa' },
  goalPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalPickerItem: { width: '47%', backgroundColor: '#15041f', borderRadius: 12, padding: 14, alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#362c3a', position: 'relative' },
  goalPickerText: { fontSize: 13, fontWeight: '600', color: '#888', textAlign: 'center' },
  checkIcon: { position: 'absolute', top: 6, right: 6 },

  // Legacy (keep for ProgressBar component)
  progressBarBg: { height: 12, backgroundColor: '#362c3a', borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 6 },
});