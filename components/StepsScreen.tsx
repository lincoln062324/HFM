// Steps Screen Component - Enhanced with Live Tracking, Location Permission, and Daily/Weekly/Monthly Report
import { StyleSheet, Text, View, ScrollView, Pressable, Alert } from "react-native";
import React, { useState, useEffect, useRef } from "react";
import Icon from "react-native-vector-icons/FontAwesome";
import Icon2 from "react-native-vector-icons/Ionicons";
import Icon3 from "react-native-vector-icons/AntDesign";
import { LineChart, BarChart, PieChart } from "react-native-gifted-charts";
import * as Location from 'expo-location';
import { ThemeColors, DEFAULT_THEME } from '../components/theme';


interface StepsScreenProps {
  onClose: () => void;
  themeColors?: ThemeColors;
}

// Mock steps data
const STEPS_DATA = {
  daily: {
    today: { steps: 8543, caloriesBurned: 423, distance: 6.8, activeMinutes: 45 },
    yesterday: { steps: 7234, caloriesBurned: 358, distance: 5.8, activeMinutes: 38 },
    dayBefore: { steps: 9100, caloriesBurned: 450, distance: 7.2, activeMinutes: 52 },
  },
  weekly: [
    { day: 'Mon', steps: 8500, calories: 420 },
    { day: 'Tue', steps: 10200, calories: 505 },
    { day: 'Wed', steps: 7800, calories: 385 },
    { day: 'Thu', steps: 9100, calories: 450 },
    { day: 'Fri', steps: 6500, calories: 320 },
    { day: 'Sat', steps: 11000, calories: 545 },
    { day: 'Sun', steps: 9200, calories: 455 },
  ],
  monthly: [
    { day: 'Week 1', steps: 52000, calories: 2570 },
    { day: 'Week 2', steps: 48500, calories: 2400 },
    { day: 'Week 3', steps: 55800, calories: 2760 },
    { day: 'Week 4', steps: 49200, calories: 2435 },
  ],
  goal: 10000,
};

// Calculate totals
const weeklyTotal = STEPS_DATA.weekly.reduce((sum, item) => sum + item.steps, 0);
const weeklyCalories = STEPS_DATA.weekly.reduce((sum, item) => sum + item.calories, 0);
const monthlyTotal = STEPS_DATA.monthly.reduce((sum, item) => sum + item.steps, 0);
const monthlyCalories = STEPS_DATA.monthly.reduce((sum, item) => sum + item.calories, 0);

// Calculate calories burned based on steps
const calculateCalories = (steps: number) => Math.round(steps * 0.04);

