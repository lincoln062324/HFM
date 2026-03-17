// Goals Screen Component
import { StyleSheet, Text, View, ScrollView, Pressable, TextInput } from "react-native";
import React from "react";
import Icon from "react-native-vector-icons/FontAwesome";
import Icon2 from "react-native-vector-icons/Entypo";
import { PieChart } from "react-native-gifted-charts";

import AsyncStorage from "@react-native-async-storage/async-storage";
// import { Slider } from "@react-native-community/slider";

interface GoalsScreenProps {
  onClose: () => void;
  onGoalUpdate?: (goal: number) => void;
}

// Custom ProgressBar Component
const ProgressBar = ({ progress, color, backgroundColor, width, height, borderRadius }: { progress: number; color: string; backgroundColor: string; width?: number; height?: number; borderRadius?: number }) => (
  <View style={[styles.progressBarBg, { backgroundColor, width: width || '100%', height: height || 12, borderRadius: borderRadius || 6 }]}>
    <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color, height: height || 12, borderRadius: borderRadius || 6 }]} />
  </View>
);

// Mock goals data
const GOALS_DATA = {
  weightGoal: {
    current: 165,
    target: 150,
    start: 180,
    progress: 0.5, // 50% achieved
  },
  foodIntake: {
    dailyTarget: 2000,
    averageConsumed: 1850,
    totalWeek: 12950,
    progress: 0.925, // 92.5%
    breakdown: {
      carbohydrates: { consumed: 450, target: 500, unit: 'g' },
      proteins: { consumed: 120, target: 150, unit: 'g' },
      fats: { consumed: 65, target: 80, unit: 'g' },
      fiber: { consumed: 28, target: 30, unit: 'g' },
    },
  },
  exercise: {
    dailyTarget: 300,
    averageBurned: 328,
    totalWeek: 2300,
    progress: 1.09, // 109% achieved
    activities: [
      { name: 'Running', target: 150, burned: 180 },
      { name: 'Cycling', target: 100, burned: 85 },
      { name: 'Swimming', target: 50, burned: 63 },
    ],
  },
  consistency: {
    status: 'inconsistent', // consistent, inconsistent, onTrack
    daysAchieved: 4,
    totalDays: 7,
    progress: 0.57, // 57%
    weeklyStatus: [
      { day: 'Mon', achieved: true },
      { day: 'Tue', achieved: true },
      { day: 'Wed', achieved: false },
      { day: 'Thu', achieved: true },
      { day: 'Fri', achieved: false },
      { day: 'Sat', achieved: true },
      { day: 'Sun', achieved: false },
    ],
  },
};

const getConsistencyColor = (status: string) => {
  switch (status) {
    case 'consistent':
      return '#4CAF50'; // Green
    case 'inconsistent':
      return '#FF6B6B'; // Red
    case 'onTrack':
      return '#FFA500'; // Amber
    default:
      return '#CCCCCC';
  }
};

const getConsistencyText = (status: string) => {
  switch (status) {
    case 'consistent':
      return 'Consistent';
    case 'inconsistent':
      return 'Inconsistent Progress';
    case 'onTrack':
      return 'On Track';
    default:
      return 'Unknown';
  }
};

