// WeeklyReportScreen.tsx — Live weekly report from Supabase
// Sources: daily_activity_logs, goal_logs, user_session_logs, user_reminders, user_profiles
import {
  StyleSheet, Text, View, ScrollView, Pressable, ActivityIndicator,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import Icon from "react-native-vector-icons/FontAwesome";
import Icon5 from "react-native-vector-icons/FontAwesome5";
import { PieChart, BarChart } from "react-native-gifted-charts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import supabase from "../lib/supabase";

interface WeeklyReportScreenProps { onClose: () => void; }

// ── Day labels for this week (Sun→Sat relative to today) ─────────────────────
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const getLast7Days = () =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date:  d.toISOString().split('T')[0],
      label: DAY_LABELS[d.getDay()],
    };
  });

// ── Color helpers ─────────────────────────────────────────────────────────────
const rateColor = (r: number) => r >= 80 ? '#4CAF50' : r >= 55 ? '#FFA500' : '#FF6B6B';
const rateLabel = (r: number) => r >= 80 ? 'On Track ✅' : r >= 55 ? 'At Risk ⚠️' : 'Critical 🔴';

// ── Insight generator ─────────────────────────────────────────────────────────
const foodInsight = (consumed: number, goal: number, exerciseBurned: number): { text: string; color: string } => {
  const net = consumed - exerciseBurned;
  const pct = goal > 0 ? (consumed / goal) * 100 : 0;
  if (pct < 60) return { text: '⚠️ Under-eating detected. Low intake may slow metabolism and reduce muscle retention.', color: '#FF6B6B' };
  if (pct > 130) return { text: '⚠️ Over-eating this week. Calorie surplus may lead to unwanted weight gain.', color: '#FFA500' };
  if (net < 0) return { text: '✅ Great balance! You\'re burning more than you consume — ideal for fat loss.', color: '#4CAF50' };
  if (net < 300) return { text: '✅ Balanced week. Intake and exercise are well aligned for maintenance or lean gain.', color: '#4CAF50' };
  return { text: '💡 Moderate surplus. Good for muscle gain — ensure protein intake is adequate.', color: '#84d7f4' };
};

