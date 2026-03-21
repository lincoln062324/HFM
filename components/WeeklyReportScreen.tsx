// Weekly Report Screen Component
import { StyleSheet, Text, View, ScrollView, Pressable, Dimensions } from "react-native";
import React from "react";
import Icon from "react-native-vector-icons/FontAwesome";
import Icon2 from "react-native-vector-icons/Ionicons";
import Icon3 from "react-native-vector-icons/Fontisto";
import { PieChart, BarChart } from "react-native-gifted-charts";

interface WeeklyReportScreenProps {
  onClose: () => void;
}

// Mock weekly report data
const WEEKLY_DATA = {
  consistency: [
    { day: 'Mon', status: 'onTrack' },
    { day: 'Tue', status: 'onTrack' },
    { day: 'Wed', status: 'atRisk' },
    { day: 'Thu', status: 'onTrack' },
    { day: 'Fri', status: 'critical' },
    { day: 'Sat', status: 'atRisk' },
    { day: 'Sun', status: 'onTrack' },
  ],
  foodIntake: [
    { day: 'Mon', calories: 1850 },
    { day: 'Tue', calories: 2100 },
    { day: 'Wed', calories: 1950 },
    { day: 'Thu', calories: 1800 },
    { day: 'Fri', calories: 2200 },
    { day: 'Sat', calories: 2000 },
    { day: 'Sun', calories: 1900 },
  ],
  totalFoodCalories: 13800,
  exerciseData: [
    { day: 'Mon', calories: 300 },
    { day: 'Tue', calories: 450 },
    { day: 'Wed', calories: 280 },
    { day: 'Thu', calories: 350 },
    { day: 'Fri', calories: 200 },
    { day: 'Sat', calories: 400 },
    { day: 'Sun', calories: 320 },
  ],
  totalExerciseCalories: 2300,
  dailySteps: [
    { day: 'Mon', steps: 8500 },
    { day: 'Tue', steps: 10200 },
    { day: 'Wed', steps: 7800 },
    { day: 'Thu', steps: 9100 },
    { day: 'Fri', steps: 6500 },
    { day: 'Sat', steps: 11000 },
    { day: 'Sun', steps: 9200 },
  ],
  totalSteps: 62300,
  totalCaloriesBurned: 4200,
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'onTrack':
      return '#4CAF50'; // Green
    case 'atRisk':
      return '#FFA500'; // Amber/Orange
    case 'critical':
      return '#FF6B6B'; // Red
    default:
      return '#CCCCCC';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'onTrack':
      return 'On Track';
    case 'atRisk':
      return 'At Risk';
    case 'critical':
      return 'Critical Issue';
    default:
      return 'Unknown';
  }
};