export default function GoalsScreen({ onClose, onGoalUpdate }: GoalsScreenProps) {
  const [dailyCalorieGoal, setDailyCalorieGoal] = React.useState(2000);
  const [foodValue, setFoodValue] = React.useState(0);
  const [exerciseValue, setExerciseValue] = React.useState(0);
  const [editingGoal, setEditingGoal] = React.useState(false);
  const [tempGoal, setTempGoal] = React.useState(2000);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const goal = await AsyncStorage.getItem('@dailyCalorieGoal');
      const food = await AsyncStorage.getItem('@foodValue');
      const exercise = await AsyncStorage.getItem('@exerciseValue');
      if (goal) setDailyCalorieGoal(parseInt(goal));
      if (food) setFoodValue(parseInt(food));
      if (exercise) setExerciseValue(parseInt(exercise));
      setTempGoal(parseInt(goal || '2000'));
    } catch (error) {
      console.log('Error loading goal data:', error);
    }
  };

  const saveGoal = async () => {
    try {
      await AsyncStorage.setItem('@dailyCalorieGoal', tempGoal.toString());
      setDailyCalorieGoal(tempGoal);
      setEditingGoal(false);
      onGoalUpdate?.(tempGoal);
      alert('Daily goal updated!');
    } catch (error) {
      console.log('Error saving goal:', error);
      alert('Error saving goal');
    }
  };

  const totalProgress = foodValue + exerciseValue;
  const foodPieData = [
    { value: 45, color: '#F3AF41', text: 'Carbs' },
    { value: 30, color: '#84d7f4', text: 'Protein' },
    { value: 15, color: '#c67ee2', text: 'Fats' },
    { value: 10, color: '#4CAF50', text: 'Fiber' },
  ];

  return (
    <View style={styles.container}>
          <View style={styles.header1}>
            </View>
      <View style={styles.header}>
        <Text style={styles.title}>Goals</Text>
        <Pressable onPress={onClose}>
          <Icon style={styles.closeIcon} name="times-circle" />
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* Daily Calorie Goal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Calorie Goal</Text>
          
          <View style={styles.goalInputSection}>
            {editingGoal ? (
              <>
                <View style={styles.goalSlider}>
                  <Text style={styles.sliderLabel}>Goal: {Math.round(tempGoal)} kcal</Text>
                </View>
                <View style={styles.goalInputRow}>
                  <TextInput
                    style={styles.goalInput}
                    value={tempGoal.toString()}
                    onChangeText={(text) => setTempGoal(parseInt(text) || 2000)}
                    keyboardType="numeric"
                  />
                  <Text style={styles.goalUnit}>kcal</Text>
                </View>
                <View style={styles.goalButtons}>
                  <Pressable style={styles.saveButton} onPress={saveGoal}>
                    <Text style={styles.saveButtonText}>Save Goal</Text>
                  </Pressable>
                  <Pressable style={styles.cancelButton} onPress={() => {setEditingGoal(false); setTempGoal(dailyCalorieGoal);}}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.currentGoal}>{dailyCalorieGoal} kcal</Text>
                <Pressable style={styles.editGoalButton} onPress={() => setEditingGoal(true)}>
                  <Text style={styles.editGoalText}>Edit Goal</Text>
                </Pressable>
              </>
            )}
          </View>

          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Today&apos;s Progress</Text>
            <ProgressBar
              progress={Math.min(totalProgress / dailyCalorieGoal, 1)}
              width={280}
              height={12}
              color="#4CAF50"
              backgroundColor="#362c3a"
              borderRadius={6}
            />
            <Text style={styles.progressText}>
              {totalProgress} / {dailyCalorieGoal} kcal ({Math.round((totalProgress / dailyCalorieGoal) * 100)}%)
            </Text>
          </View>
        </View>

        {/* Weight Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weight Goal</Text>
          
          <View style={styles.weightHeader}>
            <View style={styles.weightInfo}>
              <Text style={styles.weightLabel}>Current</Text>
              <Text style={styles.weightValue}>{GOALS_DATA.weightGoal.current} lbs</Text>
            </View>
            <View style={styles.weightInfo}>
              <Text style={styles.weightLabel}>Target</Text>
              <Text style={styles.weightValue}>{GOALS_DATA.weightGoal.target} lbs</Text>
            </View>
            <View style={styles.weightInfo}>
              <Text style={styles.weightLabel}>Start</Text>
              <Text style={styles.weightValue}>{GOALS_DATA.weightGoal.start} lbs</Text>
            </View>
          </View>
          
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Progress</Text>
            <ProgressBar
              progress={GOALS_DATA.weightGoal.progress}
              width={280}
              height={12}
              color="#c67ee2"
              backgroundColor="#362c3a"
              borderRadius={6}
            />
            <Text style={styles.progressText}>
              {Math.round(GOALS_DATA.weightGoal.progress * 100)}% achieved
            </Text>
          </View>
          
          <View style={styles.weightLost}>
            <Icon style={styles.weightIcon} name="arrow-down" />
            <Text style={styles.weightLostText}>
              {GOALS_DATA.weightGoal.start - GOALS_DATA.weightGoal.current} lbs lost
            </Text>
          </View>
        </View>

        {/* Food Intake */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Food Intake</Text>
          
          <View style={styles.goalSummary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{GOALS_DATA.foodIntake.dailyTarget}</Text>
              <Text style={styles.summaryLabel}>Daily Target (kcal)</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{GOALS_DATA.foodIntake.averageConsumed}</Text>
              <Text style={styles.summaryLabel}>Avg. Consumed (kcal)</Text>
            </View>
          </View>
          
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Weekly Progress</Text>
            <ProgressBar
              progress={GOALS_DATA.foodIntake.progress}
              width={280}
              height={12}
              color="#c67ee2"
              backgroundColor="#362c3a"
              borderRadius={6}
            />
            <Text style={styles.progressText}>
              {Math.round(GOALS_DATA.foodIntake.progress * 100)}% of weekly goal
            </Text>
          </View>
          
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total Weekly Calories</Text>
            <Text style={styles.totalValue}>{GOALS_DATA.foodIntake.totalWeek} kcal</Text>
          </View>
          
          {/* Breakdown */}
          <Text style={styles.subSectionTitle}>Nutritional Breakdown</Text>
          <View style={styles.breakdownGrid}>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownLabel}>Carbohydrates</Text>
                <Text style={styles.breakdownValue}>
                  {GOALS_DATA.foodIntake.breakdown.carbohydrates.consumed}/{GOALS_DATA.foodIntake.breakdown.carbohydrates.target} {GOALS_DATA.foodIntake.breakdown.carbohydrates.unit}
                </Text>
              </View>
              <ProgressBar
                progress={GOALS_DATA.foodIntake.breakdown.carbohydrates.consumed / GOALS_DATA.foodIntake.breakdown.carbohydrates.target}
                width={120}
                height={8}
                color="#F3AF41"
                backgroundColor="#362c3a"
                borderRadius={4}
              />
            </View>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownLabel}>Proteins</Text>
                <Text style={styles.breakdownValue}>
                  {GOALS_DATA.foodIntake.breakdown.proteins.consumed}/{GOALS_DATA.foodIntake.breakdown.proteins.target} {GOALS_DATA.foodIntake.breakdown.proteins.unit}
                </Text>
              </View>
              <ProgressBar
                progress={GOALS_DATA.foodIntake.breakdown.proteins.consumed / GOALS_DATA.foodIntake.breakdown.proteins.target}
                width={120}
                height={8}
                color="#84d7f4"
                backgroundColor="#362c3a"
                borderRadius={4}
              />
            </View>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownLabel}>Fats</Text>
                <Text style={styles.breakdownValue}>
                  {GOALS_DATA.foodIntake.breakdown.fats.consumed}/{GOALS_DATA.foodIntake.breakdown.fats.target} {GOALS_DATA.foodIntake.breakdown.fats.unit}
                </Text>
              </View>
              <ProgressBar
                progress={GOALS_DATA.foodIntake.breakdown.fats.consumed / GOALS_DATA.foodIntake.breakdown.fats.target}
                width={120}
                height={8}
                color="#c67ee2"
                backgroundColor="#362c3a"
                borderRadius={4}
              />
            </View>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownHeader}>
                <Text style={styles.breakdownLabel}>Fiber</Text>
                <Text style={styles.breakdownValue}>
                  {GOALS_DATA.foodIntake.breakdown.fiber.consumed}/{GOALS_DATA.foodIntake.breakdown.fiber.target} {GOALS_DATA.foodIntake.breakdown.fiber.unit}
                </Text>
              </View>
              <ProgressBar
                progress={GOALS_DATA.foodIntake.breakdown.fiber.consumed / GOALS_DATA.foodIntake.breakdown.fiber.target}
                width={120}
                height={8}
                color="#4CAF50"
                backgroundColor="#362c3a"
                borderRadius={4}
              />
            </View>
          </View>
        </View>

        {/* Exercise */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercise</Text>
          
          <View style={styles.goalSummary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{GOALS_DATA.exercise.dailyTarget}</Text>
              <Text style={styles.summaryLabel}>Daily Target (kcal)</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{GOALS_DATA.exercise.averageBurned}</Text>
              <Text style={styles.summaryLabel}>Avg. Burned (kcal)</Text>
            </View>
          </View>
          
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Weekly Progress</Text>
            <ProgressBar
              progress={Math.min(GOALS_DATA.exercise.progress, 1)}
              width={280}
              height={12}
              color="#84d7f4"
              backgroundColor="#362c3a"
              borderRadius={6}
            />
            <Text style={styles.progressText}>
              {Math.round(GOALS_DATA.exercise.progress * 92)}% of weekly goal
            </Text>
          </View>
          
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total Weekly Calories Burned</Text>
            <Text style={styles.totalValue}>{GOALS_DATA.exercise.totalWeek} kcal</Text>
          </View>
          
          {/* Activity Breakdown */}
          <Text style={styles.subSectionTitle}>Activity Breakdown</Text>
          {GOALS_DATA.exercise.activities.map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <View style={styles.activityLeft}>
                <Icon2 style={styles.activityIcon} name="sports-club" />
                <Text style={styles.activityName}>{activity.name}</Text>
              </View>
              <View style={styles.activityRight}>
                <Text style={styles.activityTarget}>Target: {activity.target}</Text>
                <Text style={styles.activityBurned}>Burned: {activity.burned} kcal</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Consistency Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consistency Progress</Text>
          
          <View style={styles.consistencyStatus}>
            <Icon 
              style={[styles.consistencyIcon, { color: getConsistencyColor(GOALS_DATA.consistency.status) }]} 
              name={GOALS_DATA.consistency.status === 'inconsistent' ? 'exclamation-triangle' : 'check-circle'} 
            />
            <Text style={[styles.consistencyText, { color: getConsistencyColor(GOALS_DATA.consistency.status) }]}>
              {getConsistencyText(GOALS_DATA.consistency.status)}
            </Text>
          </View>
          
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Weekly Achievement</Text>
            <ProgressBar
              progress={GOALS_DATA.consistency.progress}
              width={280}
              height={12}
              color={getConsistencyColor(GOALS_DATA.consistency.status)}
              backgroundColor="#362c3a"
              borderRadius={6}
            />
            <Text style={styles.progressText}>
              {GOALS_DATA.consistency.daysAchieved}/{GOALS_DATA.consistency.totalDays} days achieved
            </Text>
          </View>
          
          {/* Weekly Days */}
          <View style={styles.daysGrid}>
            {GOALS_DATA.consistency.weeklyStatus.map((day, index) => (
              <View key={index} style={styles.dayItem}>
                <View 
                  style={[
                    styles.dayCircle, 
                    { backgroundColor: day.achieved ? '#4CAF50' : '#FF6B6B' }
                  ]}
                >
                  <Icon 
                    style={styles.dayIcon} 
                    name={day.achieved ? 'check' : 'times'} 
                  />
                </View>
                <Text style={styles.dayText}>{day.day}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  goalInputSection: {
    marginBottom: 20,
  },
  goalSlider: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#313031',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 15,
  },
  sliderLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  goalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  goalInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
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
  currentGoal: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#c67ee2',
    textAlign: 'center',
    marginBottom: 10,
  },
  editGoalButton: {
    backgroundColor: '#c67ee2',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'center',
  },
  editGoalText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
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
  subSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#CCCCCC",
    marginTop: 15,
    marginBottom: 10,
  },
  weightHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  weightInfo: {
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
  progressSection: {
    alignItems: "center",
    marginVertical: 10,
  },
  progressLabel: {
    fontSize: 14,
    color: "#CCCCCC",
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: "#CCCCCC",
    marginTop: 8,
  },
  weightLost: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#313031",
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  weightIcon: {
    fontSize: 20,
    color: "#4CAF50",
  },
  weightLostText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  goalSummary: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#CCCCCC",
    textAlign: "center",
  },
  totalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#313031",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 14,
    color: "#CCCCCC",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  breakdownGrid: {
    gap: 12,
  },
  breakdownItem: {
    backgroundColor: "#313031",
    padding: 10,
    borderRadius: 8,
  },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#CCCCCC",
  },
  breakdownValue: {
    top: 5,
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  activityItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#313031",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  activityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  activityIcon: {
    fontSize: 25,
    color: "#fcd2c7",
  },
  activityName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  activityRight: {
    alignItems: "flex-end",
  },
  activityTarget: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  activityBurned: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fc9139",
  },
  consistencyStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e1929",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    gap: 10,
  },
  consistencyIcon: {
    fontSize: 24,
  },
  consistencyText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  daysGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  dayItem: {
    alignItems: "center",
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  dayIcon: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  dayText: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  progressBarBg: {
    height: 12,
    backgroundColor: "#362c3a",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 6,
  },
});

