// Reminders Screen Component - Revised with active/inactive tracking and consistency overview
import { StyleSheet, Text, View, ScrollView, Pressable, Switch, Alert } from "react-native";
import React, { useState, useEffect } from "react";
import Icon from "react-native-vector-icons/FontAwesome";
import Icon2 from "react-native-vector-icons/AntDesign";

interface RemindersScreenProps {
  onClose: () => void;
  onNavigateToAddHabit: () => void;
  reminders?: HabitReminder[];
  setReminders?: React.Dispatch<React.SetStateAction<HabitReminder[]>>;
  addNewHabit?: () => void;
}

export interface HabitReminder {
  id: number;
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

// Function type for adding a new habit
export type AddHabitFunction = () => void;

// Initial mock data with tracking fields
const INITIAL_REMINDERS: HabitReminder[] = [
  {
    id: 1,
    name: 'Eat more protein',
    benefits: 'Builds muscle, supports metabolism, promotes satiety.',
    alarmTime: '08:00 AM',
    date: '2024-01-15',
    repeat: 'Daily',
    isActive: true,
    isDone: false,
    totalDone: 5,
    totalUndone: 2,
  },
  {
    id: 2,
    name: 'Drink more water',
    benefits: 'Hydrates the body, improves digestion, boosts energy.',
    alarmTime: '09:00 AM',
    date: '2024-01-15',
    repeat: 'Daily',
    isActive: true,
    isDone: false,
    totalDone: 7,
    totalUndone: 1,
  },
  {
    id: 3,
    name: 'Eat more fruit',
    benefits: 'Provides vitamins, antioxidants, supports immune health.',
    alarmTime: '12:00 PM',
    date: '2024-01-16',
    repeat: 'Weekdays',
    isActive: true,
    isDone: false,
    totalDone: 4,
    totalUndone: 3,
  },
  {
    id: 4,
    name: 'Eat more vegetables',
    benefits: 'Rich in fiber, vitamins, reduces disease risk.',
    alarmTime: '01:00 PM',
    date: '2024-01-16',
    repeat: 'Daily',
    isActive: true,
    isDone: false,
    totalDone: 6,
    totalUndone: 2,
  },
  {
    id: 5,
    name: 'Log a daily meal',
    benefits: 'Tracks nutrition, promotes mindful eating, aids weight management.',
    alarmTime: '07:00 PM',
    date: '2024-01-17',
    repeat: 'Daily',
    isActive: true,
    isDone: false,
    totalDone: 3,
    totalUndone: 4,
  },
  {
    id: 6,
    name: 'Get more exercise',
    benefits: 'Strengthens muscles, improves cardiovascular health, boosts mood.',
    alarmTime: '06:00 AM',
    date: '2024-01-17',
    repeat: 'Weekdays',
    isActive: false,
    isDone: false,
    totalDone: 2,
    totalUndone: 5,
  },
  {
    id: 7,
    name: 'Reduce added sugar',
    benefits: 'Lowers calorie intake, improves dental health, stabilizes energy.',
    alarmTime: '10:00 AM',
    date: '2024-01-18',
    repeat: 'Daily',
    isActive: true,
    isDone: false,
    totalDone: 8,
    totalUndone: 0,
  },
];

export default function RemindersScreen({ 
  onClose, 
  onNavigateToAddHabit,
  addNewHabit,
  reminders: externalReminders,
  setReminders: setExternalReminders
}: RemindersScreenProps) {
  // Use external reminders if provided, otherwise use local state
  const [localReminders, setLocalReminders] = useState<HabitReminder[]>(INITIAL_REMINDERS);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Use either external or local reminders
  const reminders = externalReminders || localReminders;
  const setReminders = setExternalReminders || setLocalReminders;

  // Calculate statistics
  const activeReminders = reminders.filter(r => r.isActive);
  const inactiveReminders = reminders.filter(r => !r.isActive);
  const todayReminders = reminders.filter(r => {
    const today = new Date().toISOString().split('T')[0];
    return r.date === today || r.repeat === 'Daily';
  });
  
  // Calculate total done and undone across all reminders
  const totalDone = reminders.reduce((sum, r) => sum + r.totalDone, 0);
  const totalUndone = reminders.reduce((sum, r) => sum + r.totalUndone, 0);
  const consistencyRate = totalDone + totalUndone > 0 
    ? Math.round((totalDone / (totalDone + totalUndone)) * 100) 
    : 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Toggle reminder active/inactive status
  const toggleReminderActive = (id: number) => {
    setReminders(prev => prev.map(reminder => 
      reminder.id === id 
        ? { ...reminder, isActive: !reminder.isActive }
        : reminder
    ));
  };

  // Mark reminder as done (user dismissed alarm)
  const markAsDone = (id: number) => {
    setReminders(prev => prev.map(reminder => 
      reminder.id === id 
        ? { 
            ...reminder, 
            isDone: true, 
            lastCompleted: new Date().toISOString(),
            totalDone: reminder.totalDone + 1
          }
        : reminder
    ));
    Alert.alert('Habit Completed', 'Great job! This habit has been marked as done.');
  };

  // Mark reminder as undone (user didn't dismiss alarm - auto called at end of day)
  const markAsUndone = (id: number) => {
    setReminders(prev => prev.map(reminder => 
      reminder.id === id 
        ? { 
            ...reminder, 
            isDone: false,
            totalUndone: reminder.totalUndone + 1
          }
        : reminder
    ));
  };

  // Mark all pending reminders as undone (for end of day automation)
  const markAllPendingAsUndone = () => {
    const today = new Date().toISOString().split('T')[0];
    setReminders(prev => prev.map(reminder => 
      reminder.isActive && !reminder.isDone && (reminder.date === today || reminder.repeat === 'Daily')
        ? { 
            ...reminder, 
            isDone: false,
            totalUndone: reminder.totalUndone + 1
          }
        : reminder
    ));
    Alert.alert('End of Day', 'All pending reminders have been marked as undone.');
  };

  // Reset all today's reminders for new day
  const resetTodayReminders = () => {
    setReminders(prev => prev.map(reminder => 
      ({ ...reminder, isDone: false })
    ));
  };

  // Get consistency color
  const getConsistencyColor = (rate: number) => {
    if (rate >= 80) return '#4CAF50'; // Green
    if (rate >= 60) return '#FFA500'; // Orange
    return '#FF6B6B'; // Red
  };

  return (
    <View style={styles.container}>
      <View style={styles.header1} />
      <View style={styles.header}>
        <Text style={styles.title}>Reminders</Text>
        <Pressable onPress={onClose}>
          <Icon style={styles.closeIcon} name="times-circle" />
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Icon style={styles.summaryIcon} name="bell" />
            <Text style={styles.summaryValue}>{activeReminders.length}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryItem}>
            <Icon style={styles.summaryIcon} name="bell-slash" />
            <Text style={styles.summaryValue}>{inactiveReminders.length}</Text>
            <Text style={styles.summaryLabel}>Inactive</Text>
          </View>
          <View style={styles.summaryItem}>
            <Icon style={styles.summaryIcon} name="calendar" />
            <Text style={styles.summaryValue}>{reminders.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>

        {/* Consistency Overview */}
        <View style={styles.consistencySection}>
          <Text style={styles.sectionTitle}>Your Consistency Overview</Text>
          <View style={styles.consistencyCard}>
            <View style={styles.consistencyHeader}>
              <Text style={styles.consistencyTitle}>Overall Progress</Text>
              <Text style={[styles.consistencyRate, { color: getConsistencyColor(consistencyRate) }]}>
                {consistencyRate}%
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${consistencyRate}%`, backgroundColor: getConsistencyColor(consistencyRate) }]} />
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Icon style={styles.checkIcon} name="check-circle" />
                <Text style={styles.statValue}>{totalDone}</Text>
                <Text style={styles.statLabel}>Total Done</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Icon style={styles.uncheckIcon} name="times-circle" />
                <Text style={styles.statValue}>{totalUndone}</Text>
                <Text style={styles.statLabel}>Total Undone</Text>
              </View>
            </View>
            <Text style={styles.consistencyNote}>
              Track your habits to see your consistency improve!
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
<Pressable style={styles.addHabitButton} onPress={() => {
            if (onNavigateToAddHabit) onNavigateToAddHabit();
            if (addNewHabit) addNewHabit();
          }}>
            <Icon style={styles.addIcon} name="plus-circle" />
            <Text style={styles.addHabitText}>Add New Habit</Text>
          </Pressable>
          <Pressable style={styles.endDayButton} onPress={markAllPendingAsUndone}>
            <Icon2 style={styles.endDayIcon} name="moon" />
            <Text style={styles.endDayText}>End of Day Check</Text>
          </Pressable>
        </View>

        {/* Active Reminders */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Reminders</Text>
          {activeReminders.map((reminder) => (
            <View key={reminder.id} style={[styles.reminderCard, reminder.isDone && styles.reminderCardDone]}>
              <View style={styles.reminderHeader}>
                <View style={styles.reminderLeft}>
                  <Icon style={styles.reminderIcon} name={reminder.isDone ? "check-circle" : "bell"} />
                  <View style={styles.reminderInfo}>
                    <Text style={styles.reminderName}>{reminder.name}</Text>
                    <Text style={styles.reminderBenefits}>{reminder.benefits}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, reminder.isActive && styles.statusBadgeActive]}>
                  <Text style={[styles.statusText, reminder.isActive && styles.statusTextActive]}>
                    {reminder.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.reminderDetails}>
                <View style={styles.detailRow}>
                  <Icon2 style={styles.detailIcon} name="clock-circle" />
                  <Text style={styles.detailLabel}>Alarm:</Text>
                  <Text style={styles.detailValue}>{reminder.alarmTime}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Icon style={styles.detailIcon} name="calendar" />
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(reminder.date)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Icon2 style={styles.detailIcon} name="redo" />
                  <Text style={styles.detailLabel}>Repeat:</Text>
                  <Text style={styles.detailValue}>{reminder.repeat}</Text>
                </View>
              </View>

              {/* Progress Stats */}
              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Icon style={styles.checkSmall} name="check" />
                  <Text style={styles.progressStatValue}>{reminder.totalDone}</Text>
                  <Text style={styles.progressStatLabel}>Done</Text>
                </View>
                <View style={styles.progressStat}>
                  <Icon style={styles.uncheckSmall} name="times" />
                  <Text style={styles.progressStatValue}>{reminder.totalUndone}</Text>
                  <Text style={styles.progressStatLabel}>Missed</Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {!reminder.isDone ? (
                  <Pressable 
                    style={[styles.actionButton, styles.doneButton]} 
                    onPress={() => markAsDone(reminder.id)}
                  >
                    <Icon style={styles.actionIcon} name="check" />
                    <Text style={styles.actionButtonText}>Mark Done</Text>
                  </Pressable>
                ) : (
                  <Pressable 
                    style={[styles.actionButton, styles.undoneButton]} 
                    onPress={() => markAsUndone(reminder.id)}
                  >
                    <Icon style={styles.actionIcon} name="undo" />
                    <Text style={styles.actionButtonText}>Undo</Text>
                  </Pressable>
                )}
                <Pressable 
                  style={[styles.actionButton, styles.toggleButton]}
                  onPress={() => toggleReminderActive(reminder.id)}
                >
                  <Icon style={styles.actionIcon} name={reminder.isActive ? "bell-slash" : "bell"} />
                  <Text style={styles.actionButtonText}>
                    {reminder.isActive ? 'Turn Off' : 'Turn On'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Inactive Reminders */}
        {inactiveReminders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Inactive Reminders</Text>
            {inactiveReminders.map((reminder) => (
              <View key={reminder.id} style={[styles.reminderCard, styles.reminderCardInactive]}>
                <View style={styles.reminderHeader}>
                  <View style={styles.reminderLeft}>
                    <Icon style={[styles.reminderIcon, styles.reminderIconInactive]} name="bell-slash" />
                    <View style={styles.reminderInfo}>
                      <Text style={[styles.reminderName, styles.reminderNameInactive]}>{reminder.name}</Text>
                      <Text style={[styles.reminderBenefits, styles.reminderBenefitsInactive]}>{reminder.benefits}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, styles.statusBadgeInactive]}>
                    <Text style={[styles.statusText, styles.statusTextInactive]}>Inactive</Text>
                  </View>
                </View>
                
                <View style={styles.reminderDetails}>
                  <View style={styles.detailRow}>
                    <Icon2 style={[styles.detailIcon, styles.detailIconInactive]} name="clock-circle" />
                    <Text style={[styles.detailLabel, styles.detailLabelInactive]}>Alarm:</Text>
                    <Text style={[styles.detailValue, styles.detailValueInactive]}>{reminder.alarmTime}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Icon style={[styles.detailIcon, styles.detailIconInactive]} name="calendar" />
                    <Text style={[styles.detailLabel, styles.detailLabelInactive]}>Date:</Text>
                    <Text style={[styles.detailValue, styles.detailValueInactive]}>{formatDate(reminder.date)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Icon2 style={[styles.detailIcon, styles.detailIconInactive]} name="redo" />
                    <Text style={[styles.detailLabel, styles.detailLabelInactive]}>Repeat:</Text>
                    <Text style={[styles.detailValue, styles.detailValueInactive]}>{reminder.repeat}</Text>
                  </View>
                </View>

                {/* Progress Stats */}
                <View style={styles.progressStats}>
                  <View style={styles.progressStat}>
                    <Icon style={[styles.checkSmall, styles.inactiveIcon]} name="check" />
                    <Text style={[styles.progressStatValue, styles.inactiveText]}>{reminder.totalDone}</Text>
                    <Text style={[styles.progressStatLabel, styles.inactiveText]}>Done</Text>
                  </View>
                  <View style={styles.progressStat}>
                    <Icon style={[styles.uncheckSmall, styles.inactiveIcon]} name="times" />
                    <Text style={[styles.progressStatValue, styles.inactiveText]}>{reminder.totalUndone}</Text>
                    <Text style={[styles.progressStatLabel, styles.inactiveText]}>Missed</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <Pressable 
                    style={[styles.actionButton, styles.activateButton]}
                    onPress={() => toggleReminderActive(reminder.id)}
                  >
                    <Icon style={styles.actionIcon} name="bell" />
                    <Text style={styles.actionButtonText}>Turn On</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Today's Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <View style={styles.todayContainer}>
            {activeReminders.slice(0, 5).map((reminder, index) => (
              <View key={reminder.id} style={styles.todayItem}>
                <View style={styles.todayTime}>
                  <Text style={styles.todayTimeText}>{reminder.alarmTime}</Text>
                </View>
                <View style={styles.todayLine}>
                  <View style={[styles.todayDot, reminder.isDone && styles.todayDotDone]} />
                  {index < Math.min(activeReminders.length - 1, 4) && <View style={styles.todayLineVertical} />}
                </View>
                <View style={styles.todayContent}>
                  <Text style={[styles.todayName, reminder.isDone && styles.todayNameDone]}>
                    {reminder.name}
                  </Text>
                  <Text style={styles.todayRepeat}>{reminder.repeat}</Text>
                </View>
                <View style={styles.todayStatus}>
                  {reminder.isDone ? (
                    <Icon style={styles.todayCheckIcon} name="check-circle" />
                  ) : (
                    <Icon style={styles.todayPendingIcon} name="circle-o" />
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Instructions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.instructionCard}>
            <View style={styles.instructionItem}>
              <Icon style={styles.instructionIcon} name="bell" />
              <Text style={styles.instructionText}>
                <Text style={styles.instructionBold}>Active Reminders:</Text> These alarms will notify you at the set time.
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Icon style={styles.instructionIcon} name="check-circle" />
              <Text style={styles.instructionText}>
                <Text style={styles.instructionBold}>Mark Done:</Text> Tap when you complete the habit to track your progress.
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Icon2 style={styles.instructionIcon} name="moon" />
              <Text style={styles.instructionText}>
                <Text style={styles.instructionBold}>End of Day:</Text> Marks all pending habits as undone automatically.
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Icon2 style={styles.instructionIcon} name="line-chart" />
              <Text style={styles.instructionText}>
                <Text style={styles.instructionBold}>Consistency:</Text> Track your done vs undone habits to see your progress over time.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#211c24",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryIcon: {
    fontSize: 24,
    color: "#c67ee2",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  consistencySection: {
    marginBottom: 15,
  },
  consistencyCard: {
    backgroundColor: "#211c24",
    borderRadius: 15,
    padding: 15,
  },
  consistencyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  consistencyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  consistencyRate: {
    fontSize: 24,
    fontWeight: "bold",
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: "#362c3a",
    borderRadius: 5,
    marginBottom: 15,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 10,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#362c3a",
  },
  checkIcon: {
    fontSize: 20,
    color: "#4CAF50",
    marginBottom: 5,
  },
  uncheckIcon: {
    fontSize: 20,
    color: "#FF6B6B",
    marginBottom: 5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  consistencyNote: {
    fontSize: 12,
    color: "#888888",
    textAlign: "center",
    fontStyle: "italic",
  },
  actionsSection: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
  },
  addHabitButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#c67ee2",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  addIcon: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  addHabitText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  endDayButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#362c3a",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  endDayIcon: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  endDayText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
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
  reminderCard: {
    backgroundColor: "#1e1929",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#c67ee2",
  },
  reminderCardDone: {
    borderLeftColor: "#4CAF50",
    opacity: 0.8,
  },
  reminderCardInactive: {
    opacity: 0.6,
    borderLeftColor: "#666666",
  },
  reminderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  reminderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderIcon: {
    fontSize: 24,
    color: "#c67ee2",
    marginRight: 12,
    marginTop: 2,
  },
  reminderIconInactive: {
    color: "#666666",
  },
  reminderName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  reminderNameInactive: {
    color: "#888888",
  },
  reminderBenefits: {
    fontSize: 12,
    color: "#CCCCCC",
    flex: 1,
  },
  reminderBenefitsInactive: {
    color: "#666666",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#362c3a",
  },
  statusBadgeActive: {
    backgroundColor: "#4CAF50",
  },
  statusBadgeInactive: {
    backgroundColor: "#666666",
  },
  statusText: {
    fontSize: 12,
    color: "#CCCCCC",
    fontWeight: "500",
  },
  statusTextActive: {
    color: "#FFFFFF",
  },
  statusTextInactive: {
    color: "#CCCCCC",
  },
  reminderDetails: {
    borderTopWidth: 1,
    borderTopColor: "#362c3a",
    paddingTop: 12,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailIcon: {
    fontSize: 14,
    color: "#c67ee2",
    marginRight: 8,
    width: 20,
  },
  detailIconInactive: {
    color: "#666666",
  },
  detailLabel: {
    fontSize: 14,
    color: "#CCCCCC",
    marginRight: 8,
  },
  detailLabelInactive: {
    color: "#666666",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  detailValueInactive: {
    color: "#888888",
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#211c24",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  progressStat: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  checkSmall: {
    fontSize: 14,
    color: "#4CAF50",
  },
  uncheckSmall: {
    fontSize: 14,
    color: "#FF6B6B",
  },
  inactiveIcon: {
    color: "#666666",
  },
  progressStatValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  progressStatLabel: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  inactiveText: {
    color: "#666666",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    padding: 10,
    gap: 5,
  },
  doneButton: {
    backgroundColor: "#4CAF50",
  },
  undoneButton: {
    backgroundColor: "#FFA500",
  },
  toggleButton: {
    backgroundColor: "#362c3a",
  },
  activateButton: {
    backgroundColor: "#4CAF50",
  },
  actionIcon: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  todayContainer: {
    backgroundColor: "#1e1929",
    borderRadius: 12,
    padding: 15,
  },
  todayItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  todayTime: {
    width: 70,
  },
  todayTimeText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#c67ee2",
  },
  todayLine: {
    alignItems: "center",
    marginRight: 12,
  },
  todayDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#c67ee2",
  },
  todayDotDone: {
    backgroundColor: "#4CAF50",
  },
  todayLineVertical: {
    width: 2,
    height: 40,
    backgroundColor: "#362c3a",
    marginTop: 4,
  },
  todayContent: {
    flex: 1,
  },
  todayName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  todayNameDone: {
    textDecorationLine: "line-through",
    color: "#4CAF50",
  },
  todayRepeat: {
    fontSize: 12,
    color: "#888888",
  },
  todayStatus: {
    marginLeft: 10,
  },
  todayCheckIcon: {
    fontSize: 20,
    color: "#4CAF50",
  },
  todayPendingIcon: {
    fontSize: 20,
    color: "#666666",
  },
  instructionCard: {
    backgroundColor: "#1e1929",
    borderRadius: 12,
    padding: 15,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  instructionIcon: {
    fontSize: 18,
    color: "#c67ee2",
    marginTop: 2,
  },
  instructionText: {
    fontSize: 14,
    color: "#CCCCCC",
    flex: 1,
  },
  instructionBold: {
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});