const exerciseInsight = (burned: number, target: number, consumed: number): { text: string; color: string } => {
  const ratio = consumed > 0 ? (burned / consumed) * 100 : 0;
  if (burned === 0) return { text: '⚠️ No exercise logged this week. Even light activity improves health significantly.', color: '#FF6B6B' };
  if (ratio > 60) return { text: '⚠️ Exercise burn is very high vs intake. Risk of under-fuelling — increase food intake.', color: '#FFA500' };
  if (burned >= target * 0.8) return { text: '✅ Exercise target met. Consistent effort is building strength and endurance.', color: '#4CAF50' };
  return { text: '💡 Below weekly exercise target. Try adding one more session to close the gap.', color: '#FFA500' };
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function WeeklyReportScreen({ onClose }: WeeklyReportScreenProps) {
  const [loading, setLoading] = useState(true);
  const [days] = useState(getLast7Days());

  // ── Data state ───────────────────────────────────────────────────────────
  const [calorieGoal, setCalorieGoal]     = useState(2000);
  const [exerciseTarget, setExerciseTarget] = useState(300);

  const [consistencyDays, setConsistencyDays] = useState<{
    date: string; label: string;
    loggedIn: boolean; foodLogged: boolean; exerciseLogged: boolean;
    foodCal: number; exerciseCal: number;
  }[]>([]);

  const [foodSummary, setFoodSummary] = useState({
    weeklyTotal: 0, avgDaily: 0,
    carbsCal: 0, proteinCal: 0, fatCal: 0, fiberCal: 0,
    topItems: [] as { name: string; count: number; calories: number }[],
    dailyBars: [] as { value: number; label: string; frontColor: string }[],
  });

  const [exerciseSummary, setExerciseSummary] = useState({
    weeklyTotal: 0, avgDaily: 0, daysActive: 0,
    categories: {} as Record<string, number>,
    topActivities: [] as { name: string; count: number; calories: number }[],
    dailyBars: [] as { value: number; label: string; frontColor: string }[],
  });

  const [habitSummary, setHabitSummary] = useState({
    total: 0, active: 0, inactive: 0,
    totalDone: 0, totalMissed: 0, consistencyRate: 0,
    habits: [] as { name: string; done: number; missed: number; rate: number; isActive: boolean }[],
  });

  const [sessionSummary, setSessionSummary] = useState({
    daysLoggedIn: 0, totalSessions: 0, streak: 0,
    loginDates: [] as string[],
  });

  // ── Load all data ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;
      const weekStart = days[0].date;
      const today     = days[6].date;

      // AsyncStorage basics
      const goalStr = await AsyncStorage.getItem('@dailyCalorieGoal');
      if (goalStr) setCalorieGoal(parseInt(goalStr));

      if (!userId) { setLoading(false); return; }

      // user_profiles — calorie goal + exercise target
      const { data: prof } = await supabase
        .from('user_profiles')
        .select('daily_calorie_goal')
        .eq('user_id', userId).single();
      if (prof?.daily_calorie_goal) setCalorieGoal(prof.daily_calorie_goal);

      const { data: settings } = await supabase
        .from('goal_settings')
        .select('exercise_daily_target')
        .eq('user_id', userId).single();
      if (settings?.exercise_daily_target) setExerciseTarget(settings.exercise_daily_target);

      // ── Fetch all data in parallel ─────────────────────────────────────
      const [actRes, sessionRes, reminderRes] = await Promise.all([
        supabase.from('daily_activity_logs')
          .select('log_date, activity_type, item_name, item_category, calories')
          .eq('user_id', userId)
          .gte('log_date', weekStart)
          .lte('log_date', today)
          .order('logged_at', { ascending: true }),
        supabase.from('user_session_logs')
          .select('login_date, login_at, logout_at')
          .eq('user_id', userId)
          .gte('login_date', weekStart)
          .order('login_date', { ascending: true }),
        supabase.from('user_reminders')
          .select('name, is_active, total_done, total_undone')
          .eq('user_id', userId),
      ]);

      const actLogs    = actRes.data     ?? [];
      const sessionLogs = sessionRes.data ?? [];
      const habits     = reminderRes.data ?? [];

      // ── Consistency per day ────────────────────────────────────────────
      const loginDates = [...new Set(sessionLogs.map((s: any) => s.login_date))] as string[];
      const dayDetails = days.map(d => {
        const dayLogs    = actLogs.filter((l: any) => l.log_date === d.date);
        const foodLogs   = dayLogs.filter((l: any) => l.activity_type === 'food');
        const exLogs     = dayLogs.filter((l: any) => l.activity_type === 'exercise');
        const foodCal    = foodLogs.reduce((s: number, l: any) => s + (l.calories ?? 0), 0);
        const exerciseCal = exLogs.reduce((s: number, l: any) => s + (l.calories ?? 0), 0);
        return {
          date:          d.date,
          label:         d.label,
          loggedIn:      loginDates.includes(d.date),
          foodLogged:    foodLogs.length > 0,
          exerciseLogged: exLogs.length > 0,
          foodCal,
          exerciseCal,
        };
      });
      setConsistencyDays(dayDetails);

      // ── Session summary ────────────────────────────────────────────────
      let streak = 0;
      const todayD = new Date();
      for (let i = 0; i < 30; i++) {
        const d = new Date(todayD);
        d.setDate(todayD.getDate() - i);
        if (loginDates.includes(d.toISOString().split('T')[0])) streak++;
        else break;
      }
      setSessionSummary({
        daysLoggedIn:  loginDates.length,
        totalSessions: sessionLogs.length,
        streak,
        loginDates,
      });

      // ── Food summary ───────────────────────────────────────────────────
      const foodLogs = actLogs.filter((l: any) => l.activity_type === 'food');
      const weeklyFoodCal = foodLogs.reduce((s: number, l: any) => s + (l.calories ?? 0), 0);
      const foodDays = [...new Set(foodLogs.map((l: any) => l.log_date))].length;

      // Macro estimates from calories
      const carbsCal   = Math.round(weeklyFoodCal * 0.50);
      const proteinCal = Math.round(weeklyFoodCal * 0.25);
      const fatCal     = Math.round(weeklyFoodCal * 0.20);
      const fiberCal   = Math.round(weeklyFoodCal * 0.05);

      // Top food items
      const foodCounts: Record<string, { count: number; calories: number }> = {};
      foodLogs.forEach((l: any) => {
        const k = l.item_name ?? 'Unknown';
        if (!foodCounts[k]) foodCounts[k] = { count: 0, calories: 0 };
        foodCounts[k].count++;
        foodCounts[k].calories += l.calories ?? 0;
      });
      const topItems = Object.entries(foodCounts)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.calories - a.calories)
        .slice(0, 5);

      // Daily bars
      const dailyFoodBars = days.map(d => {
        const cal = foodLogs
          .filter((l: any) => l.log_date === d.date)
          .reduce((s: number, l: any) => s + (l.calories ?? 0), 0);
        return { value: cal, label: d.label, frontColor: cal >= calorieGoal ? '#4CAF50' : '#c67ee2' };
      });

      setFoodSummary({
        weeklyTotal: weeklyFoodCal,
        avgDaily: foodDays > 0 ? Math.round(weeklyFoodCal / foodDays) : 0,
        carbsCal, proteinCal, fatCal, fiberCal,
        topItems,
        dailyBars: dailyFoodBars,
      });

      // ── Exercise summary ───────────────────────────────────────────────
      const exLogs = actLogs.filter((l: any) => l.activity_type === 'exercise');
      const weeklyExCal = exLogs.reduce((s: number, l: any) => s + (l.calories ?? 0), 0);
      const exDays = [...new Set(exLogs.map((l: any) => l.log_date))].length;

      // Category breakdown
      const catCals: Record<string, number> = {};
      const exCounts: Record<string, { count: number; calories: number }> = {};
      exLogs.forEach((l: any) => {
        const cat = l.item_category ?? 'Other';
        catCals[cat] = (catCals[cat] ?? 0) + (l.calories ?? 0);
        const k = l.item_name ?? 'Exercise';
        if (!exCounts[k]) exCounts[k] = { count: 0, calories: 0 };
        exCounts[k].count++;
        exCounts[k].calories += l.calories ?? 0;
      });
      const topActivities = Object.entries(exCounts)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.calories - a.calories)
        .slice(0, 5);

      const dailyExBars = days.map(d => {
        const cal = exLogs
          .filter((l: any) => l.log_date === d.date)
          .reduce((s: number, l: any) => s + (l.calories ?? 0), 0);
        return { value: cal, label: d.label, frontColor: cal >= exerciseTarget ? '#4CAF50' : '#84d7f4' };
      });

      setExerciseSummary({
        weeklyTotal: weeklyExCal,
        avgDaily: exDays > 0 ? Math.round(weeklyExCal / exDays) : 0,
        daysActive: exDays,
        categories: catCals,
        topActivities,
        dailyBars: dailyExBars,
      });

      // ── Habit summary ──────────────────────────────────────────────────
      const totalDone   = habits.reduce((s: number, h: any) => s + (h.total_done ?? 0), 0);
      const totalMissed = habits.reduce((s: number, h: any) => s + (h.total_undone ?? 0), 0);
      const rate = totalDone + totalMissed > 0
        ? Math.round((totalDone / (totalDone + totalMissed)) * 100) : 0;

      const habitRows = habits
        .map((h: any) => {
          const done   = h.total_done ?? 0;
          const missed = h.total_undone ?? 0;
          const r = done + missed > 0 ? Math.round((done / (done + missed)) * 100) : 0;
          return { name: h.name ?? 'Habit', done, missed, rate: r, isActive: h.is_active ?? true };
        })
        .sort((a: any, b: any) => b.rate - a.rate);

      setHabitSummary({
        total: habits.length,
        active: habits.filter((h: any) => h.is_active).length,
        inactive: habits.filter((h: any) => !h.is_active).length,
        totalDone, totalMissed, consistencyRate: rate,
        habits: habitRows,
      });

    } catch (e: any) {
      console.warn('WeeklyReport loadAll:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Derived values ────────────────────────────────────────────────────────
  const weeklyGoal     = calorieGoal * 7;
  const weeklyExTarget = exerciseTarget * 7;
  const daysOnTrack    = consistencyDays.filter(d => d.foodLogged && d.exerciseLogged).length;
  const overallRate    = Math.round((daysOnTrack / 7) * 100);

  const totalFoodPie = Math.max(foodSummary.carbsCal + foodSummary.proteinCal + foodSummary.fatCal + foodSummary.fiberCal, 1);
  const foodPieData = [
    { value: foodSummary.carbsCal,   color: '#F3AF41', text: 'Carbs'   },
    { value: foodSummary.proteinCal, color: '#84d7f4', text: 'Protein' },
    { value: foodSummary.fatCal,     color: '#c67ee2', text: 'Fat'     },
    { value: foodSummary.fiberCal,   color: '#4CAF50', text: 'Fiber'   },
  ].map(p => ({ ...p, value: Math.max(p.value, 1) }));

  const totalExCats = Object.values(exerciseSummary.categories).reduce((s, v) => s + v, 0) || 1;
  const CAT_COLORS: Record<string, string> = {
    Cardio: '#84d7f4', Strength: '#c67ee2', Core: '#F3AF41',
    Flexibility: '#4CAF50', HIIT: '#fc9139', Other: '#888',
  };
  const exPieData = Object.entries(exerciseSummary.categories).map(([cat, cal]) => ({
    value: Math.max(cal, 1),
    color: CAT_COLORS[cat] ?? '#888',
    text: cat,
  }));

  const foodInsightMsg   = foodInsight(foodSummary.weeklyTotal, weeklyGoal, exerciseSummary.weeklyTotal);
  const exerciseInsightMsg = exerciseInsight(exerciseSummary.weeklyTotal, weeklyExTarget, foodSummary.weeklyTotal);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header1} />
        <View style={styles.header}>
          <Text style={styles.title}>My Weekly Report</Text>
          <Pressable onPress={onClose}><Icon name="times-circle" style={styles.closeIcon} /></Pressable>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#c67ee2" />
          <Text style={styles.loadingText}>Generating your report…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header1} />
      <View style={styles.header}>
        <Text style={styles.title}>My Weekly Report</Text>
        <Pressable onPress={onClose}><Icon name="times-circle" style={styles.closeIcon} /></Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Overview Score Card ──────────────────────────────────────── */}
        <View style={[styles.scoreCard, { borderColor: rateColor(overallRate) }]}>
          <View style={styles.scoreLeft}>
            <Text style={styles.scoreWeek}>Week of {days[0].label} – {days[6].label}</Text>
            <Text style={[styles.scorePct, { color: rateColor(overallRate) }]}>{overallRate}%</Text>
            <Text style={[styles.scoreLabel, { color: rateColor(overallRate) }]}>
              {rateLabel(overallRate)}
            </Text>
            <Text style={styles.scoreSub}>{daysOnTrack}/7 days fully active</Text>
          </View>
          <View style={styles.scoreRight}>
            {[
              { icon: 'sign-in-alt',   label: 'Logins',    val: sessionSummary.daysLoggedIn },
              { icon: 'fire',      label: 'Food days',  val: consistencyDays.filter(d => d.foodLogged).length },
              { icon: 'dumbbell',  label: 'Ex. days',   val: exerciseSummary.daysActive },
              { icon: 'bell',      label: 'Active habits', val: habitSummary.active },
            ].map((s, i) => (
              <View key={i} style={styles.scoreStat}>
                <Icon5 name={s.icon} size={13} color="#c67ee2" />
                <Text style={styles.scoreStatVal}>{s.val}</Text>
                <Text style={styles.scoreStatLbl}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Weekly Consistency ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Weekly Consistency</Text>

          {/* Day dots */}
          <View style={styles.dayRow}>
            {consistencyDays.map((d, i) => {
              const bothDone = d.foodLogged && d.exerciseLogged;
              const partial  = d.foodLogged || d.exerciseLogged;
              const col = !d.loggedIn ? '#333' : bothDone ? '#4CAF50' : partial ? '#FFA500' : '#FF6B6B';
              return (
                <View key={i} style={styles.dayCol}>
                  <View style={[styles.dayCircle, { backgroundColor: col, borderColor: col }]}>
                    <Icon5
                      name={!d.loggedIn ? 'times' : bothDone ? 'check' : 'minus'}
                      size={12} color="#fff"
                    />
                  </View>
                  <Text style={styles.dayLabel}>{d.label}</Text>
                  {d.loggedIn && (
                    <View style={styles.dayMini}>
                      <View style={[styles.miniDot, { backgroundColor: d.foodLogged ? '#c67ee2' : '#333' }]} />
                      <View style={[styles.miniDot, { backgroundColor: d.exerciseLogged ? '#84d7f4' : '#333' }]} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            {[
              { col: '#4CAF50', label: 'Food + Exercise' },
              { col: '#FFA500', label: 'Partial' },
              { col: '#FF6B6B', label: 'Logged in only' },
              { col: '#333',    label: 'Not active' },
            ].map((l, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.col }]} />
                <Text style={styles.legendText}>{l.label}</Text>
              </View>
            ))}
          </View>

          {/* Mini indicators legend */}
          <View style={styles.miniLegend}>
            <View style={[styles.miniDot, { backgroundColor: '#c67ee2' }]} /><Text style={styles.miniLegendText}> Food logged  </Text>
            <View style={[styles.miniDot, { backgroundColor: '#84d7f4' }]} /><Text style={styles.miniLegendText}> Exercise logged</Text>
          </View>

          {/* Per-day calorie comparison */}
          <Text style={styles.subTitle}>Daily Food vs Exercise (kcal)</Text>
          {consistencyDays.map((d, i) => (
            <View key={i} style={styles.dayCompareRow}>
              <Text style={styles.dayCompareLabel}>{d.label}</Text>
              <View style={styles.dayCompareBars}>
                <View style={styles.compareBarWrap}>
                  <View style={[styles.compareBar, {
                    width: `${Math.min((d.foodCal / (calorieGoal || 1)) * 100, 100)}%`,
                    backgroundColor: '#c67ee2',
                  }]} />
                </View>
                <View style={styles.compareBarWrap}>
                  <View style={[styles.compareBar, {
                    width: `${Math.min((d.exerciseCal / (exerciseTarget || 1)) * 100, 100)}%`,
                    backgroundColor: '#84d7f4',
                  }]} />
                </View>
              </View>
              <Text style={styles.dayCompareVal}>{d.foodCal > 0 ? `${d.foodCal}` : '—'}</Text>
            </View>
          ))}
          <View style={styles.compareLegend}>
            <View style={styles.legendItem}><View style={[styles.miniDot, { backgroundColor: '#c67ee2' }]} /><Text style={styles.legendText}> Food</Text></View>
            <View style={styles.legendItem}><View style={[styles.miniDot, { backgroundColor: '#84d7f4' }]} /><Text style={styles.legendText}> Exercise</Text></View>
          </View>
        </View>

        {/* ── Food Intake Breakdown ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🥗 Food Intake Breakdown</Text>

          {/* Summary stats */}
          <View style={styles.triRow}>
            <View style={styles.triCard}>
              <Text style={styles.triVal}>{foodSummary.weeklyTotal.toLocaleString()}</Text>
              <Text style={styles.triLbl}>Total kcal</Text>
            </View>
            <View style={styles.triCard}>
              <Text style={styles.triVal}>{foodSummary.avgDaily}</Text>
              <Text style={styles.triLbl}>Avg / day</Text>
            </View>
            <View style={styles.triCard}>
              <Text style={[styles.triVal, {
                color: foodSummary.weeklyTotal >= weeklyGoal * 0.8 && foodSummary.weeklyTotal <= weeklyGoal * 1.2
                  ? '#4CAF50' : '#FFA500'
              }]}>
                {weeklyGoal > 0 ? `${Math.round((foodSummary.weeklyTotal / weeklyGoal) * 100)}%` : '—'}
              </Text>
              <Text style={styles.triLbl}>vs Goal</Text>
            </View>
          </View>

          {/* Insight */}
          <View style={[styles.insightBox, { borderColor: foodInsightMsg.color }]}>
            <Text style={[styles.insightText, { color: foodInsightMsg.color }]}>{foodInsightMsg.text}</Text>
          </View>

          {/* Macro pie + breakdown */}
          {foodSummary.weeklyTotal > 0 ? (
            <View style={styles.pieRow}>
              <PieChart
                data={foodPieData}
                radius={65}
                innerRadius={42}
                backgroundColor="#211c24"
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.pieCenterVal}>{foodSummary.weeklyTotal > 0 ? Math.round(foodSummary.weeklyTotal / 1000) + 'k' : '0'}</Text>
                    <Text style={styles.pieCenterLbl}>kcal</Text>
                  </View>
                )}
              />
              <View style={styles.pieDetails}>
                {[
                  { label: 'Carbs',   cal: foodSummary.carbsCal,   color: '#F3AF41' },
                  { label: 'Protein', cal: foodSummary.proteinCal, color: '#84d7f4' },
                  { label: 'Fats',    cal: foodSummary.fatCal,     color: '#c67ee2' },
                  { label: 'Fiber',   cal: foodSummary.fiberCal,   color: '#4CAF50' },
                ].map((m, i) => {
                  const pct = Math.round((m.cal / totalFoodPie) * 100);
                  return (
                    <View key={i} style={styles.macroRow}>
                      <View style={[styles.macroDot, { backgroundColor: m.color }]} />
                      <Text style={styles.macroLabel}>{m.label}</Text>
                      <View style={styles.macroBarBg}>
                        <View style={[styles.macroBarFill, { width: `${pct}%`, backgroundColor: m.color }]} />
                      </View>
                      <Text style={styles.macroPct}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <Text style={styles.emptyHint}>No food logged this week. Add meals in RecipesScreen.</Text>
          )}

          {/* Daily calorie bars */}
          {foodSummary.weeklyTotal > 0 && (
            <View style={styles.barWrap}>
              <Text style={styles.subTitle}>Daily Intake vs Goal ({calorieGoal} kcal)</Text>
              <BarChart
                data={foodSummary.dailyBars}
                width={300} height={120} barWidth={32} spacing={12}
                roundedTop roundedBottom
                xAxisThickness={1} yAxisThickness={1}
                xAxisColor="#362c3a" yAxisColor="#362c3a"
                xAxisLabelTextStyle={{ color: '#ccc', fontSize: 11 }}
                yAxisTextStyle={{ color: '#ccc', fontSize: 10 }}
                noOfSections={4} maxValue={Math.max(...foodSummary.dailyBars.map(b => b.value), calorieGoal) + 200}
                isAnimated
                referenceLine1Config={{ color: '#c67ee275', width: 1, type: 'dashed' }}
                referenceLine1Position={calorieGoal}
              />
            </View>
          )}

          {/* Top food items */}
          {foodSummary.topItems.length > 0 && (
            <>
              <Text style={styles.subTitle}>Most Logged Foods</Text>
              {foodSummary.topItems.map((item, i) => (
                <View key={i} style={styles.rankRow}>
                  <Text style={styles.rankNum}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rankName}>{item.name}</Text>
                    <Text style={styles.rankSub}>{item.count}× logged</Text>
                  </View>
                  <Text style={styles.rankCal}>{item.calories} kcal</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* ── Exercise Breakdown ───────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏋️ Exercise Breakdown</Text>

          <View style={styles.triRow}>
            <View style={styles.triCard}>
              <Text style={styles.triVal}>{exerciseSummary.weeklyTotal}</Text>
              <Text style={styles.triLbl}>Total burned</Text>
            </View>
            <View style={styles.triCard}>
              <Text style={styles.triVal}>{exerciseSummary.avgDaily}</Text>
              <Text style={styles.triLbl}>Avg / day</Text>
            </View>
            <View style={styles.triCard}>
              <Text style={[styles.triVal, {
                color: exerciseSummary.daysActive >= 4 ? '#4CAF50' : exerciseSummary.daysActive >= 2 ? '#FFA500' : '#FF6B6B'
              }]}>
                {exerciseSummary.daysActive}/7
              </Text>
              <Text style={styles.triLbl}>Days active</Text>
            </View>
          </View>

          {/* Insight */}
          <View style={[styles.insightBox, { borderColor: exerciseInsightMsg.color }]}>
            <Text style={[styles.insightText, { color: exerciseInsightMsg.color }]}>{exerciseInsightMsg.text}</Text>
          </View>

          {/* Balance check */}
          {foodSummary.weeklyTotal > 0 && (
            <View style={styles.balanceBox}>
              <Text style={styles.balanceTitle}>⚖️ Intake vs Burn Balance</Text>
              <View style={styles.balanceRow}>
                <View style={styles.balanceSide}>
                  <Icon5 name="utensils" size={14} color="#c67ee2" />
                  <Text style={styles.balanceVal}>{foodSummary.weeklyTotal.toLocaleString()}</Text>
                  <Text style={styles.balanceLbl}>kcal in</Text>
                </View>
                <View style={styles.balanceMid}>
                  <Text style={styles.balanceNet}>
                    {foodSummary.weeklyTotal - exerciseSummary.weeklyTotal > 0 ? '+' : ''}
                    {(foodSummary.weeklyTotal - exerciseSummary.weeklyTotal).toLocaleString()}
                  </Text>
                  <Text style={styles.balanceNetLbl}>net kcal</Text>
                </View>
                <View style={styles.balanceSide}>
                  <Icon5 name="fire" size={14} color="#84d7f4" />
                  <Text style={styles.balanceVal}>{exerciseSummary.weeklyTotal.toLocaleString()}</Text>
                  <Text style={styles.balanceLbl}>kcal burned</Text>
                </View>
              </View>
            </View>
          )}

          {/* Category pie */}
          {exPieData.length > 0 ? (
            <View style={styles.pieRow}>
              <PieChart
                data={exPieData}
                radius={65} innerRadius={42}
                backgroundColor="#211c24"
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.pieCenterVal}>{exerciseSummary.weeklyTotal}</Text>
                    <Text style={styles.pieCenterLbl}>burned</Text>
                  </View>
                )}
              />
              <View style={styles.pieDetails}>
                {Object.entries(exerciseSummary.categories).map(([cat, cal], i) => {
                  const pct = Math.round((cal / totalExCats) * 100);
                  return (
                    <View key={i} style={styles.macroRow}>
                      <View style={[styles.macroDot, { backgroundColor: CAT_COLORS[cat] ?? '#888' }]} />
                      <Text style={styles.macroLabel}>{cat}</Text>
                      <View style={styles.macroBarBg}>
                        <View style={[styles.macroBarFill, { width: `${pct}%`, backgroundColor: CAT_COLORS[cat] ?? '#888' }]} />
                      </View>
                      <Text style={styles.macroPct}>{pct}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <Text style={styles.emptyHint}>No exercise logged this week. Add workouts in ExerciseScreen.</Text>
          )}

          {/* Daily exercise bars */}
          {exerciseSummary.weeklyTotal > 0 && (
            <View style={styles.barWrap}>
              <Text style={styles.subTitle}>Daily Burn vs Target ({exerciseTarget} kcal)</Text>
              <BarChart
                data={exerciseSummary.dailyBars}
                width={300} height={120} barWidth={32} spacing={12}
                roundedTop roundedBottom
                xAxisThickness={1} yAxisThickness={1}
                xAxisColor="#362c3a" yAxisColor="#362c3a"
                xAxisLabelTextStyle={{ color: '#ccc', fontSize: 11 }}
                yAxisTextStyle={{ color: '#ccc', fontSize: 10 }}
                noOfSections={4} maxValue={Math.max(...exerciseSummary.dailyBars.map(b => b.value), exerciseTarget) + 50}
                isAnimated
              />
            </View>
          )}

          {/* Top activities */}
          {exerciseSummary.topActivities.length > 0 && (
            <>
              <Text style={styles.subTitle}>Top Activities This Week</Text>
              {exerciseSummary.topActivities.map((a, i) => (
                <View key={i} style={styles.rankRow}>
                  <Text style={styles.rankNum}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rankName}>{a.name}</Text>
                    <Text style={styles.rankSub}>{a.count}× logged</Text>
                  </View>
                  <Text style={styles.rankCal}>{a.calories} kcal</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* ── Habits Section ───────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Habit Consistency</Text>

          {habitSummary.total === 0 ? (
            <Text style={styles.emptyHint}>No habits created yet. Add habits from the Reminders screen.</Text>
          ) : (
            <>
              {/* Overall habit rate */}
              <View style={styles.habitScoreRow}>
                <View>
                  <Text style={styles.habitScoreLabel}>Overall Habit Rate</Text>
                  <Text style={styles.habitScoreSub}>
                    {habitSummary.active} active · {habitSummary.inactive} inactive
                  </Text>
                </View>
                <Text style={[styles.habitScorePct, { color: rateColor(habitSummary.consistencyRate) }]}>
                  {habitSummary.consistencyRate}%
                </Text>
              </View>
              <View style={styles.bigBarBg}>
                <View style={[styles.bigBarFill, {
                  width: `${habitSummary.consistencyRate}%`,
                  backgroundColor: rateColor(habitSummary.consistencyRate),
                }]} />
              </View>

              {/* Done / Missed */}
              <View style={styles.triRow}>
                <View style={styles.triCard}>
                  <Text style={[styles.triVal, { color: '#4CAF50' }]}>{habitSummary.totalDone}</Text>
                  <Text style={styles.triLbl}>Total Done</Text>
                </View>
                <View style={styles.triCard}>
                  <Text style={[styles.triVal, { color: '#FF6B6B' }]}>{habitSummary.totalMissed}</Text>
                  <Text style={styles.triLbl}>Total Missed</Text>
                </View>
                <View style={styles.triCard}>
                  <Text style={[styles.triVal, { color: rateColor(habitSummary.consistencyRate) }]}>
                    {habitSummary.consistencyRate}%
                  </Text>
                  <Text style={styles.triLbl}>Success Rate</Text>
                </View>
              </View>

              {/* Per-habit rows */}
              <Text style={styles.subTitle}>Habit Performance</Text>
              {habitSummary.habits.map((h, i) => (
                <View key={i} style={styles.habitRow}>
                  <View style={styles.habitRowTop}>
                    <View style={[styles.habitStatusDot, { backgroundColor: h.isActive ? '#4CAF50' : '#555' }]} />
                    <Text style={[styles.habitName, !h.isActive && { color: '#666' }]} numberOfLines={1}>{h.name}</Text>
                    <Text style={[styles.habitRate, { color: rateColor(h.rate) }]}>{h.rate}%</Text>
                  </View>
                  <View style={styles.habitBarBg}>
                    <View style={[styles.habitBarFill, {
                      width: `${h.rate}%`,
                      backgroundColor: rateColor(h.rate),
                    }]} />
                  </View>
                  <Text style={styles.habitMeta}>{h.done} done · {h.missed} missed {!h.isActive ? '· Inactive' : ''}</Text>
                </View>
              ))}

              {/* Habit insight */}
              <View style={[styles.insightBox, { borderColor: rateColor(habitSummary.consistencyRate), marginTop: 10 }]}>
                <Text style={[styles.insightText, { color: rateColor(habitSummary.consistencyRate) }]}>
                  {habitSummary.consistencyRate >= 80
                    ? '🔥 Outstanding habit consistency! You\'re building lasting routines that drive real results.'
                    : habitSummary.consistencyRate >= 60
                    ? '💪 Good progress. Focus on completing your top 3 habits daily to push above 80%.'
                    : habitSummary.consistencyRate > 0
                    ? '⚠️ Habit completion needs attention. Try turning off habits you can\'t maintain and focus on fewer, stronger ones.'
                    : '🌱 Start small — pick one habit and mark it done every day this week.'}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* ── Login Consistency ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📲 App Engagement</Text>
          <View style={styles.triRow}>
            <View style={styles.triCard}>
              <Text style={styles.triVal}>{sessionSummary.daysLoggedIn}</Text>
              <Text style={styles.triLbl}>Days logged in</Text>
            </View>
            <View style={styles.triCard}>
              <Text style={styles.triVal}>{sessionSummary.totalSessions}</Text>
              <Text style={styles.triLbl}>Sessions</Text>
            </View>
            <View style={styles.triCard}>
              <Text style={[styles.triVal, { color: '#F3AF41' }]}>{sessionSummary.streak}🔥</Text>
              <Text style={styles.triLbl}>Day streak</Text>
            </View>
          </View>
          <View style={styles.loginDayRow}>
            {days.map((d, i) => {
              const active = sessionSummary.loginDates.includes(d.date);
              return (
                <View key={i} style={styles.loginDayCol}>
                  <View style={[styles.loginDot, { backgroundColor: active ? '#F3AF41' : '#2a2335' }]} />
                  <Text style={styles.loginDayLabel}>{d.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { position: 'absolute', width: '100%', height: '100%', backgroundColor: '#15041f', zIndex: 400 },
  header1:   { height: 35, backgroundColor: '#15041f' },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#1e1929', borderBottomWidth: 1, borderBottomColor: '#362c3a' },
  title:     { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  closeIcon: { fontSize: 30, color: '#fff' },
  content:   { flex: 1, padding: 15 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#888', fontSize: 16 },
  emptyHint: { fontSize: 13, color: '#555', fontStyle: 'italic', textAlign: 'center', paddingVertical: 14 },
  subTitle:  { fontSize: 13, fontWeight: '700', color: '#aaa', marginTop: 14, marginBottom: 8 },

  // Score card
  scoreCard: { backgroundColor: '#1e1929', borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1.5, flexDirection: 'row' },
  scoreLeft: { flex: 1 },
  scoreWeek: { fontSize: 11, color: '#888', marginBottom: 4 },
  scorePct:  { fontSize: 44, fontWeight: '900', lineHeight: 48 },
  scoreLabel: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  scoreSub:  { fontSize: 12, color: '#888' },
  scoreRight: { flexWrap: 'wrap', flexDirection: 'row', width: 130, gap: 8, justifyContent: 'flex-end' },
  scoreStat: { alignItems: 'center', width: 56, backgroundColor: '#2a2335', borderRadius: 10, padding: 8, gap: 2 },
  scoreStatVal: { fontSize: 16, fontWeight: '800', color: '#fff' },
  scoreStatLbl: { fontSize: 9, color: '#888', textAlign: 'center' },

  // Section
  section: { backgroundColor: '#211c24', borderRadius: 16, padding: 16, marginBottom: 15 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#c67ee2', marginBottom: 14 },

  // Tri cards
  triRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  triCard: { flex: 1, backgroundColor: '#2a2335', borderRadius: 12, padding: 10, alignItems: 'center', gap: 3, borderWidth: 1, borderColor: '#362c3a' },
  triVal:  { fontSize: 20, fontWeight: '800', color: '#fff' },
  triLbl:  { fontSize: 10, color: '#888', textAlign: 'center' },

  // Insight box
  insightBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10, backgroundColor: 'rgba(0,0,0,0.2)' },
  insightText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },

  // Consistency days
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  dayCol: { alignItems: 'center', gap: 4 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  dayLabel:  { fontSize: 10, color: '#888' },
  dayMini:   { flexDirection: 'row', gap: 3 },
  miniDot:   { width: 6, height: 6, borderRadius: 3 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  legendItem:{ flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText:{ fontSize: 11, color: '#888' },
  miniLegend:{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  miniLegendText: { fontSize: 11, color: '#666' },

  // Daily compare bars
  dayCompareRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  dayCompareLabel: { width: 28, fontSize: 11, color: '#888', fontWeight: '600' },
  dayCompareBars: { flex: 1, gap: 3 },
  compareBarWrap: { height: 7, backgroundColor: '#2a2335', borderRadius: 4, overflow: 'hidden' },
  compareBar: { height: 7, borderRadius: 4 },
  dayCompareVal: { width: 36, fontSize: 10, color: '#888', textAlign: 'right' },
  compareLegend: { flexDirection: 'row', gap: 14, marginTop: 4, justifyContent: 'flex-end' },

  // Pie + macros
  pieRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 14 },
  pieDetails: { flex: 1, gap: 8 },
  pieCenterVal: { fontSize: 16, fontWeight: '800', color: '#fff' },
  pieCenterLbl: { fontSize: 10, color: '#888' },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  macroDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  macroLabel: { width: 50, fontSize: 11, color: '#ccc' },
  macroBarBg: { flex: 1, height: 6, backgroundColor: '#2a2335', borderRadius: 3, overflow: 'hidden' },
  macroBarFill: { height: 6, borderRadius: 3 },
  macroPct: { width: 32, fontSize: 11, color: '#888', textAlign: 'right' },

  // Bar chart
  barWrap: { alignItems: 'center', marginTop: 4 },

  // Rank rows
  rankRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2335', borderRadius: 10, padding: 10, marginBottom: 6, gap: 10 },
  rankNum: { fontSize: 14, fontWeight: '800', color: '#c67ee2', width: 18 },
  rankName: { fontSize: 13, fontWeight: '700', color: '#fff' },
  rankSub: { fontSize: 11, color: '#888' },
  rankCal: { fontSize: 13, fontWeight: '700', color: '#F3AF41' },

  // Balance box
  balanceBox: { backgroundColor: '#2a2335', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#362c3a' },
  balanceTitle: { fontSize: 13, fontWeight: '700', color: '#aaa', marginBottom: 10 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceSide: { alignItems: 'center', gap: 4 },
  balanceVal: { fontSize: 18, fontWeight: '800', color: '#fff' },
  balanceLbl: { fontSize: 10, color: '#888' },
  balanceMid: { alignItems: 'center' },
  balanceNet: { fontSize: 22, fontWeight: '900', color: '#c67ee2' },
  balanceNetLbl: { fontSize: 10, color: '#888' },

  // Habits
  habitScoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  habitScoreLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  habitScoreSub: { fontSize: 11, color: '#888', marginTop: 2 },
  habitScorePct: { fontSize: 36, fontWeight: '900' },
  bigBarBg: { height: 10, backgroundColor: '#2a2335', borderRadius: 5, overflow: 'hidden', marginBottom: 14 },
  bigBarFill: { height: 10, borderRadius: 5 },
  habitRow: { marginBottom: 10 },
  habitRowTop: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  habitStatusDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  habitName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#ccc' },
  habitRate: { fontSize: 13, fontWeight: '800' },
  habitBarBg: { height: 7, backgroundColor: '#2a2335', borderRadius: 4, overflow: 'hidden', marginBottom: 3 },
  habitBarFill: { height: 7, borderRadius: 4 },
  habitMeta: { fontSize: 10, color: '#555' },

  // Login dots
  loginDayRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  loginDayCol: { alignItems: 'center', gap: 4 },
  loginDot: { width: 30, height: 30, borderRadius: 15 },
  loginDayLabel: { fontSize: 10, color: '#888' },
});