export default function StepsScreen({ onClose, themeColors = DEFAULT_THEME }: StepsScreenProps) {
  // Tab state for Daily Report (daily/weekly/monthly)
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  // Live tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [liveSteps, setLiveSteps] = useState(0);
  const [liveCalories, setLiveCalories] = useState(0);
  const [liveDistance, setLiveDistance] = useState(0);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const lastLocation = useRef<Location.LocationObject | null>(null);
  const totalDistance = useRef(0);
  const stepCount = useRef(0);

  // Get data based on active tab
  const getCurrentTotal = () => {
    if (activeTab === 'daily') return STEPS_DATA.daily.today.steps;
    if (activeTab === 'weekly') return weeklyTotal;
    return monthlyTotal;
  };

  const getCurrentCalories = () => {
    if (activeTab === 'daily') return STEPS_DATA.daily.today.caloriesBurned;
    if (activeTab === 'weekly') return weeklyCalories;
    return monthlyCalories;
  };

  const getChartData = () => {
    if (activeTab === 'daily') {
      return STEPS_DATA.weekly.slice(0, 3).map((item) => ({ value: item.steps, label: item.day }));
    } else if (activeTab === 'weekly') {
      return STEPS_DATA.weekly.map((item) => ({ value: item.steps, label: item.day }));
    } else {
      return STEPS_DATA.monthly.map((item) => ({ value: item.steps, label: item.day }));
    }
  };

  const getCaloriesChartData = () => {
    if (activeTab === 'daily') {
      return STEPS_DATA.weekly.slice(0, 3).map((item) => ({ value: item.calories, label: item.day, frontColor: '#84d7f4' }));
    } else if (activeTab === 'weekly') {
      return STEPS_DATA.weekly.map((item) => ({ value: item.calories, label: item.day, frontColor: '#84d7f4' }));
    } else {
      return STEPS_DATA.monthly.map((item) => ({ value: item.calories, label: item.day, frontColor: '#84d7f4' }));
    }
  };

  const progressPercentage = Math.min((getCurrentTotal() / STEPS_DATA.goal) * 100, 100);

  // Request location permission
  const requestLocationPermission = async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        Alert.alert('Permission Granted', 'Location permission has been granted. You can now track your steps.');
      } else {
        setLocationPermission(false);
        Alert.alert('Permission Denied', 'Location permission is required to track your steps.');
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationPermission(false);
      Alert.alert('Error', 'Failed to request location permission.');
    }
    setIsLoading(false);
  };

  // Check location permission status on mount
  useEffect(() => {
    checkLocationPermission();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  // Start live tracking
  const startTracking = async () => {
    if (!locationPermission) {
      await requestLocationPermission();
      return;
    }

    setIsTracking(true);
    setLiveSteps(0);
    setLiveCalories(0);
    setLiveDistance(0);
    totalDistance.current = 0;
    stepCount.current = 0;
    lastLocation.current = null;

    try {
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      lastLocation.current = initialLocation;

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (location) => {
          if (lastLocation.current) {
            const distance = calculateDistance(
              lastLocation.current.coords.latitude,
              lastLocation.current.coords.longitude,
              location.coords.latitude,
              location.coords.longitude
            );
            
            if (distance > 0.3 && distance < 3) {
              totalDistance.current += distance;
              stepCount.current += calculateSteps(distance);
              
              setLiveSteps(stepCount.current);
              setLiveCalories(calculateCalories(stepCount.current));
              setLiveDistance(totalDistance.current);
            }
          }
          lastLocation.current = location;
        }
      );
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setIsTracking(false);
      Alert.alert('Error', 'Failed to start location tracking.');
    }
  };

  // Stop tracking
  const stopTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
  };

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (deg: number) => deg * (Math.PI / 180);
  const calculateSteps = (distanceMeters: number) => Math.round(distanceMeters / 0.75);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <View style={[styles.header1, { backgroundColor: themeColors.background }]} />
      <View style={[styles.header, { backgroundColor: themeColors.secondary, borderBottomColor: themeColors.primary + "44" }]}>
        <Text style={[styles.title, { color: themeColors.text }]}>Steps</Text>
        <Pressable onPress={onClose}>
          <Icon style={[styles.closeIcon, { color: themeColors.text }]} name="times-circle" />
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* Live Tracking Section */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>Live Step Tracking</Text>
          
          <View style={styles.permissionContainer}>
            <View style={styles.permissionStatus}>
              <Icon 
                style={styles.permissionIcon} 
                name={locationPermission ? "check-circle" : "exclamation-circle"} 
                color={locationPermission ? "#4CAF50" : "#FFA500"}
              />
              <Text style={styles.permissionText}>
                {locationPermission ? "Location Permission: Granted" : "Location Permission: Not Granted"}
              </Text>
            </View>
            {!locationPermission && (
              <Pressable style={styles.permissionButton} onPress={requestLocationPermission} disabled={isLoading}>
                <Text style={styles.permissionButtonText}>
                  {isLoading ? "Requesting..." : "Grant Permission"}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={[styles.liveTrackingCard, isTracking && styles.liveTrackingActive]}>
            <View style={styles.liveHeader}>
              <Icon style={styles.liveIcon} name="heartbeat" color={isTracking ? "#FF6B6B" : "#666666"} />
              <Text style={styles.liveStatus}>
                {isTracking ? "Tracking Active" : "Ready to Track"}
              </Text>
            </View>

            <View style={styles.liveStatsContainer}>
              <View style={styles.liveStatItem}>
                <Icon2 style={styles.liveStatIcon} name="footsteps" />
                <Text style={styles.liveStatValue}>{isTracking ? liveSteps.toLocaleString() : "0"}</Text>
                <Text style={styles.liveStatLabel}>Steps</Text>
              </View>
              <View style={styles.liveStatItem}>
                <Icon style={styles.liveStatIcon1} name="fire" />
                <Text style={styles.liveStatValue}>{isTracking ? liveCalories.toLocaleString() : "0"}</Text>
                <Text style={styles.liveStatLabel}>Calories</Text>
              </View>
              <View style={styles.liveStatItem}>
                <Icon style={styles.liveStatIcon2} name="road" />
                <Text style={styles.liveStatValue}>{isTracking ? liveDistance.toFixed(2) : "0.00"}</Text>
                <Text style={styles.liveStatLabel}>km</Text>
              </View>
            </View>

            <Pressable style={[styles.trackingButton, isTracking && styles.stopButton]} onPress={isTracking ? stopTracking : startTracking}>
              <Icon style={styles.trackingButtonIcon} name={isTracking ? "stop" : "play"} />
              <Text style={styles.trackingButtonText}>{isTracking ? "Stop Tracking" : "Start Tracking"}</Text>
            </Pressable>
          </View>
        </View>

        {/* Daily Report Section with Tabs */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>Report</Text>
          
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <Pressable style={[styles.tab, activeTab === 'daily' && styles.activeTab]} onPress={() => setActiveTab('daily')}>
              <Text style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>Daily</Text>
            </Pressable>
            <Pressable style={[styles.tab, activeTab === 'weekly' && styles.activeTab]} onPress={() => setActiveTab('weekly')}>
              <Text style={[styles.tabText, activeTab === 'weekly' && styles.activeTabText]}>Weekly</Text>
            </Pressable>
            <Pressable style={[styles.tab, activeTab === 'monthly' && styles.activeTab]} onPress={() => setActiveTab('monthly')}>
              <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>Monthly</Text>
            </Pressable>
          </View>

          {/* Total Steps & Calories Card */}
          <View style={styles.totalCard}>
            <View style={styles.totalStepsContainer}>
              <Icon2 style={styles.stepsIcon} name="footsteps" />
              <View style={styles.totalStepsInfo}>
                <Text style={styles.totalStepsValue}>{getCurrentTotal().toLocaleString()}</Text>
                <Text style={styles.totalStepsLabel}>
                  {activeTab === 'daily' ? 'Today' : activeTab === 'weekly' ? 'This Week' : 'This Month'} Steps
                </Text>
              </View>
            </View>
            
            <View style={styles.caloriesContainer}>
              <Icon style={styles.caloriesIcon} name="fire" />
              <View style={styles.caloriesInfo}>
                <Text style={styles.caloriesValue}>{getCurrentCalories().toLocaleString()}</Text>
                <Text style={styles.caloriesLabel}>Calories Burned</Text>
              </View>
            </View>
          </View>

          {/* Goal Progress */}
          <View style={styles.goalContainer}>
            <View style={styles.goalProgressCircle}>
              <PieChart
                data={[
                  { value: progressPercentage, color: '#4CAF50', text: `${Math.round(progressPercentage)}%` },
                  { value: 100 - progressPercentage, color: '#211c24', text: '' },
                ]}
                radius={40}
                innerRadius={28}
                backgroundColor="#362c3a"
                centerLabelComponent={() => (
                  <Text style={styles.centerLabelText}>{Math.round(progressPercentage)}%</Text>
                )}
              />
            </View>
            <View style={styles.goalInfo}>
              <Text style={styles.goalText}>Daily Goal: {STEPS_DATA.goal.toLocaleString()} steps</Text>
              <Text style={styles.goalSubtext}>
                {activeTab === 'daily' ? `${(STEPS_DATA.goal - getCurrentTotal()).toLocaleString()} steps to go` : `Average: ${Math.round(getCurrentTotal() / (activeTab === 'weekly' ? 7 : 4)).toLocaleString()} steps/day`}
              </Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Icon style={styles.statIcon} name="fire" />
              <Text style={styles.statValue}>{getCurrentCalories()}</Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
            <View style={styles.statItem}>
              <Icon style={styles.statIcon} name="road" />
              <Text style={styles.statValue}>
                {activeTab === 'daily' ? STEPS_DATA.daily.today.distance : activeTab === 'weekly' ? (weeklyTotal / 1250).toFixed(1) : (monthlyTotal / 1250).toFixed(1)} km
              </Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statItem}>
              <Icon3 style={styles.statIcon} name="clock-circle" />
              <Text style={styles.statValue}>
                {activeTab === 'daily' ? STEPS_DATA.daily.today.activeMinutes : activeTab === 'weekly' ? Math.round(weeklyTotal / 180) : Math.round(monthlyTotal / 180)}
              </Text>
              <Text style={styles.statLabel}>Active Min</Text>
            </View>
          </View>
        </View>

        {/* Progress Charts */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>Steps Progress</Text>
          <View style={styles.graphContainer}>
            <LineChart
              data={getChartData()}
              width={245}
              height={150}
              spacing={activeTab === 'monthly' ? 50 : 35}
              color="#4CAF50"
              thickness={3}
              dataPointsColor="#4CAF50"
              dataPointsRadius={5}
              xAxisColor="#666666"
              yAxisColor="#666666"
              xAxisLabelTextStyle={{ color: "#CCCCCC", fontSize: 10 }}
              yAxisTextStyle={{ color: "#CCCCCC", fontSize: 10 }}
              noOfSections={4}
              maxValue={activeTab === 'monthly' ? 60000 : 12000}
              yAxisOffset={0}
            />
          </View>

          <View style={styles.graphContainer}>
            <Text style={styles.graphTitle}>Calories Burned</Text>
            <BarChart
              data={getCaloriesChartData()}
              width={245}
              height={120}
              barWidth={activeTab === 'monthly' ? 40 : 28}
              spacing={activeTab === 'monthly' ? 20 : 15}
              roundedTop
              roundedBottom
              xAxisThickness={1}
              yAxisThickness={1}
              xAxisColor="#666666"
              yAxisColor="#666666"
              xAxisLabelTextStyle={{ color: "#CCCCCC", fontSize: 10 }}
              yAxisTextStyle={{ color: "#CCCCCC", fontSize: 10 }}
              noOfSections={4}
              maxValue={activeTab === 'monthly' ? 3000 : 600}
              isAnimated
            />
          </View>
        </View>

        {/* Breakdown */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.primary }]}>
            {activeTab === 'daily' ? 'Recent Days' : activeTab === 'weekly' ? 'Daily Breakdown' : 'Weekly Breakdown'}
          </Text>
          {(activeTab === 'daily' ? STEPS_DATA.weekly.slice(0, 3) : activeTab === 'weekly' ? STEPS_DATA.weekly : STEPS_DATA.monthly).map((item, index) => (
            <View key={index} style={styles.dailyBreakdownItem}>
              <View style={styles.dayInfo}>
                <Text style={styles.dayName}>{item.day}</Text>
                <Text style={styles.daySteps}>{item.steps.toLocaleString()} steps</Text>
              </View>
              <View style={styles.dayCalories}>
                <Icon style={styles.caloriesIcon} name="fire" />
                <Text style={styles.caloriesValue}>{item.calories} kcal</Text>
              </View>
            </View>
          ))}
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
  // Tab styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#362c3a",
    borderRadius: 12,
    padding: 4,
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: "#c67ee2",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#CCCCCC",
  },
  activeTabText: {
    color: "#FFFFFF",
  },
  // Total card styles
  totalCard: {
    backgroundColor: "#190f1d",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  totalStepsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  stepsIcon: {
    fontSize: 35,
    color: "#84d7f4",
    marginRight: 12,
  },
  totalStepsInfo: {
    flex: 1,
  },
  totalStepsValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  totalStepsLabel: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  caloriesContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 3,
    borderTopColor: "#362c3a",
    paddingTop: 10,
  },
  caloriesIcon: {
    fontSize: 35,
    color: "#fc9139",
    marginRight: 12,
  },
  caloriesInfo: {
    flex: 1,
  },
  caloriesValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  caloriesLabel: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  // Goal styles
  goalContainer: {
    position:"relative",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#362c3a",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  goalProgressCircle: {
    marginRight: 15,
  },
  centerLabelText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  goalInfo: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
  goalText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  goalSubtext: {
    fontSize: 12,
    color: "#CCCCCC",
  },
  // Stats grid
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    backgroundColor: "#362c3a",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginHorizontal: 3,
  },
  statIcon: {
    fontSize: 20,
    color: "#84d7f4",
    marginBottom: 5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "#CCCCCC",
    textAlign: "center",
  },
  // Permission styles
  permissionContainer: {
    backgroundColor: "#313031",
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
  },
  permissionStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  permissionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  permissionText: {
    fontSize: 13,
    color: "#CCCCCC",
    flex: 1,
  },
  permissionButton: {
    backgroundColor: "#4CAF50",
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  permissionButtonText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  // Live tracking styles
  liveTrackingCard: {
    backgroundColor: "#362c3a",
    borderRadius: 15,
    padding: 15,
    borderWidth: 2,
    borderColor: "#362c3a",
  },
  liveTrackingActive: {
    borderColor: "#FF6B6B",
    backgroundColor: "#1a1518",
  },
  liveHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  liveIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  liveStatus: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  liveStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
  },
  liveStatItem: {
    alignItems: "center",
  },
  liveStatIcon: {
    fontSize: 20,
    color: "#84d7f4",
    marginBottom: 4,
  },
  liveStatIcon1: {
    fontSize: 20,
    color: "#FF9800",
    marginBottom: 5,
  },
  liveStatIcon2: {
    fontSize: 20,
    color: "#838383",
    marginBottom: 4,
  },
  liveStatValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  liveStatLabel: {
    fontSize: 10,
    color: "#CCCCCC",
  },
  trackingButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#c67ee2",
    padding: 12,
    borderRadius: 8,
  },
  stopButton: {
    backgroundColor: "#FF6B6B",
  },
  trackingButtonIcon: {
    fontSize: 18,
    color: "#FFFFFF",
    marginRight: 8,
  },
  trackingButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  // Graph styles
  graphContainer: {
    alignItems: "center",
    marginBottom: 15,
    backgroundColor: "#190f1d",
    borderRadius: 10,
    padding: 12,
  },
  graphTitle: {
    fontSize: 13,
    color: "#CCCCCC",
    marginBottom: 8,
  },
  // Breakdown styles
  dailyBreakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#362c3a",
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  daySteps: {
    fontSize: 11,
    color: "#CCCCCC",
  },
  dayCalories: {
    flexDirection: "row",
    alignItems: "center",
  },
});