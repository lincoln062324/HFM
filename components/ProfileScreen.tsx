// Profile Screen Component
import { StyleSheet, Text, View, Image, ScrollView, Pressable, Dimensions } from "react-native";
import React, { useState } from "react";
import Icon from "react-native-vector-icons/FontAwesome";
import Icon1 from "react-native-vector-icons/Foundation";
import Icon2 from "react-native-vector-icons/Entypo";

import { LineChart } from "react-native-gifted-charts";

interface ProfileScreenProps {
  onClose: () => void;
}

// Mock user data
const USER_DATA = {
  profileImage: require("../assets/images/g.jpg"),
  fullName: "John Doe",
  country: "United States",
  currentWeight: 165,
  targetWeight: 150,
  weeklyProgress: [
    { day: 'Mon', value: 168 },
    { day: 'Tue', value: 167 },
    { day: 'Wed', value: 166 },
    { day: 'Thu', value: 166 },
    { day: 'Fri', value: 165 },
    { day: 'Sat', value: 165 },
    { day: 'Sun', value: 165 },
  ],
  dailySteps: 8543,
  caloriesBurned: 423,
  foodCategories: {
    fruits: 12,
    vegetables: 18,
    grains: 15,
    protein: 14,
    dairy: 8,
  },
  exercises: [
    { name: 'Running', duration: '30 min', calories: 300 },
    { name: 'Cycling', duration: '45 min', calories: 250 },
    { name: 'Swimming', duration: '40 min', calories: 350 },
  ],
  dailyGoalAchieved: true,
  habits: [
    { name: 'Eat more protein', alarm: '08:00', date: '2024-01-15' },
    { name: 'Drink more water', alarm: '09:00', date: '2024-01-15' },
  ],
};

export default function ProfileScreen({ onClose }: ProfileScreenProps) {
  const lineData = USER_DATA.weeklyProgress.map((item) => ({
    value: item.value,
    label: item.day,
  }));

  return (
    <View style={styles.container}>
    <View style={styles.header1}>

    </View>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Pressable onPress={onClose}>
          <Icon style={styles.closeIcon} name="times-circle" />
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* User Info Section */}
        <View style={styles.userInfoSection}>
          <Image style={styles.profileImage} source={USER_DATA.profileImage} />
          <Text style={styles.userName}>{USER_DATA.fullName}</Text>
          <Text style={styles.userCountry}>{USER_DATA.country}</Text>
        </View>

        {/* Weight Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weight Progress</Text>
          <View style={styles.weightInfo}>
            <View style={styles.weightItem}>
              <Text style={styles.weightLabel}>Current</Text>
              <Text style={styles.weightValue}>{USER_DATA.currentWeight} lbs</Text>
            </View>
            <View style={styles.weightItem}>
              <Text style={styles.weightLabel}>Target</Text>
              <Text style={styles.weightValue}>{USER_DATA.targetWeight} lbs</Text>
            </View>
            <View style={styles.weightItem}>
              <Text style={styles.weightLabel}>Lost</Text>
              <Text style={styles.weightValue}>{USER_DATA.currentWeight - USER_DATA.targetWeight} lbs</Text>
            </View>
          </View>
        </View>

        {/* Weekly Progress Line Graph */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Weight Progress</Text>
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

        {/* Daily Steps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitles}>Daily Steps</Text>
          <View style={styles.stepsContainer}>
              <Image source={require("../assets/images/fs.png")} 
              style={styles.stepsIcon} 
              />
            <View style={styles.stepsMain}>
              <Text style={styles.stepsValue}>{USER_DATA.dailySteps.toLocaleString()}</Text>
              <Text style={styles.stepsLabel}>steps today</Text>
            </View>
              <Image source={require("../assets/images/kcal.png")} 
              style={styles.stepsIcon} 
              />
            <View style={styles.caloriesBurned}>
              <Text style={styles.caloriesValue}>{USER_DATA.caloriesBurned} kcal</Text>
              <Text style={styles.caloriesLabel}>Calories Burned</Text>
            </View>
          </View>
        </View>

        {/* Food Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Food Categories Saved</Text>
          <View style={styles.categoriesGrid}>
            <View style={styles.categoryItem}>
              <Icon1 style={styles.categoryIcon} name="lightbulb" />
              <Text style={styles.categoryLabel}>Fruits</Text>
              <Text style={styles.categoryValue}>{USER_DATA.foodCategories.fruits}</Text>
            </View>
            <View style={styles.categoryItem}>
              <Icon1 style={styles.categoryIcon} name="lightbulb" />
              <Text style={styles.categoryLabel}>Vegetables</Text>
              <Text style={styles.categoryValue}>{USER_DATA.foodCategories.vegetables}</Text>
            </View>
            <View style={styles.categoryItem}>
              <Icon1 style={styles.categoryIcon} name="lightbulb" />
              <Text style={styles.categoryLabel}>Grains</Text>
              <Text style={styles.categoryValue}>{USER_DATA.foodCategories.grains}</Text>
            </View>
            <View style={styles.categoryItem}>
              <Icon1 style={styles.categoryIcon} name="lightbulb" />
              <Text style={styles.categoryLabel}>Protein</Text>
              <Text style={styles.categoryValue}>{USER_DATA.foodCategories.protein}</Text>
            </View>
            <View style={styles.categoryItem}>
              <Icon1 style={styles.categoryIcon} name="lightbulb" />
              <Text style={styles.categoryLabel}>Dairy</Text>
              <Text style={styles.categoryValue}>{USER_DATA.foodCategories.dairy}</Text>
            </View>
          </View>
        </View>

        {/* Exercises */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          {USER_DATA.exercises.map((exercise, index) => (
            <View key={index} style={styles.exerciseItem}>
              <View style={styles.exerciseLeft}>
                <Icon2 style={styles.exerciseIcon} name="sports-club" />
                <View>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseDuration}>{exercise.duration}</Text>
                </View>
              </View>
              <Text style={styles.exerciseCalories}>{exercise.calories} kcal</Text>
            </View>
          ))}
        </View>

        {/* Daily Goal Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Goal</Text>
          <View style={styles.goalStatus}>
            <Icon 
              style={[styles.goalIcon, USER_DATA.dailyGoalAchieved && styles.goalIconAchieved]} 
              name={USER_DATA.dailyGoalAchieved ? "check-circle" : "times-circle"} 
            />
            <Text style={styles.goalText}>
              {USER_DATA.dailyGoalAchieved ? "Goal Achieved!" : "Goal Not Achieved"}
            </Text>
          </View>
        </View>

        {/* Habits with Alarms - Right Side */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Habits & Alarms</Text>
          {USER_DATA.habits.map((habit, index) => (
            <View key={index} style={styles.habitItem}>
              <View style={styles.habitLeft}>
                <Icon style={styles.habitIcon} name="bell" />
                <View>
                  <Text style={styles.habitName}>{habit.name}</Text>
                  <Text style={styles.habitDate}>{habit.date}</Text>
                </View>
              </View>
              <View style={styles.habitRight}>
                <Text style={styles.habitAlarm}>{habit.alarm}</Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
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
});

