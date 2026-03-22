// RemindersScreen.tsx — Live habits from Supabase, consistency tracker, daily schedule
import {
  StyleSheet, Text, View, ScrollView, Pressable,
  Switch, Alert, ActivityIndicator,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import Icon from "react-native-vector-icons/FontAwesome";
import Icon2 from "react-native-vector-icons/AntDesign";
import Icon5 from "react-native-vector-icons/FontAwesome5";
import supabase from "../lib/supabase";
import { ThemeColors, DEFAULT_THEME } from '../components/theme';


// ─── Types ────────────────────────────────────────────────────────────────────
export interface HabitReminder {
  id: number | string;
  name: string;
  benefits: string;
  alarmTime: string;
  date: string;
  repeat: string;
  isActive: boolean;
  isDone: boolean;
  lastCompleted?: string;
  totalDone: number;
  totalUndone: number;
}

export type AddHabitFunction = () => void;

interface RemindersScreenProps {
  onClose: () => void;
  themeColors?: ThemeColors;
  onNavigateToAddHabit: () => void;
  reminders?: HabitReminder[];
  setReminders?: React.Dispatch<React.SetStateAction<HabitReminder[]>>;
  addNewHabit?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getConsistencyColor = (rate: number) => {
  if (rate >= 80) return '#4CAF50';
  if (rate >= 60) return '#FFA500';
  return '#FF6B6B';
};

const getConsistencyLabel = (rate: number) => {
  if (rate >= 80) return 'Excellent 🔥';
  if (rate >= 60) return 'On Track 👍';
  if (rate >= 40) return 'Needs Work 💪';
  return 'Just Starting 🌱';
};

// Parse "08:00 AM" or "08:00" → minutes from midnight for sorting
const timeToMinutes = (t: string): number => {
  if (!t) return 999;
  const upper = t.toUpperCase();
  const isPM  = upper.includes('PM');
  const isAM  = upper.includes('AM');
  const clean = t.replace(/[^0-9:]/g, '').trim();
  const [h, m] = clean.split(':').map(Number);
  let hours = h || 0;
  if (isPM && hours !== 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + (m || 0);
};

// ─── ProgressBar ──────────────────────────────────────────────────────────────
const MiniBar = ({ value, total, color }: { value: number; total: number; color: string }) => {
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  return (
    <View style={barStyles.bg}>
      <View style={[barStyles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
};
const barStyles = StyleSheet.create({
  bg:   { height: 6, backgroundColor: '#2a2335', borderRadius: 3, overflow: 'hidden', flex: 1 },
  fill: { height: 6, borderRadius: 3 },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RemindersScreen({
  onClose,
  onNavigateToAddHabit,
  addNewHabit,
  reminders: externalReminders,
  setReminders: setExternalReminders,
  themeColors = DEFAULT_THEME,
}: RemindersScreenProps) {
  const [localReminders, setLocalReminders] = useState<HabitReminder[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState<string | number | null>(null); // id being saved

  // Use external state if provided (from dashboard), else own state
  const reminders    = externalReminders    ?? localReminders;
  const setReminders = setExternalReminders ?? setLocalReminders;

  // ── Fetch all reminders for the logged-in user ─────────────────────────────
  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('user_reminders')
        .select('id, name, benefits, alarm_time, date, repeat, is_active, total_done, total_undone')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) { setLoading(false); return; }

      const mapped: HabitReminder[] = data.map((r: any) => ({
        id:           r.id,
        name:         r.name        ?? 'Habit',
        benefits:     r.benefits    ?? '',
        alarmTime:    r.alarm_time  ?? '08:00 AM',
        date:         r.date        ?? new Date().toISOString().split('T')[0],
        repeat:       r.repeat      ?? 'Daily',
        isActive:     r.is_active   ?? true,
        isDone:       false,
        totalDone:    r.total_done  ?? 0,
        totalUndone:  r.total_undone ?? 0,
      }));
      setReminders(mapped);
    } catch (e: any) {
      console.warn('fetchReminders:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch from Supabase if no external reminders were passed
    if (!externalReminders || externalReminders.length === 0) {
      fetchReminders();
    } else {
      setLoading(false);
    }
  }, []);

  // ── Toggle active/inactive + persist ──────────────────────────────────────
  const toggleActive = async (id: number | string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    const newVal = !reminder.isActive;

    // Optimistic update
    setReminders(prev => prev.map(r => r.id === id ? { ...r, isActive: newVal } : r));
    setSaving(id);
    try {
      await supabase
        .from('user_reminders')
        .update({ is_active: newVal })
        .eq('id', id);
    } catch (e: any) {
      // Rollback
      setReminders(prev => prev.map(r => r.id === id ? { ...r, isActive: !newVal } : r));
      Alert.alert('Error', 'Failed to update reminder.');
    } finally { setSaving(null); }
  };

  // ── Mark done + persist ────────────────────────────────────────────────────
  const markDone = async (id: number | string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder || reminder.isDone) return;
    const newDone = reminder.totalDone + 1;

    setReminders(prev => prev.map(r =>
      r.id === id ? { ...r, isDone: true, totalDone: newDone, lastCompleted: new Date().toISOString() } : r
    ));
    setSaving(id);
    try {
      await supabase
        .from('user_reminders')
        .update({ total_done: newDone })
        .eq('id', id);
      Alert.alert('✅ Habit Done!', `"${reminder.name}" marked as complete. Keep it up!`);
    } catch (e: any) {
      setReminders(prev => prev.map(r =>
        r.id === id ? { ...r, isDone: false, totalDone: reminder.totalDone } : r
      ));
      Alert.alert('Error', 'Failed to save progress.');
    } finally { setSaving(null); }
  };

  // ── Undo done ──────────────────────────────────────────────────────────────
  const undoDone = async (id: number | string) => {
    const reminder = reminders.find(r => r.id === id);
    if (!reminder || !reminder.isDone) return;
    const newDone = Math.max(reminder.totalDone - 1, 0);

    setReminders(prev => prev.map(r =>
      r.id === id ? { ...r, isDone: false, totalDone: newDone } : r
    ));
    setSaving(id);
    try {
      await supabase.from('user_reminders').update({ total_done: newDone }).eq('id', id);
    } catch (e: any) {
      setReminders(prev => prev.map(r =>
        r.id === id ? { ...r, isDone: true, totalDone: reminder.totalDone } : r
      ));
    } finally { setSaving(null); }
  };

  // ── End of day — mark all pending active reminders as missed ───────────────
  const endOfDay = async () => {
    Alert.alert(
      'End of Day Check',
      'Mark all uncompleted habits as missed for today?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            const today = new Date().toISOString().split('T')[0];
            const toMiss = reminders.filter(r =>
              r.isActive && !r.isDone &&
              (r.date === today || r.repeat === 'Daily' || r.repeat === 'Weekdays')
            );
            if (toMiss.length === 0) {
              Alert.alert('All done!', 'No pending habits to mark.');
              return;
            }
            // Optimistic
            setReminders(prev => prev.map(r =>
              toMiss.find(m => m.id === r.id)
                ? { ...r, totalUndone: r.totalUndone + 1 }
                : r
            ));
            // Persist each — wrap in async so Promise.all can handle errors
            await Promise.all(toMiss.map(async r => {
              try {
                await supabase
                  .from('user_reminders')
                  .update({ total_undone: r.totalUndone + 1 })
                  .eq('id', r.id);
              } catch (_) {}
            }));
            Alert.alert('Done', `${toMiss.length} habit${toMiss.length > 1 ? 's' : ''} marked as missed.`);
          },
        },
      ]
    );
  };

  // ─── Derived data ──────────────────────────────────────────────────────────
  const activeReminders   = reminders.filter(r => r.isActive);
  const inactiveReminders = reminders.filter(r => !r.isActive);
  const totalDone   = reminders.reduce((s, r) => s + r.totalDone, 0);
  const totalUndone = reminders.reduce((s, r) => s + r.totalUndone, 0);
  const overallRate = totalDone + totalUndone > 0
    ? Math.round((totalDone / (totalDone + totalUndone)) * 100) : 0;

  // Daily schedule — only active, sorted by time
  const today = new Date().toISOString().split('T')[0];
  const todaySchedule = activeReminders
    .filter(r => r.repeat === 'Daily' || r.date === today ||
      (r.repeat === 'Weekdays' && new Date().getDay() >= 1 && new Date().getDay() <= 5))
    .sort((a, b) => timeToMinutes(a.alarmTime) - timeToMinutes(b.alarmTime));

  const todayDone    = todaySchedule.filter(r => r.isDone).length;
  const todayPending = todaySchedule.filter(r => !r.isDone).length;

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch { return d; }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header1, { backgroundColor: themeColors.background }]} />
      <View style={[styles.header, { backgroundColor: themeColors.secondary, borderBottomColor: themeColors.primary + "44" }]}>
        <Text style={[styles.title, { color: themeColors.text }]}>Reminders</Text>
        <Pressable onPress={onClose}>
          <Icon name="times-circle" style={[styles.closeIcon, { color: themeColors.text }]} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#c67ee2" />
          <Text style={styles.loadingText}>Loading your habits…</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── Summary Stats ─────────────────────────────────────────────── */}
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { borderColor: '#4CAF50' }]}>
              <Icon name="bell" style={[styles.summaryIcon, { color: '#4CAF50' }]} />
              <Text style={styles.summaryValue}>{activeReminders.length}</Text>
              <Text style={styles.summaryLabel}>Active</Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: '#666' }]}>
              <Icon name="bell-slash" style={[styles.summaryIcon, { color: '#666' }]} />
              <Text style={styles.summaryValue}>{inactiveReminders.length}</Text>
              <Text style={styles.summaryLabel}>Inactive</Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: '#c67ee2' }]}>
              <Icon5 name="calendar-check" style={[styles.summaryIcon, { color: '#c67ee2' }]} />
              <Text style={styles.summaryValue}>{todaySchedule.length}</Text>
              <Text style={styles.summaryLabel}>Today</Text>
            </View>
            <View style={[styles.summaryCard, { borderColor: '#F3AF41' }]}>
              <Icon name="list" style={[styles.summaryIcon, { color: '#F3AF41' }]} />
              <Text style={styles.summaryValue}>{reminders.length}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </View>
          </View>

          {/* ── Consistency Progress Tracker ──────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>📊 Consistency Tracker</Text>

            {reminders.length === 0 ? (
              <Text style={styles.emptyHint}>Create habits to start tracking your consistency.</Text>
            ) : (
              <>
                {/* Overall rate */}
                <View style={styles.rateRow}>
                  <View>
                    <Text style={styles.rateLabel}>Overall Completion Rate</Text>
                    <Text style={styles.rateSubLabel}>{getConsistencyLabel(overallRate)}</Text>
                  </View>
                  <Text style={[styles.ratePct, { color: getConsistencyColor(overallRate) }]}>
                    {overallRate}%
                  </Text>
                </View>
                <View style={styles.bigBarBg}>
                  <View style={[styles.bigBarFill, {
                    width: `${overallRate}%`,
                    backgroundColor: getConsistencyColor(overallRate),
                  }]} />
                </View>

                {/* Done / Missed stats */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Icon name="check-circle" style={styles.statIconGreen} />
                    <Text style={styles.statNum}>{totalDone}</Text>
                    <Text style={styles.statLbl}>Total Done</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Icon name="times-circle" style={styles.statIconRed} />
                    <Text style={styles.statNum}>{totalUndone}</Text>
                    <Text style={styles.statLbl}>Total Missed</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Icon name="circle-o" style={styles.statIconGrey} />
                    <Text style={styles.statNum}>{todayPending}</Text>
                    <Text style={styles.statLbl}>Today Pending</Text>
                  </View>
                </View>

                {/* Per-habit mini tracker */}
                {reminders.length > 0 && (
                  <View style={styles.habitBarsBox}>
                    <Text style={styles.habitBarsTitle}>Per Habit Progress</Text>
                    {reminders.map(r => {
                      const total = r.totalDone + r.totalUndone;
                      const pct = total > 0 ? Math.round((r.totalDone / total) * 100) : 0;
                      const col = getConsistencyColor(pct);
                      return (
                        <View key={r.id} style={styles.habitBarRow}>
                          <View style={styles.habitBarLeft}>
                            <View style={[styles.habitDot, { backgroundColor: r.isActive ? '#4CAF50' : '#555' }]} />
                            <Text style={styles.habitBarName} numberOfLines={1}>{r.name}</Text>
                          </View>
                          <MiniBar value={r.totalDone} total={total || 1} color={col} />
                          <Text style={[styles.habitBarPct, { color: col }]}>{pct}%</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>

          {/* ── Quick Actions ──────────────────────────────────────────────── */}
          <View style={styles.actionsRow}>
            <Pressable style={styles.addBtn} onPress={() => {
              if (onNavigateToAddHabit) onNavigateToAddHabit();
              if (addNewHabit) addNewHabit();
            }}>
              <Icon name="plus-circle" style={styles.addBtnIcon} />
              <Text style={styles.addBtnText}>Add New Habit</Text>
            </Pressable>
            <Pressable style={styles.endDayBtn} onPress={endOfDay}>
              <Icon2 name="moon" style={styles.endDayBtnIcon} />
              <Text style={styles.endDayBtnText}>End of Day</Text>
            </Pressable>
          </View>

          {/* ── Today's Daily Schedule ─────────────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <View style={styles.secRow}>
              <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>🗓 Today's Schedule</Text>
              <View style={styles.todayBadge}>
                <Text style={styles.todayBadgeText}>{todayDone}/{todaySchedule.length} done</Text>
              </View>
            </View>

            {todaySchedule.length === 0 ? (
              <Text style={styles.emptyHint}>No habits scheduled for today. Add one!</Text>
            ) : (
              <View style={styles.timeline}>
                {todaySchedule.map((r, i) => (
                  <View key={r.id} style={styles.timelineItem}>
                    {/* Time column */}
                    <View style={styles.timeCol}>
                      <Text style={[styles.timeText, r.isDone && { color: '#4CAF50' }]}>
                        {r.alarmTime}
                      </Text>
                    </View>

                    {/* Line + dot */}
                    <View style={styles.timelineTrack}>
                      <Pressable onPress={() => r.isDone ? undoDone(r.id) : markDone(r.id)}>
                        <View style={[
                          styles.timelineDot,
                          { backgroundColor: r.isDone ? '#4CAF50' : r.isActive ? '#c67ee2' : '#555' }
                        ]}>
                          {r.isDone
                            ? <Icon name="check" size={10} color="#fff" />
                            : <Icon name="bell" size={9} color="#fff" />
                          }
                        </View>
                      </Pressable>
                      {i < todaySchedule.length - 1 && <View style={styles.timelineLine} />}
                    </View>

                    {/* Content */}
                    <View style={styles.timelineContent}>
                      <Text style={[styles.tlName, r.isDone && styles.tlNameDone]} numberOfLines={1}>
                        {r.name}
                      </Text>
                      <Text style={styles.tlRepeat}>{r.repeat}</Text>
                    </View>

                    {/* Status */}
                    <View style={[styles.tlStatus, {
                      backgroundColor: r.isDone ? 'rgba(76,175,80,0.15)' : 'rgba(198,126,226,0.1)'
                    }]}>
                      <Text style={[styles.tlStatusText, { color: r.isDone ? '#4CAF50' : '#c67ee2' }]}>
                        {r.isDone ? 'Done' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Active Reminders ──────────────────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <View style={styles.secRow}>
              <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>🔔 Active Reminders</Text>
              <View style={[styles.countBadge, { backgroundColor: 'rgba(76,175,80,0.2)' }]}>
                <Text style={[styles.countBadgeText, { color: '#4CAF50' }]}>{activeReminders.length}</Text>
              </View>
            </View>

            {activeReminders.length === 0 ? (
              <Text style={styles.emptyHint}>No active reminders. Tap "Add New Habit" to create one.</Text>
            ) : (
              activeReminders.map(r => (
                <View key={r.id} style={[styles.reminderCard, r.isDone && styles.reminderCardDone]}>
                  <View style={styles.cardHeader}>
                    <Icon
                      name={r.isDone ? 'check-circle' : 'bell'}
                      style={[styles.cardIcon, { color: r.isDone ? '#4CAF50' : '#c67ee2' }]}
                    />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{r.name}</Text>
                      <Text style={styles.cardBenefits} numberOfLines={2}>{r.benefits}</Text>
                    </View>
                    <Switch
                      value={r.isActive}
                      onValueChange={() => toggleActive(r.id)}
                      trackColor={{ false: '#362c3a', true: 'rgba(198,126,226,0.4)' }}
                      thumbColor={r.isActive ? '#c67ee2' : '#666'}
                      disabled={saving === r.id}
                    />
                  </View>

                  <View style={styles.cardDetails}>
                    <View style={styles.detailPill}>
                      <Icon2 name="clock-circle" style={styles.pillIcon} />
                      <Text style={styles.pillText}>{r.alarmTime}</Text>
                    </View>
                    <View style={styles.detailPill}>
                      <Icon2 name="redo" style={styles.pillIcon} />
                      <Text style={styles.pillText}>{r.repeat}</Text>
                    </View>
                    <View style={styles.detailPill}>
                      <Icon name="calendar" style={styles.pillIcon} />
                      <Text style={styles.pillText}>{formatDate(r.date)}</Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.cardProgressRow}>
                    <Text style={styles.cardProgressLabel}>
                      {r.totalDone} done · {r.totalUndone} missed
                    </Text>
                    <View style={styles.cardProgressBar}>
                      <View style={[styles.cardProgressFill, {
                        width: `${(r.totalDone + r.totalUndone) > 0
                          ? Math.round((r.totalDone / (r.totalDone + r.totalUndone)) * 100)
                          : 0}%`,
                        backgroundColor: getConsistencyColor(
                          (r.totalDone + r.totalUndone) > 0
                            ? Math.round((r.totalDone / (r.totalDone + r.totalUndone)) * 100)
                            : 0
                        ),
                      }]} />
                    </View>
                  </View>

                  {/* Action buttons */}
                  <View style={styles.cardActions}>
                    {saving === r.id ? (
                      <ActivityIndicator color="#c67ee2" size="small" style={{ flex: 1 }} />
                    ) : !r.isDone ? (
                      <Pressable style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]} onPress={() => markDone(r.id)}>
                        <Icon name="check" style={styles.actionBtnIcon} />
                        <Text style={styles.actionBtnText}>Mark Done</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={[styles.actionBtn, { backgroundColor: '#FFA500' }]} onPress={() => undoDone(r.id)}>
                        <Icon name="undo" style={styles.actionBtnIcon} />
                        <Text style={styles.actionBtnText}>Undo</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: '#362c3a' }]}
                      onPress={() => toggleActive(r.id)}
                      disabled={saving === r.id}
                    >
                      <Icon name="bell-slash" style={styles.actionBtnIcon} />
                      <Text style={styles.actionBtnText}>Turn Off</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* ── Inactive Reminders ────────────────────────────────────────── */}
          {inactiveReminders.length > 0 && (
            <View style={[styles.section, { backgroundColor: themeColors.card }]}>
              <View style={styles.secRow}>
                <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>🔕 Inactive Reminders</Text>
                <View style={[styles.countBadge, { backgroundColor: 'rgba(100,100,100,0.2)' }]}>
                  <Text style={[styles.countBadgeText, { color: '#888' }]}>{inactiveReminders.length}</Text>
                </View>
              </View>

              {inactiveReminders.map(r => (
                <View key={r.id} style={[styles.reminderCard, styles.reminderCardInactive]}>
                  <View style={styles.cardHeader}>
                    <Icon name="bell-slash" style={[styles.cardIcon, { color: '#555' }]} />
                    <View style={styles.cardInfo}>
                      <Text style={[styles.cardName, { color: '#888' }]}>{r.name}</Text>
                      <Text style={[styles.cardBenefits, { color: '#555' }]} numberOfLines={1}>{r.benefits}</Text>
                    </View>
                    <Switch
                      value={r.isActive}
                      onValueChange={() => toggleActive(r.id)}
                      trackColor={{ false: '#2a2335', true: 'rgba(198,126,226,0.4)' }}
                      thumbColor="#555"
                      disabled={saving === r.id}
                    />
                  </View>

                  <View style={styles.cardDetails}>
                    <View style={styles.detailPill}>
                      <Icon2 name="clock-circle" style={[styles.pillIcon, { color: '#555' }]} />
                      <Text style={[styles.pillText, { color: '#555' }]}>{r.alarmTime}</Text>
                    </View>
                    <View style={styles.detailPill}>
                      <Icon2 name="redo" style={[styles.pillIcon, { color: '#555' }]} />
                      <Text style={[styles.pillText, { color: '#555' }]}>{r.repeat}</Text>
                    </View>
                  </View>

                  <View style={styles.cardProgressRow}>
                    <Text style={[styles.cardProgressLabel, { color: '#555' }]}>
                      {r.totalDone} done · {r.totalUndone} missed
                    </Text>
                  </View>

                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: '#4CAF50', alignSelf: 'flex-start' }]}
                    onPress={() => toggleActive(r.id)}
                    disabled={saving === r.id}
                  >
                    {saving === r.id
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <><Icon name="bell" style={styles.actionBtnIcon} /><Text style={styles.actionBtnText}>Turn On</Text></>
                    }
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* ── How It Works ──────────────────────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>💡 How It Works</Text>
            <View style={styles.instructionCard}>
              {[
                { icon: 'bell',         lib: 'fa',  text: 'Active Reminders',   body: 'Turn on habits to include them in your daily schedule and consistency tracker.' },
                { icon: 'check-circle', lib: 'fa',  text: 'Mark Done',          body: 'Tap "Mark Done" on any habit when you complete it. Your streak grows!' },
                { icon: 'moon',         lib: 'ant', text: 'End of Day',         body: 'Tap this at night to mark all incomplete habits as missed for the day.' },
                { icon: 'line-chart',   lib: 'ant', text: 'Consistency Tracker', body: 'Your done vs missed ratio drives the % bar. Aim for 80%+ for Excellent.' },
                { icon: 'clock-circle', lib: 'ant', text: 'Daily Schedule',     body: 'All active habits sorted by alarm time appear here each day.' },
              ].map((item, i) => (
                <View key={i} style={styles.instructionRow}>
                  {item.lib === 'fa'
                    ? <Icon name={item.icon} style={styles.instrIcon} />
                    : <Icon2 name={item.icon} style={styles.instrIcon} />
                  }
                  <Text style={styles.instrText}>
                    <Text style={styles.instrBold}>{item.text}: </Text>{item.body}
                  </Text>
                </View>
              ))}
            </View>
          </View>

        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#15041f', zIndex: 400 },
  header1:   { height: 35, backgroundColor: '#15041f' },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#1e1929', borderBottomWidth: 1, borderBottomColor: '#362c3a' },
  title:     { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  closeIcon: { fontSize: 30, color: '#fff' },
  content:   { flex: 1, padding: 15 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#888', fontSize: 16 },
  emptyHint: { fontSize: 13, color: '#555', fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },

  // Summary row
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  summaryCard: { flex: 1, backgroundColor: '#211c24', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, gap: 4 },
  summaryIcon: { fontSize: 20 },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: 10, color: '#888', fontWeight: '600' },

  // Section
  section: { backgroundColor: '#211c24', borderRadius: 16, padding: 16, marginBottom: 15 },
  secRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#c67ee2' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  countBadgeText: { fontSize: 13, fontWeight: '700' },

  // Consistency tracker
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rateLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
  rateSubLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  ratePct: { fontSize: 32, fontWeight: '900' },
  bigBarBg: { height: 12, backgroundColor: '#2a2335', borderRadius: 6, overflow: 'hidden', marginBottom: 16 },
  bigBarFill: { height: 12, borderRadius: 6 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 14 },
  statBox: { alignItems: 'center', flex: 1, gap: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: '#362c3a' },
  statIconGreen: { fontSize: 22, color: '#4CAF50' },
  statIconRed: { fontSize: 22, color: '#FF6B6B' },
  statIconGrey: { fontSize: 22, color: '#666' },
  statNum: { fontSize: 20, fontWeight: '800', color: '#fff' },
  statLbl: { fontSize: 11, color: '#888' },
  habitBarsBox: { backgroundColor: '#2a2335', borderRadius: 12, padding: 12, gap: 10 },
  habitBarsTitle: { fontSize: 12, fontWeight: '700', color: '#aaa', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  habitBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  habitBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 120 },
  habitDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  habitBarName: { fontSize: 12, color: '#ccc', flex: 1 },
  habitBarPct: { fontSize: 11, fontWeight: '700', width: 32, textAlign: 'right' },

  // Quick actions
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#c67ee2', borderRadius: 12, padding: 13, gap: 8 },
  addBtnIcon: { fontSize: 18, color: '#fff' },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  endDayBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a2335', borderRadius: 12, padding: 13, gap: 8, borderWidth: 1, borderColor: '#362c3a' },
  endDayBtnIcon: { fontSize: 18, color: '#ccc' },
  endDayBtnText: { fontSize: 14, fontWeight: '700', color: '#ccc' },

  // Today's schedule / timeline
  todayBadge: { backgroundColor: 'rgba(198,126,226,0.15)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  todayBadgeText: { fontSize: 12, color: '#c67ee2', fontWeight: '700' },
  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  timeCol: { width: 78, paddingTop: 6 },
  timeText: { fontSize: 13, fontWeight: '700', color: '#c67ee2' },
  timelineTrack: { alignItems: 'center', width: 28 },
  timelineDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  timelineLine: { width: 2, flex: 1, minHeight: 20, backgroundColor: '#362c3a', marginVertical: 2 },
  timelineContent: { flex: 1, paddingLeft: 10, paddingTop: 5, paddingBottom: 14 },
  tlName: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  tlNameDone: { textDecorationLine: 'line-through', color: '#4CAF50' },
  tlRepeat: { fontSize: 11, color: '#666' },
  tlStatus: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  tlStatusText: { fontSize: 11, fontWeight: '700' },

  // Reminder cards
  reminderCard: { backgroundColor: '#1a1528', borderRadius: 14, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#c67ee2' },
  reminderCardDone: { borderLeftColor: '#4CAF50' },
  reminderCardInactive: { borderLeftColor: '#333', opacity: 0.7 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  cardIcon: { fontSize: 22, marginTop: 2 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 3 },
  cardBenefits: { fontSize: 12, color: '#888', lineHeight: 16 },
  cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  detailPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2335', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 5 },
  pillIcon: { fontSize: 12, color: '#c67ee2' },
  pillText: { fontSize: 12, color: '#ccc', fontWeight: '600' },
  cardProgressRow: { marginBottom: 10 },
  cardProgressLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  cardProgressBar: { height: 6, backgroundColor: '#2a2335', borderRadius: 3, overflow: 'hidden' },
  cardProgressFill: { height: 6, borderRadius: 3 },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1, width: 80, height: 25, borderRadius: 10, gap: 6 },
  actionBtnIcon: { fontSize: 14, color: '#fff' },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // How it works
  instructionCard: { marginTop: 10, gap: 12 },
  instructionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  instrIcon: { fontSize: 17, color: '#c67ee2', marginTop: 2 },
  instrText: { fontSize: 13, color: '#ccc', flex: 1, lineHeight: 19 },
  instrBold: { fontWeight: '700', color: '#fff' },
});