export default function WeeklyReportScreen({ onClose }: WeeklyReportScreenProps) {
  const foodPieData = [
    { value: 35, color: '#F3AF41', text: '35%' },
    { value: 25, color: '#84d7f4', text: '25%' },
    { value: 20, color: '#c67ee2', text: '20%' },
    { value: 20, color: '#4CAF50', text: '20%' },
  ];

  const exercisePieData = [
    { value: 40, color: '#84d7f4', text: '40%' },
    { value: 35, color: '#c67ee2', text: '35%' },
    { value: 25, color: '#F3AF41', text: '25%' },
  ];

  const foodBarData = WEEKLY_DATA.foodIntake.map((item) => ({
    value: item.calories,
    label: item.day,
    frontColor: '#c67ee2',
  }));

  const exerciseBarData = WEEKLY_DATA.exerciseData.map((item) => ({
    value: item.calories,
    label: item.day,
    frontColor: '#84d7f4',
  }));

  const stepsBarData = WEEKLY_DATA.dailySteps.map((item) => ({
    value: item.steps / 100,
    label: item.day,
    frontColor: '#4CAF50',
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header1}>
        </View>
      <View style={styles.header}>
        <Text style={styles.title}>My Weekly Report</Text>
        <Pressable onPress={onClose}>
          <Icon style={styles.closeIcon} name="times-circle" />
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* Consistency Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Consistency</Text>
          <View style={styles.consistencyGrid}>
            {WEEKLY_DATA.consistency.map((item, index) => (
              <View key={index} style={styles.consistencyItem}>
                <View
                  style={[
                    styles.consistencyDot,
                    { backgroundColor: getStatusColor(item.status) },
                  ]}
                />
                <Text style={styles.consistencyDay}>{item.day}</Text>
                <Text
                  style={[
                    styles.consistencyStatus,
                    { color: getStatusColor(item.status) },
                  ]}
                >
                  {getStatusText(item.status)}
                </Text>
              </View>
            ))}
          </View>
          
          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>On Track</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FFA500' }]} />
              <Text style={styles.legendText}>At Risk</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
              <Text style={styles.legendText}>Critical Issue</Text>
            </View>
          </View>
        </View>

        {/* Food Intake Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Food Intake Breakdown</Text>
          <View style={styles.breakdownContainer}>
            <View style={styles.chartSection}>
              <PieChart
                data={foodPieData}
                radius={60}
                innerRadius={40}
                backgroundColor="#211c24"
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text style={styles.centerLabelValue}>{WEEKLY_DATA.totalFoodCalories}</Text>
                    <Text style={styles.centerLabelText}>Total</Text>
                  </View>
                )}
              />
            </View>
            <View style={styles.chartDetails}>
              <View style={styles.detailItem}>
                <View style={[styles.detailDot, { backgroundColor: '#F3AF41' }]} />
                <Text style={styles.detailLabel}>Carbohydrates</Text>
                <Text style={styles.detailValue}>35%</Text>
              </View>
              <View style={styles.detailItem}>
                <View style={[styles.detailDot, { backgroundColor: '#84d7f4' }]} />
                <Text style={styles.detailLabel}>Proteins</Text>
                <Text style={styles.detailValue}>25%</Text>
              </View>
              <View style={styles.detailItem}>
                <View style={[styles.detailDot, { backgroundColor: '#c67ee2' }]} />
                <Text style={styles.detailLabel}>Fats</Text>
                <Text style={styles.detailValue}>20%</Text>
              </View>
              <View style={styles.detailItem}>
                <View style={[styles.detailDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.detailLabel}>Fiber</Text>
                <Text style={styles.detailValue}>20%</Text>
              </View>
            </View>
          </View>
          
          {/* Daily Food Chart */}
          <View style={styles.barChartSection}>
            <Text style={styles.chartSubtitle}>Daily Calories Intake</Text>
            <BarChart
              data={foodBarData}
              width={280}
              height={120}
              barWidth={30}
              spacing={15}
              roundedTop
              roundedBottom
              xAxisThickness={4}
              yAxisThickness={4}
              xAxisColor="#666666"
              yAxisColor="#666666"
              xAxisLabelTextStyle={{ color: '#CCCCCC' }}
              yAxisTextStyle={{ color: '#CCCCCC' }} 
              noOfSections={4}
              maxValue={2500}
              isAnimated
            />
          </View>
        </View>

        {/* Exercise Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercise Breakdown</Text>
          <View style={styles.breakdownContainer}>
            <View style={styles.chartSection}>
              <PieChart
                data={exercisePieData}
                radius={60}
                innerRadius={40}
                backgroundColor="#211c24"
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text style={styles.centerLabelValue}>{WEEKLY_DATA.totalExerciseCalories}</Text>
                    <Text style={styles.centerLabelText}>Burned</Text>
                  </View>
                )}
              />
            </View>
            <View style={styles.chartDetails}>
              <View style={styles.detailItem}>
                <View style={[styles.detailDot, { backgroundColor: '#84d7f4' }]} />
                <Text style={styles.detailLabel}>Cardio</Text>
                <Text style={styles.detailValue}>40%</Text>
              </View>
              <View style={styles.detailItem}>
                <View style={[styles.detailDot, { backgroundColor: '#c67ee2' }]} />
                <Text style={styles.detailLabel}>Strength</Text>
                <Text style={styles.detailValue}>35%</Text>
              </View>
              <View style={styles.detailItem}>
                <View style={[styles.detailDot, { backgroundColor: '#F3AF41' }]} />
                <Text style={styles.detailLabel}>Flexibility</Text>
                <Text style={styles.detailValue}>25%</Text>
              </View>
            </View>
          </View>
          
          {/* Burn Fat Info */}
          <View style={styles.burnInfo}>
            <Icon style={styles.burnIcon} name="fire" />
            <Text style={styles.burnText}>Total Fat Burned: 650g</Text>
          </View>
          
          {/* Daily Exercise Chart */}
          <View style={styles.barChartSection}>
            <Text style={styles.chartSubtitle}>Daily Calories Burned</Text>
            <BarChart
              data={exerciseBarData}
              width={280}
              height={120}
              barWidth={30}
              spacing={15}
              roundedTop
              roundedBottom
              xAxisThickness={1}
              yAxisThickness={1}
              xAxisColor="#666666"
              yAxisColor="#666666"
              xAxisLabelTextStyle={{ color: '#CCCCCC' }}
              yAxisTextStyle={{ color: '#CCCCCC' }}
              noOfSections={4}
              maxValue={500}
              isAnimated
            />
          </View>
        </View>

        {/* Steps Tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Steps & Calories</Text>
          
          {/* Daily Steps */}
          <View style={styles.stepsSection}>
            <Text style={styles.chartSubtitle}>Daily Steps</Text>
            <BarChart
              data={stepsBarData}
              width={280}
              height={120}
              barWidth={30}
              spacing={15}
              roundedTop
              roundedBottom
              xAxisThickness={1}
              yAxisThickness={1}
              xAxisColor="#666666"
              yAxisColor="#666666"
              xAxisLabelTextStyle={{ color: '#CCCCCC' }}
              yAxisTextStyle={{ color: '#CCCCCC' }}
              noOfSections={4}
              maxValue={120}
              isAnimated
            />
          </View>
          
          {/* Steps Summary */}
          <View style={styles.stepsSummary}>
            <View style={styles.summaryItem}>
              <Icon2 style={styles.summaryIcon} name="footsteps" />
              <View>
                <Text style={styles.summaryValue}>{WEEKLY_DATA.totalSteps.toLocaleString()}</Text>
                <Text style={styles.summaryLabel}>Weekly Total Steps</Text>
              </View>
            </View>
            <View style={styles.summaryItem}>
              <Icon3 style={styles.summaryIcon2} name="fire" />
              <View>
                <Text style={styles.summaryValue}>{WEEKLY_DATA.totalCaloriesBurned}</Text>
                <Text style={styles.summaryLabel}>Weekly Calories</Text>
              </View>
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
  consistencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  consistencyItem: {
    width: "45%",
    backgroundColor: "#313031",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  consistencyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 5,
  },
  consistencyDay: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 3,
  },
  consistencyStatus: {
    fontSize: 12,
    fontWeight: "500",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    gap: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  breakdownContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  chartSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabel: {
    alignItems: "center",
  },
  centerLabelValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  centerLabelText: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  chartDetails: {
    flex: 1,
    justifyContent: "center",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: "#CCCCCC",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  barChartSection: {
    alignItems: "center",
    marginTop: 10,
  },
  chartSubtitle: {
    fontSize: 14,
    color: "#CCCCCC",
    marginBottom: 10,
  },
  burnInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#313031",
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    gap: 10,
  },
  burnIcon: {
    fontSize: 24,
    color: "#fc9139",
  },
  burnText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  stepsSection: {
    alignItems: "center",
    marginBottom: 15,
  },
  stepsSummary: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: 155,
    gap: 10,
    backgroundColor: "#313031",
    padding: 12,
    borderRadius: 10,
  },
  summaryIcon: {
    fontSize: 27,
    color: "#bcd1bc",
  },
  summaryIcon2: {
    fontSize: 27,
    color: "#fc9139",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#CCCCCC",
  },
});

