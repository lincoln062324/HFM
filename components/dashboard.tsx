// Dashboard Component with Navigation
import { StyleSheet, Text, View, Image, ScrollView, Animated, Dimensions, Pressable, TextInput, Alert, useWindowDimensions, useColorScheme } from "react-native";
import React, { useState, useRef, useEffect, useCallback } from "react";
import Icon from "react-native-vector-icons/FontAwesome";
import Icon2 from "react-native-vector-icons/FontAwesome5";
import { PieChart } from "react-native-gifted-charts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import supabase from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';



// Theme colors matching SettingsScreen
const THEME_COLORS = {
  system: {
    id: 'system',
    primary: '#2196F3',
    secondary: '#1a237e',
    background: '#0d1b2a',
    card: '#1b263b',
    text: '#FFFFFF',
    accent: '#64b5f6',
  },
  purple: {
    id: 'purple',
    primary: '#c67ee2',
    secondary: '#1e1929',
    background: '#15041f',
    card: '#211c24',
    text: '#FFFFFF',
    accent: '#84d7f4',
  },
  blue: {
    id: 'blue',
    primary: '#2196F3',
    secondary: '#1a237e',
    background: '#0d1b2a',
    card: '#1b263b',
    text: '#FFFFFF',
    accent: '#64b5f6',
  },
  green: {
    id: 'green',
    primary: '#4CAF50',
    secondary: '#1b5e20',
    background: '#0a1f0a',
    card: '#1b3a1b',
    text: '#FFFFFF',
    accent: '#81c784',
  },
  orange: {
    id: 'orange',
    primary: '#FF9800',
    secondary: '#e65100',
    background: '#1a0f00',
    card: '#2d1f0a',
    text: '#FFFFFF',
    accent: '#ffb74d',
  },
  red: {
    id: 'red',
    primary: '#f44336',
    secondary: '#b71c1c',
    background: '#1a0505',
    card: '#2d0f0f',
    text: '#FFFFFF',
    accent: '#e57373',
  },
  teal: {
    id: 'teal',
    primary: '#009688',
    secondary: '#004d40',
    background: '#001a17',
    card: '#0d2d28',
    text: '#FFFFFF',
    accent: '#4db6ac',
  },
};

const DEFAULT_THEME = 'purple';

// Sticky Note Types
interface StickyNoteItem {
  id: string;
  text: string;
  checked: boolean;
}

interface StickyNote {
  id: string;
  title: string;
  content: string;
  items: StickyNoteItem[];
  createdAt: string;
  updatedAt: string;
}

// Food Entry Types for AI Food Analysis
export interface FoodEntry {
  id: string;
  imageUri: string;
  foodName: string;
  calories: number;
  benefits: string;
  timestamp: string;
}

// Storage Keys
const STORAGE_KEY = "@sticky_notes";
const FOOD_ENTRIES_KEY = "@food_entries";

// Storage Utility Functions
// REMOVED: saveNotes and loadNotes - now using Supabase functions with local fallbacks

// Food Entry Storage Functions
const saveFoodEntries = async (entries: FoodEntry[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(FOOD_ENTRIES_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error("Error saving food entries:", error);
    Alert.alert("Error", "Failed to save food entry.");
  }
};

const loadFoodEntries = async (): Promise<FoodEntry[]> => {
  try {
    const storedEntries = await AsyncStorage.getItem(FOOD_ENTRIES_KEY);
    return storedEntries ? JSON.parse(storedEntries) : [];
  } catch (error) {
    console.error("Error loading food entries:", error);
    return [];
  }
};

// Import screen components
import ProfileScreen from "../components/ProfileScreen";
import WeeklyReportScreen from "../components/WeeklyReportScreen";
import GoalsScreen from "../components/GoalsScreen";
import RecipesScreen from "../components/RecipesScreen";
import StepsScreen from "../components/StepsScreen";
import RemindersScreen, { HabitReminder } from "../components/RemindersScreen";
import SettingsScreen from "../components/SettingsScreen";
import CameraScreen from "../components/CameraScreen";
import ExerciseScreen from "../components/ExerciseScreen";
import GoalReachedModal from "./GoalReachedModal";


// Reminder types (matching RemindersScreen)
interface HabitReminderData {
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

// Calorie Chart Configuration
const CALORIE_CHART_CONFIG = {
  food: { color: "#84d7f4" },
  exercise: { color: "#F3AF41" },
  remaining: { color: "#E8DEF8" },
  base: { color: "#B3B3B3" },
};

// Habit List
const HABIT_LIST = [
  { name: 'Eat more protein', benefits: 'Builds muscle, supports metabolism, promotes satiety.' },
  { name: 'Drink more water', benefits: 'Hydrates the body, improves digestion, boosts energy.' },
  { name: 'Eat more fruit', benefits: 'Provides vitamins, antioxidants, supports immune health.' },
  { name: 'Eat more vegetables', benefits: 'Rich in fiber, vitamins, reduces disease risk.' },
  { name: 'Log a daily meal', benefits: 'Tracks nutrition, promotes mindful eating, aids weight management.' },
  { name: 'Eat more fiber', benefits: 'Improves digestion, regulates blood sugar, supports heart health.' },
  { name: 'Get more exercise', benefits: 'Strengthens muscles, improves cardiovascular health, boosts mood.' },
  { name: 'Drink less alcohol', benefits: 'Reduces liver strain, improves sleep, supports weight loss.' },
  { name: 'Reduce added sugar', benefits: 'Lowers calorie intake, improves dental health, stabilizes energy.' },
];

interface Habit {
  name: string;
  benefits: string;
  reminderTime?: string;
}

// Initial reminders data
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

const Dashboard = () => {
  console.log(supabase)

  const systemColorScheme = useColorScheme();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [appTheme, setAppTheme] = useState(DEFAULT_THEME);
  
  // Load saved theme on mount
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@app_theme');
        if (savedTheme) {
          setAppTheme(savedTheme);
        }
      } catch (error) {
        console.log('Error loading theme:', error);
      }
    };
    loadSavedTheme();
  }, []);

  // Get current theme colors based on app theme setting
  const getCurrentThemeColors = () => {
    if (appTheme === 'system') {
      const isDark = systemColorScheme === 'dark';
      return {
        primary: isDark ? '#2196F3' : '#2196F3',
        secondary: isDark ? '#1a237e' : '#bbdefb',
        background: isDark ? '#0d1b2a' : '#f5f5f5',
        card: isDark ? '#1b263b' : '#ffffff',
        text: isDark ? '#FFFFFF' : '#000000',
        accent: isDark ? '#64b5f6' : '#1976D2',
      };
    }
    return THEME_COLORS[appTheme as keyof typeof THEME_COLORS] || THEME_COLORS.purple;
  };

  const currentThemeColors = getCurrentThemeColors();

  // Handle theme change from SettingsScreen
  const handleThemeChange = async (themeId: string) => {
    setAppTheme(themeId);
    try {
      await AsyncStorage.setItem('@app_theme', themeId);
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };
const sidebarAnimation = useRef(new Animated.Value(-Dimensions.get('window').width * 0.7)).current;
const [foodValue, setFoodValue] = useState(0);
const [exerciseValue, setExerciseValue] = useState(0);
const [dailyCalorieGoal, setDailyCalorieGoal] = useState(2000);

const totalProgress = foodValue + exerciseValue;

  const [showGoalReachedModal, setShowGoalReachedModal] = useState(false);
  const [showGoalReachedNotification, setShowGoalReachedNotification] = useState(false);
  const [goalReachedToday, setGoalReachedToday] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState('');

  const MOTIVATIONAL_QUOTES = [
    "🎉 Goal reached! You're crushing it today!",
    "Amazing work! Your dedication is paying off!",
    "You're a fitness rockstar! Keep shining! ⭐",
    "Goal achieved! Consistency creates results!",
    "Incredible! You've earned that victory dance! 💃",
    "Target hit! Your hard work is unstoppable!",
    "Legendary effort! You're building an epic future!",
    "Mission accomplished! You're unstoppable! 🚀",
    "Perfect execution! Health is your superpower!",
    "Champion status achieved! Own your greatness!",
  ];

  // Load saved values including goal
  useEffect(() => {
    const loadValues = async () => {
      try {
        const food = await AsyncStorage.getItem('@foodValue');
        const exercise = await AsyncStorage.getItem('@exerciseValue');
        const goal = await AsyncStorage.getItem('@dailyCalorieGoal');
        const todayFlag = await AsyncStorage.getItem('@goalReachedToday');
        const today = new Date().toDateString();
        const savedDate = await AsyncStorage.getItem('@goalReachedDate');
        
        if (food !== null) setFoodValue(parseInt(food));
        if (exercise !== null) setExerciseValue(parseInt(exercise));
        if (goal !== null) setDailyCalorieGoal(parseInt(goal));
        
// Reset daily flag if new day
        if (savedDate !== today) {
          setGoalReachedToday(false);
          await AsyncStorage.multiRemove(['@goalReachedToday', '@goalReachedDate']);
        } else if (todayFlag === 'true') {
          setGoalReachedToday(true);
        }
        
        // Clear reset timestamp if new day
        const resetTimestamp = await AsyncStorage.getItem('@dailyResetTimestamp');
        if (resetTimestamp !== today) {
          await AsyncStorage.removeItem('@dailyResetTimestamp');
        }
      } catch (error) {
        console.log('Error loading values:', error);
      }
    };
    loadValues();
  }, []);

  // Check if goal is reached (totalProgress >= dailyCalorieGoal)
  const isGoalReached = totalProgress >= dailyCalorieGoal;

  // Save values when changed + check goal reached (only show modal once per day when exactly reaching)
  const checkGoalReached = async (newTotalProgress: number) => {
    if (goalReachedToday || newTotalProgress < dailyCalorieGoal) return;

    const today = new Date().toDateString();
    const savedDate = await AsyncStorage.getItem('@goalReachedDate');
    
    if (savedDate !== today) {
      setSelectedQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
      setShowGoalReachedModal(true);
      setGoalReachedToday(true);
      await AsyncStorage.multiSet([
        ['@goalReachedToday', 'true'],
        ['@goalReachedDate', today]
      ]);
    }
  };

  // Show notification for goal reached (can show multiple times if already reached)
  const showGoalReachedAlert = () => {
    if (!isGoalReached) return;
    setSelectedQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
    setShowGoalReachedNotification(true);
  };

  const saveFoodValue = async (addedCalories: number) => {
    const current = foodValue;
    const newTotal = current + addedCalories;
    const newTotalProgress = newTotal + exerciseValue;
    setFoodValue(newTotal);
    try {
      await AsyncStorage.setItem('@foodValue', newTotal.toString());
      await checkGoalReached(newTotalProgress);
    } catch (error) {
      console.log('Error saving food value:', error);
    }
  };

  const saveExerciseValue = async (addedCalories: number) => {
    const current = exerciseValue;
    const newTotal = current + addedCalories;
    const newTotalProgress = newTotal + foodValue;
    setExerciseValue(newTotal);
    try {
      await AsyncStorage.setItem('@exerciseValue', newTotal.toString());
      await checkGoalReached(newTotalProgress);
    } catch (error) {
      console.log('Error saving exercise value:', error);
    }
  };


  const resetDailyCounts = () => {
    Alert.alert(
      "Reset Daily Counts",
      "Reset food and exercise to 0?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          style: "destructive",
          onPress: async () => {
            try {
              setFoodValue(0);
              setExerciseValue(0);
              setGoalReachedToday(false);
              await AsyncStorage.multiRemove(['@foodValue', '@exerciseValue', '@goalReachedToday', '@goalReachedDate']);
              Alert.alert("Success", "Daily counts reset to 0!");
            } catch (error) {
              console.error('Reset error:', error);
              Alert.alert("Error", "Failed to reset counts.");
            }
          }
        }
      ]
    );
  };

  const updateDailyGoal = async (newGoal: number) => {
    setDailyCalorieGoal(newGoal);
    try {
      await AsyncStorage.setItem('@dailyCalorieGoal', newGoal.toString());
    } catch (error) {
      console.log('Error saving goal:', error);
    }
  };
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isHabitModalVisible, setIsHabitModalVisible] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [reminderDate, setReminderDate] = useState(new Date().toISOString().split('T')[0]);
  const [repeatOption, setRepeatOption] = useState('Daily');
  // Auth state
  const [userSession, setUserSession] = useState<Session | null>(null);
  const [userProfileData, setUserProfileData] = useState<{ full_name: string; email: string } | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  // Sticky Notes State
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);
  const [isStickyNoteModalVisible, setIsStickyNoteModalVisible] = useState(false);
  const [currentNote, setCurrentNote] = useState<StickyNote | null>(null);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newListItem, setNewListItem] = useState("");
  const [activeTab, setActiveTab] = useState<'write' | 'list' | 'notes'>('write');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // State for note saved preview modal
  const [showNoteSavedModal, setShowNoteSavedModal] = useState(false);
  const [savedNotePreview, setSavedNotePreview] = useState<{title: string; content: string; items: StickyNoteItem[]} | null>(null);
  
// State for note overview modal (read-only view)
  const [showNoteOverviewModal, setShowNoteOverviewModal] = useState(false);
  const [selectedNoteForOverview, setSelectedNoteForOverview] = useState<StickyNote | null>(null);

  // Food Entries State for AI Food Analysis

  // Animated values for sticky note modal
  const stickyNoteModalBackdrop = useRef(new Animated.Value(0)).current;
  const stickyNoteModalScale = useRef(new Animated.Value(0.8)).current;
  const stickyNoteModalOpacity = useRef(new Animated.Value(0)).current;

  // Animated values for note saved preview modal
  const noteSavedModalBackdrop = useRef(new Animated.Value(0)).current;
  const noteSavedModalScale = useRef(new Animated.Value(0.8)).current;
  const noteSavedModalOpacity = useRef(new Animated.Value(0)).current;

// Animated values for note overview modal
  const noteOverviewModalBackdrop = useRef(new Animated.Value(0)).current;
  const noteOverviewModalScale = useRef(new Animated.Value(0.8)).current;
  const noteOverviewModalOpacity = useRef(new Animated.Value(0)).current;

  // Statistics Modal state
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);

  // Statistics modal animations
  const statisticsModalBackdrop = useRef(new Animated.Value(0)).current;
  const statisticsModalScale = useRef(new Animated.Value(0.8)).current;
  const statisticsModalOpacity = useRef(new Animated.Value(0)).current;

  // Statistics modal visibility effect
  useEffect(() => {
    if (showStatisticsModal) {
      Animated.parallel([
        Animated.timing(statisticsModalBackdrop, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(statisticsModalScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(statisticsModalOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      statisticsModalBackdrop.setValue(0);
      statisticsModalScale.setValue(0.8);
      statisticsModalOpacity.setValue(0);
    }
  }, [showStatisticsModal]);

  const closeStatisticsModal = () => {
    Animated.parallel([
      Animated.timing(statisticsModalBackdrop, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(statisticsModalScale, { toValue: 0.8, duration: 250, useNativeDriver: true }),
      Animated.timing(statisticsModalOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setShowStatisticsModal(false));
  };

// Auth listener
  useEffect(() => {
    const fetchUserProfile = async (userId: string) => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('user_id', userId)
          .single();
        if (data) setUserProfileData({ full_name: data.full_name ?? '', email: data.email ?? '' });
      } catch (e) {
        console.log('Profile fetch error:', e);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session);
      if (session?.user?.id) { fetchUserProfile(session.user.id); fetchReminders(session.user.id); }
      console.log('🔑 Initial session:', session?.user?.id || 'NO USER');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserSession(session);
      if (session?.user?.id) { fetchUserProfile(session.user.id); fetchReminders(session.user.id); }
      else setUserProfileData(null);
      console.log('🔄 Auth change:', session?.user?.id || 'NO USER');
    });

    return () => subscription.unsubscribe();
  }, []);

// ── fetchSavedNotes: single source of truth for savedNotesSection ────────────
// Hits Supabase directly for logged-in users; falls back to AsyncStorage for guests.
const fetchSavedNotes = useCallback(async (): Promise<void> => {
  setNotesLoading(true);
  setNotesError(null);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('sticky_notes')
        .select('id, title, content, items, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const notes: StickyNote[] = (data || []).map((row: any): StickyNote => ({
        id: row.id,
        title: row.title || 'Untitled Note',
        content: row.content || '',
        items: Array.isArray(row.items) ? row.items : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      setStickyNotes(notes);
      console.log('✅ fetchSavedNotes: loaded', notes.length, 'from Supabase');
    } else {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const local: StickyNote[] = raw ? JSON.parse(raw) : [];
      setStickyNotes(local);
      console.log('💾 fetchSavedNotes: loaded', local.length, 'from local (guest)');
    }
  } catch (err: any) {
    console.error('💥 fetchSavedNotes error:', err);
    setNotesError(err?.message || 'Failed to load notes');
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setStickyNotes(raw ? JSON.parse(raw) : []);
    } catch { setStickyNotes([]); }
  } finally {
    setNotesLoading(false);
  }
}, []);

// Keep loadNotesFromSupabase as a thin wrapper for legacy callers (delete fallback etc.)
const loadNotesFromSupabase = useCallback(async (): Promise<StickyNote[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('sticky_notes').select('*').eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (!error && data) return data.map((row: any): StickyNote => ({
        id: row.id, title: row.title || 'Untitled Note',
        content: row.content || '', items: Array.isArray(row.items) ? row.items : [],
        createdAt: row.created_at, updatedAt: row.updated_at,
      }));
    }
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}, []);

const saveNoteToSupabase = useCallback(async (note: StickyNote): Promise<void> => {
  console.log('💾 saveNoteToSupabase → LOCAL + SUPABASE:', {id: note.id, title: note.title, session: !!userSession?.user});
  
  // 1. ALWAYS local → instant UI
  try {
    const localNotesStr = await AsyncStorage.getItem(STORAGE_KEY);
    const localNotes: StickyNote[] = localNotesStr ? JSON.parse(localNotesStr) : [];
    const updatedLocalNotes = localNotes.map(n => n.id === note.id ? note : n);
    if (!updatedLocalNotes.some(n => n.id === note.id)) {
      updatedLocalNotes.push(note);
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLocalNotes));
    setStickyNotes(updatedLocalNotes); // INSTANT reflect
    console.log('✅ LOCAL + UI:', updatedLocalNotes.length);
  } catch (localErr) {
    console.error('❌ Local failed:', localErr);
  }
  
  // 2. ALWAYS Supabase (w/ session if exists)
  try {
    const upsertData = {
      id: note.id,
      ...(userSession?.user && { user_id: userSession.user.id }), // RLS compliant
      title: note.title,
      content: note.content,
      items: note.items || [],
      updated_at: new Date().toISOString(),
    };
    
    console.log('☁️ Upsert data:', upsertData);
    const { data, error } = await supabase
      .from('sticky_notes')
      .upsert(upsertData, { onConflict: 'id' });
    
    if (error) {
      console.error('☁️ Supabase ERROR:', error.message, error.code);
    } else {
      console.log('☁️ SUPABASE SUCCESS! Data:', data);
    }
  } catch (supabaseErr) {
    console.error('☁️ Supabase CRASH:', supabaseErr);
  }
}, [userSession]);

// Delete note from Supabase + local
const deleteNoteFromSupabase = useCallback(async (noteId: string): Promise<void> => {

    if (!userSession?.user) {
      // Local fallback
      const notes = await loadNotes();
      const updatedNotes = notes.filter(n => n.id !== noteId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
      return;
    }

    try {
      const { error } = await supabase
        .from('sticky_notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', userSession.user.id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Delete note error:', error);
      setNotesError(error.message || 'Failed to delete note');
      // Local fallback
      const notes = await loadNotes();
      const updatedNotes = notes.filter(n => n.id !== noteId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedNotes));
    }
  }, [userSession]);

// Unified loadNotes (Supabase first)
  const loadNotes = useCallback(async (): Promise<StickyNote[]> => {
    // Always try Supabase first (anon gets [])
    const notes = await loadNotesFromSupabase();
    if (notes.length > 0) return notes;
    
    // Supabase fallback (RLS/anon)
    try {
      const storedNotes = await AsyncStorage.getItem(STORAGE_KEY);
      return storedNotes ? JSON.parse(storedNotes) : [];
    } catch (error) {
      console.error('Local load error:', error);
      return [];
    }
  }, [loadNotesFromSupabase]);

// Initial fetch + Realtime subscription — auto-updates savedNotesSection live
  useEffect(() => {
    // 1. Fetch immediately whenever auth state changes
    fetchSavedNotes();

    // 2. Subscribe to realtime changes on sticky_notes for this user
    const userId = userSession?.user?.id;
    if (!userId) return; // guests: no realtime needed, AsyncStorage is already synced

    const channel = supabase
      .channel(`sticky_notes:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',            // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'sticky_notes',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔴 Realtime event:', payload.eventType, (payload.new as any)?.title ?? (payload.old as any)?.id);
          // Re-fetch the full ordered list so savedNotesSection is always in sync
          fetchSavedNotes();
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userSession, fetchSavedNotes]);

  // Handle sticky note modal visibility
  useEffect(() => {
    if (isStickyNoteModalVisible) {
      Animated.parallel([
        Animated.timing(stickyNoteModalBackdrop, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(stickyNoteModalScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(stickyNoteModalOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      stickyNoteModalBackdrop.setValue(0);
      stickyNoteModalScale.setValue(0.8);
      stickyNoteModalOpacity.setValue(0);
    }
  }, [isStickyNoteModalVisible]);

  // Handle note saved preview modal visibility
  useEffect(() => {
    if (showNoteSavedModal) {
      Animated.parallel([
        Animated.timing(noteSavedModalBackdrop, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(noteSavedModalScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(noteSavedModalOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      noteSavedModalBackdrop.setValue(0);
      noteSavedModalScale.setValue(0.8);
      noteSavedModalOpacity.setValue(0);
    }
  }, [showNoteSavedModal]);

  const animateNoteSavedModalOut = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(noteSavedModalBackdrop, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(noteSavedModalScale, { toValue: 0.8, duration: 250, useNativeDriver: true }),
      Animated.timing(noteSavedModalOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => callback());
  };

  // Handle note overview modal visibility
  useEffect(() => {
    if (showNoteOverviewModal) {
      Animated.parallel([
        Animated.timing(noteOverviewModalBackdrop, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(noteOverviewModalScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(noteOverviewModalOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      noteOverviewModalBackdrop.setValue(0);
      noteOverviewModalScale.setValue(0.8);
      noteOverviewModalOpacity.setValue(0);
    }
  }, [showNoteOverviewModal]);

  const animateNoteOverviewModalOut = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(noteOverviewModalBackdrop, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(noteOverviewModalScale, { toValue: 0.8, duration: 250, useNativeDriver: true }),
      Animated.timing(noteOverviewModalOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => callback());
  };

  // Handler to open note overview
  const handleOpenNoteOverview = (note: StickyNote) => {
    setSelectedNoteForOverview(note);
    setShowNoteOverviewModal(true);
  };

  const animateStickyNoteModalOut = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(stickyNoteModalBackdrop, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(stickyNoteModalScale, { toValue: 0.8, duration: 250, useNativeDriver: true }),
      Animated.timing(stickyNoteModalOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => callback());
  };

  const openStickyNoteModal = () => {
    setIsMenuVisible(false);
    setIsCreatingNew(false);
    setCurrentNote(null);
    setNewNoteTitle("");
    setNewNoteContent("");
    setNewListItem("");
    setActiveTab('write');
    setIsStickyNoteModalVisible(true);
  };

  const openNewNote = () => {
    setIsCreatingNew(true);
    setCurrentNote(null);
    setNewNoteTitle("");
    setNewNoteContent("");
    setNewListItem("");
    setActiveTab('write');
  };

const refreshSavedNotes = async () => {
  await fetchSavedNotes();
};

const handleSaveNote = async () => {
  console.log('✏️ handleSaveNote called');
  if (!newNoteTitle.trim() && !newNoteContent.trim() && (!currentNote || currentNote.items.length === 0)) {
    Alert.alert("Error", "Please add some content to your note.");
    return;
  }

  const now = new Date().toISOString();
  let updatedNote: StickyNote;
  
  if (currentNote) {
    console.log('🔄 Updating note:', currentNote.id);
    updatedNote = {
      ...currentNote,
      title: newNoteTitle || currentNote.title,
      content: newNoteContent || currentNote.content,
      updatedAt: now,
    };
  } else {
    console.log('➕ Creating new note');
    updatedNote = {
      id: Date.now().toString(),
      title: newNoteTitle || "Untitled Note",
      content: newNoteContent || '',
      items: [],
      createdAt: now,
      updatedAt: now,
    };
  }
  
  // Save to Supabase + local, then refresh
  await saveNoteToSupabase(updatedNote);
  await refreshSavedNotes();
  
  Alert.alert("Success", "Note saved successfully!");
  
  // Reset form
  setIsCreatingNew(false);
  setCurrentNote(null);
  setNewNoteTitle("");
  setNewNoteContent("");
  setNewListItem("");
};


const handleAddListItem = async () => {
  if (!newListItem.trim()) return;
  
  const newItem: StickyNoteItem = {
    id: Date.now().toString(),
    text: newListItem,
    checked: false,
  };

  let updatedNote: StickyNote;
  if (currentNote) {
    updatedNote = {
      ...currentNote,
      items: [...currentNote.items, newItem],
      updatedAt: new Date().toISOString(),
    };
  } else {
    updatedNote = {
      id: Date.now().toString(),
      title: newNoteTitle || "Untitled List",
      content: "",
      items: [newItem],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  
  setCurrentNote(updatedNote);
  setNewListItem("");
  
  // Auto-save list changes
  await saveNoteToSupabase(updatedNote);
  await refreshSavedNotes();
};


const handleToggleItem = async (itemId: string) => {
  if (currentNote) {
    const updatedItems = currentNote.items.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    
    const updatedNote: StickyNote = {
      ...currentNote,
      items: updatedItems,
      updatedAt: new Date().toISOString()
    };
    
    setCurrentNote(updatedNote);
    await saveNoteToSupabase(updatedNote);
    await refreshSavedNotes();
  }
};


  const handleDeleteNote = async (noteId: string) => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to delete this note?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteNoteFromSupabase(noteId);
            
            // Refresh notes list
            const refreshedNotes = await loadNotes();
            setStickyNotes(refreshedNotes);
            
            if (currentNote?.id === noteId) {
              setCurrentNote(null);
              setNewNoteTitle("");
              setNewNoteContent("");
              setNewListItem("");
            }
          },
        },
      ]
    );
  };

  const handleSelectNote = (note: StickyNote) => {
    setCurrentNote(note);
    setNewNoteTitle(note.title);
    setNewNoteContent(note.content);
    setIsCreatingNew(true);
  };

// Helper function to format time for display
  const formatTimeForDisplay = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Helper function to get day of week abbreviation
  const getDayOfWeek = (date: Date): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  // State for current date and time
  const [currentDate, setCurrentDate] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format date and time for display
  const formatCurrentDate = (): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = currentDate.getDate();
    const month = months[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    const day = getDayOfWeek(currentDate);
    return `${day} , ${month} ${date}, ${year}`;
  };

  const formatCurrentTime = (): string => {
    let hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const seconds = currentDate.getSeconds();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${period}`;
  };

  // Helper function to format date for display
  const formatDateForDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Time picker handlers
  const adjustTime = (type: 'hour' | 'minute', increment: number) => {
    const [hours, minutes] = reminderTime.split(':').map(Number);
    let newHours = hours;
    let newMinutes = minutes;

    if (type === 'hour') {
      newHours = (hours + increment + 24) % 24;
    } else {
      newMinutes = (minutes + increment + 60) % 60;
    }

    setReminderTime(`${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`);
  };

  // Date picker handlers
  const adjustDate = (days: number) => {
    const currentDate = new Date(reminderDate);
    currentDate.setDate(currentDate.getDate() + days);
    setReminderDate(currentDate.toISOString().split('T')[0]);
  };
  
  // Reminders state - shared with RemindersScreen
  const [reminders, setReminders] = useState<HabitReminder[]>(INITIAL_REMINDERS);

  // Fetch reminders from Supabase on mount
  const fetchReminders = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_reminders')
        .select('id, name, benefits, alarm_time, date, repeat, is_active, total_done, total_undone')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) return;

      const mapped: HabitReminder[] = data.map((r: any) => ({
        id: r.id,
        name: r.name ?? 'Habit',
        benefits: r.benefits ?? '',
        alarmTime: r.alarm_time ?? '08:00',
        date: r.date ?? new Date().toISOString().split('T')[0],
        repeat: r.repeat ?? 'Daily',
        isActive: r.is_active ?? true,
        isDone: false,
        totalDone: r.total_done ?? 0,
        totalUndone: r.total_undone ?? 0,
      }));
      setReminders(mapped);
    } catch (e) {
      console.warn('fetchReminders error:', e);
    }
  };

  // Screen navigation state
  const [showProfileScreen, setShowProfileScreen] = useState(false);
  const [showWeeklyReportScreen, setShowWeeklyReportScreen] = useState(false);
  const [showGoalsScreen, setShowGoalsScreen] = useState(false);
  const [showExerciseScreen, setShowExerciseScreen] = useState(false);
  const [showRecipesScreen, setShowRecipesScreen] = useState(false);
  const [showStepsScreen, setShowStepsScreen] = useState(false);
  const [showRemindersScreen, setShowRemindersScreen] = useState(false);
  const [showSettingsScreen, setShowSettingsScreen] = useState(false);
  const [showCameraScreen, setShowCameraScreen] = useState(false);

  // Animated values for screen transitions
  const screenBackdrop = useRef(new Animated.Value(0)).current;
  const screenScale = useRef(new Animated.Value(0.8)).current;
  const screenOpacity = useRef(new Animated.Value(0)).current;

  // Animated values for habit modal
  const habitModalBackdrop = useRef(new Animated.Value(0)).current;
  const habitModalScale = useRef(new Animated.Value(0.8)).current;
  const habitModalOpacity = useRef(new Animated.Value(0)).current;

  // Animated values for reminder modal
  const reminderModalBackdrop = useRef(new Animated.Value(0)).current;
  const reminderModalScale = useRef(new Animated.Value(0.8)).current;
  const reminderModalOpacity = useRef(new Animated.Value(0)).current;

  // Animate screen open
  const animateScreenIn = () => {
    Animated.parallel([
      Animated.timing(screenBackdrop, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(screenScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.timing(screenOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  // Animate screen close
  const animateScreenOut = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(screenBackdrop, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(screenScale, { toValue: 0.8, duration: 250, useNativeDriver: true }),
      Animated.timing(screenOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => callback());
  };

  const animateHabitModalOut = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(habitModalBackdrop, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(habitModalScale, { toValue: 0.8, duration: 250, useNativeDriver: true }),
      Animated.timing(habitModalOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => callback());
  };

  const animateReminderModalOut = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(reminderModalBackdrop, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(reminderModalScale, { toValue: 0.8, duration: 250, useNativeDriver: true }),
      Animated.timing(reminderModalOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => callback());
  };

  // Handle habit modal visibility
  useEffect(() => {
    if (isHabitModalVisible) {
      Animated.parallel([
        Animated.timing(habitModalBackdrop, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(habitModalScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(habitModalOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      habitModalBackdrop.setValue(0);
      habitModalScale.setValue(0.8);
      habitModalOpacity.setValue(0);
    }
  }, [isHabitModalVisible]);

  // Handle reminder modal visibility
  useEffect(() => {
    if (isNotificationModalVisible) {
      Animated.parallel([
        Animated.timing(reminderModalBackdrop, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(reminderModalScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(reminderModalOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      reminderModalBackdrop.setValue(0);
      reminderModalScale.setValue(0.8);
      reminderModalOpacity.setValue(0);
    }
  }, [isNotificationModalVisible]);

  const toggleSidebar = () => {
    if (isSidebarVisible) {
      Animated.timing(sidebarAnimation, {
        toValue: -Dimensions.get('window').width * 0.7,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsSidebarVisible(false));
    } else {
      setIsSidebarVisible(true);
      Animated.timing(sidebarAnimation, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  };

  const closeSidebar = () => {
    Animated.timing(sidebarAnimation, {
      toValue: -Dimensions.get('window').width * 0.7,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setIsSidebarVisible(false));
  };

  const toggleMenu = () => setIsMenuVisible(!isMenuVisible);
  const openHabitModal = () => setIsHabitModalVisible(true);

  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
  
  const selectHabit = (habit: Habit, index: number) => {
    setSelectedHabitId(index);
    setSelectedHabit(habit);
  };

  const handleNext = () => {
    if (!selectedHabit) {
      Alert.alert('Error', 'Please select a habit first.');
      return;
    }
    // Reset to default values when opening reminder modal
    setReminderTime('08:00');
    setReminderDate(new Date().toISOString().split('T')[0]);
    setRepeatOption('Daily');
    setIsHabitModalVisible(false);
    setIsNotificationModalVisible(true);
  };

const handleCreateHabit = async () => {
    if (!selectedHabit) {
      Alert.alert('Error', 'Please select a habit.');
      return;
    }
    if (!reminderTime || reminderTime.trim() === '') {
      Alert.alert('Error', 'Please set a reminder time.');
      return;
    }
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(reminderTime.trim())) {
      Alert.alert('Invalid Time', 'Please set a valid time.');
      return;
    }

    // Format time for display (12-hour format)
    const formattedTime = formatTimeForDisplay(reminderTime);

    // Get current user_id
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    // Find habit_id by name
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('id, name, benefits')
      .eq('name', selectedHabit.name)
      .single();

    if (habitError || !habit) {
      Alert.alert('Error', 'Habit not found in database');
      return;
    }

    // Insert reminder with user_id
    const { data: newReminder, error } = await supabase
      .from('user_reminders')
      .insert({
        user_id: userId,
        habit_id: habit.id,
        name: habit.name,
        benefits: habit.benefits ?? selectedHabit.benefits ?? '',
        alarm_time: reminderTime,
        date: reminderDate,
        repeat: repeatOption,
        is_active: true,
        total_done: 0,
        total_undone: 0,
      })
      .select()
      .single();

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    // Add to reminders state so RemindersScreen reflects it immediately
    const newHabitReminder: HabitReminder = {
      id: newReminder?.id ?? Date.now(),
      name: habit.name,
      benefits: habit.benefits ?? selectedHabit.benefits ?? '',
      alarmTime: formattedTime,
      date: reminderDate,
      repeat: repeatOption,
      isActive: true,
      isDone: false,
      totalDone: 0,
      totalUndone: 0,
    };
    setReminders(prev => [newHabitReminder, ...prev]);

    setIsNotificationModalVisible(false);
    setSelectedHabit(null);
    setReminderTime('08:00');
    setReminderDate(new Date().toISOString().split('T')[0]);
    setRepeatOption('Daily');

    Alert.alert('Success', `Habit "${selectedHabit.name}" added!`);
  };

  const hasProgress = foodValue > 0 || exerciseValue > 0;
  const remainingCalories = hasProgress ? Math.max(0, dailyCalorieGoal - totalProgress) : dailyCalorieGoal;
  const remainingColor = hasProgress ? CALORIE_CHART_CONFIG.remaining.color : CALORIE_CHART_CONFIG.base.color;
  const dynamicCalorieData = [
    { value: exerciseValue, color: CALORIE_CHART_CONFIG.exercise.color },
    { value: foodValue, color: CALORIE_CHART_CONFIG.food.color },
    { value: remainingCalories, color: remainingColor },
  ];

  // Navigation handlers - simplified to ensure screens render properly
  const navigateToProfile = () => { 
    closeSidebar(); 
    // Animate in
    screenBackdrop.setValue(1);
    screenScale.setValue(1);
    screenOpacity.setValue(1);
    setShowProfileScreen(true);
  };
  const navigateToWeeklyReport = () => { 
    closeSidebar(); 
    screenBackdrop.setValue(1);
    screenScale.setValue(1);
    screenOpacity.setValue(1);
    setShowWeeklyReportScreen(true);
  };
  const navigateToGoals = () => {
    closeSidebar(); 
    screenBackdrop.setValue(1);
    screenScale.setValue(1);
    screenOpacity.setValue(1);
    setShowGoalsScreen(true);
  };
const navigateToExercise = () => { 
    closeSidebar(); 
    screenBackdrop.setValue(1);
    screenScale.setValue(1);
    screenOpacity.setValue(1);
    setShowExerciseScreen(true);
  };
const navigateToRecipes = () => { 
    closeSidebar(); 
    screenBackdrop.setValue(1);
    screenScale.setValue(1);
    screenOpacity.setValue(1);
    setShowRecipesScreen(true);
  };
  const navigateToSteps = () => { 
    closeSidebar(); 
    screenBackdrop.setValue(1);
    screenScale.setValue(1);
    screenOpacity.setValue(1);
    setShowStepsScreen(true);
  };
  const navigateToReminders = () => { 
    closeSidebar(); 
    screenBackdrop.setValue(1);
    screenScale.setValue(1);
    screenOpacity.setValue(1);
    setShowRemindersScreen(true);
  };
  const navigateToSettings = () => { 
    closeSidebar(); 
    screenBackdrop.setValue(1);
    screenScale.setValue(1);
    screenOpacity.setValue(1);
    setShowSettingsScreen(true);
  };

  // Close screen handlers with smooth transition
  const handleCloseProfile = () => {
    Animated.parallel([
      Animated.timing(screenBackdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(screenScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(screenOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      screenBackdrop.setValue(0);
      screenScale.setValue(0.8);
      screenOpacity.setValue(0);
      setShowProfileScreen(false);
    });
  };
  const handleCloseWeeklyReport = () => {
    Animated.parallel([
      Animated.timing(screenBackdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(screenScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(screenOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      screenBackdrop.setValue(0);
      screenScale.setValue(0.8);
      screenOpacity.setValue(0);
      setShowWeeklyReportScreen(false);
    });
  };
  const handleCloseGoals = () => {
    Animated.parallel([
      Animated.timing(screenBackdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(screenScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(screenOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      screenBackdrop.setValue(0);
      screenScale.setValue(0.8);
      screenOpacity.setValue(0);
      setShowGoalsScreen(false);
    });
  };
  const handleCloseExercise = () => {
    Animated.parallel([
      Animated.timing(screenBackdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(screenScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(screenOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      sidebarAnimation.setValue(-Dimensions.get('window').width * 0.7);
      screenBackdrop.setValue(0);
      screenScale.setValue(0.8);
      screenOpacity.setValue(0);
      setShowExerciseScreen(false);
    });
  };
  const handleCloseRecipes = () => {
    Animated.parallel([
      Animated.timing(screenBackdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(screenScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(screenOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      sidebarAnimation.setValue(-Dimensions.get('window').width * 0.7);
      screenBackdrop.setValue(0);
      screenScale.setValue(0.8);
      screenOpacity.setValue(0);
      setShowRecipesScreen(false);
    });
  };
  const handleCloseSteps = () => {
    Animated.parallel([
      Animated.timing(screenBackdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(screenScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(screenOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      sidebarAnimation.setValue(-Dimensions.get('window').width * 0.7);
      screenBackdrop.setValue(0);
      screenScale.setValue(0.8);
      screenOpacity.setValue(0);
      setShowStepsScreen(false);
    });
  };
  const handleCloseReminders = () => {
    Animated.parallel([
      Animated.timing(screenBackdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(screenScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(screenOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      sidebarAnimation.setValue(-Dimensions.get('window').width * 0.7);
      screenBackdrop.setValue(0);
      screenScale.setValue(0.8);
      screenOpacity.setValue(0);
      setShowRemindersScreen(false);
    });
  };
  const handleCloseSettings = () => {
    Animated.parallel([
      Animated.timing(screenBackdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(screenScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(screenOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      sidebarAnimation.setValue(-Dimensions.get('window').width * 0.7);
      screenBackdrop.setValue(0);
      screenScale.setValue(0.8);
      screenOpacity.setValue(0);
      setShowSettingsScreen(false);
    });
  };
  const handleCloseCamera = () => {
    Animated.parallel([
      Animated.timing(screenBackdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(screenScale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      Animated.timing(screenOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      sidebarAnimation.setValue(-Dimensions.get('window').width * 0.7);
      screenBackdrop.setValue(0);
      screenScale.setValue(0.8);
      screenOpacity.setValue(0);
      setShowCameraScreen(false);
    });
  };

  // Navigate to camera screen - simplified
  const navigateToCamera = () => { 
    setIsMenuVisible(false); 
    screenBackdrop.setValue(1);
    screenScale.setValue(1);
    screenOpacity.setValue(1);
    setShowCameraScreen(true);
  };

  // Check if any screen is currently shown
  const anyScreenVisible = showProfileScreen || showWeeklyReportScreen || showGoalsScreen || 
                           showRecipesScreen || showStepsScreen || showRemindersScreen || 
                           showSettingsScreen || showCameraScreen || showExerciseScreen;

  // Render animated screen overlay
  const renderScreenOverlay = () => {
    if (!anyScreenVisible) return null;
    
    return (
      <Animated.View style={[styles.screenOverlayContainer, { opacity: screenOpacity }]}>
        <Animated.View style={[styles.screenBackdrop, { opacity: screenBackdrop }]}>
          <Pressable style={styles.backdropPressable} onPress={() => {
            if (showProfileScreen) handleCloseProfile();
            else if (showWeeklyReportScreen) handleCloseWeeklyReport();
            else if (showGoalsScreen) handleCloseGoals();
            else if (showExerciseScreen) handleCloseExercise();
            else if (showRecipesScreen) handleCloseRecipes();
            else if (showStepsScreen) handleCloseSteps();
            else if (showRemindersScreen) handleCloseReminders();
            else if (showSettingsScreen) handleCloseSettings();
            else if (showCameraScreen) handleCloseCamera();
          }} />
        </Animated.View>
        <Animated.View style={[styles.screenContent, { transform: [{ scale: screenScale }] }]}>
{showProfileScreen && <ProfileScreen onClose={handleCloseProfile} onGoalUpdate={updateDailyGoal} />}
          {showWeeklyReportScreen && <WeeklyReportScreen onClose={handleCloseWeeklyReport} />}
{showGoalsScreen && <GoalsScreen onClose={handleCloseGoals} onGoalUpdate={updateDailyGoal} />}
          {showExerciseScreen && <ExerciseScreen onClose={handleCloseExercise} onExerciseBurned={saveExerciseValue} />}
          {showRecipesScreen && <RecipesScreen onClose={handleCloseRecipes} onFoodAdded={saveFoodValue} />}
          {showStepsScreen && <StepsScreen onClose={handleCloseSteps} />}
{showRemindersScreen && <RemindersScreen onClose={handleCloseReminders} onNavigateToAddHabit={openHabitModal} addNewHabit={openHabitModal} reminders={reminders} setReminders={setReminders} />}
          {showSettingsScreen && <SettingsScreen currentTheme={appTheme} onThemeChange={handleThemeChange} onClose={handleCloseSettings} />}
          {showCameraScreen && <CameraScreen onClose={handleCloseCamera} />}
        </Animated.View>
      </Animated.View>
    );
  };
  
  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <Image style={styles.img} source={require("../assets/images/bg.jpg")} />
      
      <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarAnimation }] }]}>
        <Pressable onPress={closeSidebar} style={styles.closeIcon}>
          <Icon style={styles.close} name="times" />
        </Pressable>
        <View style={styles.userProfile}>
          {/* Avatar with initials instead of static image */}
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {userProfileData?.full_name
                ? userProfileData.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                : userSession?.user?.email?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {userProfileData?.full_name || userSession?.user?.email?.split('@')[0] || 'User'}
            </Text>
            <Text style={styles.userEmail}>
              {userProfileData?.email || userSession?.user?.email || ''}
            </Text>
          </View>
        </View>
        <ScrollView style={styles.sidebarContent}>
          <Pressable style={({ pressed }) => [styles.sidebarItem, pressed && { backgroundColor: '#333' }]}>
            <Text style={styles.sidebarText}>Home</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.sidebarItem, pressed && { backgroundColor: '#333' }]} onPress={navigateToProfile}>
            <Text style={styles.sidebarText}>Profile</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.sidebarItem, pressed && { backgroundColor: '#333' }]} onPress={navigateToWeeklyReport}>
            <Text style={styles.sidebarText}>My Weekly Report</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.sidebarItem, pressed && { backgroundColor: '#333' }]} onPress={navigateToGoals}>
            <Text style={styles.sidebarText}>Goals</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.sidebarItem, pressed && { backgroundColor: '#333' }]} onPress={navigateToExercise}>
            <Text style={styles.sidebarText}>Exercise</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.sidebarItem, pressed && { backgroundColor: '#333' }]} onPress={navigateToRecipes}>
            <Text style={styles.sidebarText}>Recipes, Meals & Foods</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.sidebarItem, pressed && { backgroundColor: '#333' }]} onPress={navigateToSteps}>
            <Text style={styles.sidebarText}>Steps</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.sidebarItem, pressed && { backgroundColor: '#333' }]} onPress={navigateToReminders}>
            <Text style={styles.sidebarText}>Reminders</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.sidebarItem, pressed && { backgroundColor: '#333' }]} onPress={navigateToSettings}>
            <Text style={styles.sidebarText}>Settings</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.sidebarItemL, pressed && { backgroundColor: '#1a112b' }]}>
            <Text style={styles.sidebarText}>Logout</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>

      <View style={styles.header}>
        <Pressable onPress={toggleSidebar}>
          <Icon style={styles.icon} name="bars"/>
        </Pressable>
        <View style={styles.tagline}>
          <Text style={styles.text}>MyFitnessJourney</Text>
        </View>
        <Pressable onPress={toggleMenu}>
          <Icon style={styles.icon2} name="plus-circle"/>
        </Pressable>
        {isMenuVisible && (
          <View style={styles.menu}>
            <Pressable style={styles.menuItem} onPress={navigateToCamera}>
              <Icon style={styles.icn} name="camera" />
            </Pressable>
            <Pressable style={styles.menuItem} onPress={openStickyNoteModal}>
              <Icon style={styles.icn} name="sticky-note" />
            </Pressable>
            <Pressable style={styles.menuItem}>
              <Icon style={styles.icn} name="search" />
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.body}>
          <View style = {styles.wcont}>
          <Text style={styles.Weather}>{formatCurrentDate()}</Text>
          <Text style={styles.WeatherTime}>{formatCurrentTime()}</Text>
          </View>
          <View style={styles.calories}>
              <Text style={styles.caloriesText}>Calories</Text>
              <Text style={styles.caloriesC}>Remaining = Goal - Food + Exercise</Text>
            <View style={styles.pieChartContainer}>
              <PieChart
data={dynamicCalorieData}
                radius={90}
                innerRadius={50}
                textColor="#FFFFFF"
                showText
                backgroundColor="#211c24"
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text style={styles.centerLabelText}>{remainingCalories}</Text>
                    <Text style={styles.centerLabelSubText}>Remaining</Text>
                  </View>
                )}
              />
            </View>
            <Pressable style={styles.statisticsPressable} onPress={() => setShowStatisticsModal(true)}>
<View style={styles.statisticsContainer}>
                <Icon style={styles.icon3} name="circle" />
                <Icon style={styles.icon33} name="circle" />
                <View style={styles.BG}>
                  <Text style={styles.statisticsText}>Basic Goal</Text>
                  <Text style={styles.numB}>{dailyCalorieGoal}</Text>
                </View>
                
                <Icon style={styles.icon4} name="circle" />
                <Icon style={styles.icon44} name="circle" />
                <View style={styles.F}>
                  <Text style={styles.statisticsText}>Food</Text>
                  <Text style={styles.num}>{foodValue}</Text>
                </View>
                <Icon style={styles.icon5} name="circle" />
                <Icon style={styles.icon55} name="circle" />
                <View style={styles.EX}>
                  <Text style={styles.statisticsText}>Exercise</Text>
                  <Text style={styles.num}>{exerciseValue}</Text>
                </View>
              </View>
            </Pressable>

            {/* Statistics Modal */}
            {showStatisticsModal && (
              <Animated.View style={[styles.animatedModalContainer, { opacity: statisticsModalBackdrop }]}>
                <Pressable style={styles.animatedBackdrop} onPress={closeStatisticsModal} />
                <Animated.View style={[styles.animatedModalContent, { transform: [{ scale: statisticsModalScale }], opacity: statisticsModalOpacity }]}>
                  <View style={styles.statisticsModalHeader}>
                    <Text style={styles.statisticsModalTitle}>Daily Analytics</Text>
                    <Pressable onPress={closeStatisticsModal} style={styles.modalCloseButton}>
                      <Icon name="times" size={24} color="#FFFFFF" />
                    </Pressable>
                  </View>
                  <View style={styles.statisticsModalContent}>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Goal</Text>
                      <Text style={styles.statValue}>{dailyCalorieGoal} kcal</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabelf}>Food Intake</Text>
                      <Text style={styles.statValue}>{foodValue} kcal</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabele}>Exercise Burned</Text>
                      <Text style={styles.statValue}>{exerciseValue} kcal</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Remaining</Text>
                      <Text style={[styles.statValue, styles.remainingStat]}>
                        {Math.max(0, dailyCalorieGoal - foodValue - exerciseValue)} kcal
                      </Text>
                    </View>
                    <View style={styles.progressButtons}>
                      <Pressable 
                        style={[
                          styles.actionButtonf, 
                          isGoalReached && { opacity: 0.5 }
                        ]} 
                        disabled={isGoalReached}
                        onPress={() => {
                          if (isGoalReached) {
                            showGoalReachedAlert();
                          } else {
                            closeStatisticsModal();
                            navigateToRecipes();
                          }
                        }}
                      >
                        <Icon2 name="utensils" size={14} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Add Food</Text>
                      </Pressable>
                      <Pressable 
                        style={[
                          styles.actionButtone, 
                          isGoalReached && { opacity: 0.5 }
                        ]} 
                        disabled={isGoalReached}
                        onPress={() => {
                          if (isGoalReached) {
                            showGoalReachedAlert();
                          } else {
                            closeStatisticsModal();
                            navigateToExercise();
                          }
                        }}
                      >
                        <Icon2 name="dumbbell" size={14} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Add Exercise</Text>
                      </Pressable>
                      <Pressable 
                        style={styles.actionButtonr} 
                        onPress={() => {
                          closeStatisticsModal();
                          resetDailyCounts();
                        }}
                      >
                        <Icon name="refresh" size={14} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Reset Today</Text>
                      </Pressable>
                      <Pressable 
                        style={styles.actionButtong}
                        onPress={() => {
                          closeStatisticsModal();
                          navigateToGoals();
                        }}
                      >
                        <Icon name="edit" size={14} color="#FFFFFF"/>
                        <Text style={styles.actionButtonText}>Set Goal</Text>
                      </Pressable>
                    </View>
                  </View>
                </Animated.View>
              </Animated.View>
            )}
            <View style={styles.clout}>
              <View style={styles.cloutcont}>
                <Image style={styles.img1} source={require("../assets/images/surp.png")} />
                <Text style={styles.clouttext}>Choose your next habit</Text>
                <Text style={styles.cloutsub}>Big goal start with small habits.</Text>
                <Icon style={styles.cloutsrch} name="plus-circle" onPress={openHabitModal}></Icon>
              </View>
            </View>

              {/* Saved Notes Section with Debug */}
              <View style={styles.savedNotesSection}>
                <View style={styles.savedNotesHeader}>
                  {/* Debug render log - moved to useEffect */}
                <Text style={styles.savedNotesTitle}>Saved Notes</Text>
                  <Pressable onPress={fetchSavedNotes} style={[styles.refreshButton, {backgroundColor: 'rgba(198,126,226,0.3)', borderRadius: 20, padding: 6}]}>
                  <Icon name="refresh" size={18} color="#ffffff" />
                </Pressable>
              </View>
              
              {notesLoading && <Text style={styles.loadingText}>Loading notes...</Text>}
              {notesError && <Text style={styles.errorText}>Error: {notesError}</Text>}
              {stickyNotes.length === 0 && !notesLoading && (
                <Text style={styles.emptyNotesText}>No notes yet. Create your first note!</Text>
              )}
              
              {stickyNotes.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {stickyNotes.slice(0, 10).map((note) => (
                    <Pressable key={note.id} style={styles.savedNoteCard} onPress={() => handleOpenNoteOverview(note)}>
                      {/* Title */}
                      <Text style={styles.savedNoteTitle} numberOfLines={1}>{note.title}</Text>

                      {/* Text note preview */}
                      {note.content ? (
                        <Text style={styles.savedNoteContent} numberOfLines={3}>{note.content}</Text>
                      ) : null}

                      {/* List items preview — up to 3 items with checkboxes */}
                      {!note.content && note.items?.length > 0 && (
                        <View style={styles.savedNoteListPreview}>
                          {note.items.slice(0, 3).map((item) => (
                            <View key={item.id} style={styles.savedNoteListItem}>
                              <Icon
                                name={item.checked ? "check-square" : "square-o"}
                                style={[styles.savedNoteCheckbox, item.checked && styles.savedNoteCheckboxChecked]}
                              />
                              <Text numberOfLines={1} style={[styles.savedNoteItemText, item.checked && styles.savedNoteItemTextChecked]}>
                                {item.text}
                              </Text>
                            </View>
                          ))}
                          {note.items.length > 3 && (
                            <Text style={styles.savedNoteMoreItems}>+{note.items.length - 3} more</Text>
                          )}
                        </View>
                      )}

                      {/* Type badge */}
                      <View style={styles.savedNoteFooter}>
                        <View style={[styles.savedNoteTypeBadge, note.items?.length > 0 && !note.content ? styles.savedNoteTypeBadgeList : styles.savedNoteTypeBadgeNote]}>
                          <Icon
                            name={note.items?.length > 0 && !note.content ? "list" : "file-text-o"}
                            style={styles.savedNoteTypeIcon}
                          />
                          <Text style={styles.savedNoteTypeText}>
                            {note.items?.length > 0 && !note.content ? `List (${note.items.length})` : 'Note'}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>

          </View>
        </View>

        <View style={styles.cardsContainer}>
          <View style={styles.footstep}>
            <Image style={styles.numImg} source={require("../assets/images/num.png")}/>
            <Image style={styles.fsImage} source={require("../assets/images/fs.png")}/>
            <Text style={styles.fsttl}>Steps</Text>
            <Text style={styles.fsd}>Track Steps</Text>
            <Icon style={styles.fsicon} name="arrow-circle-right" onPress={navigateToSteps} />
          </View>

          <View style={styles.exercise}>
            <Text style={styles.exettl}>Exercise</Text>
            <Image style={styles.calImage} source={require("../assets/images/kcal.png")}/>
            <Text style={styles.kcalttl}>Calories</Text>
            <Text style={styles.numC}>{foodValue}</Text>
            <Image style={styles.exeImage} source={require("../assets/images/exe.png")}/>
            <Text style={styles.exettle}>Exercise</Text>
            <Text style={styles.numE}>{exerciseValue}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Animated Habit Modal */}
       {isHabitModalVisible && (
        <Animated.View style={[styles.animatedModalContainer2, { opacity: habitModalBackdrop }]}>
          <Pressable style={styles.animatedBackdrop2} onPress={() => animateHabitModalOut(() => { setIsHabitModalVisible(false); setSelectedHabit(null); })} />
          <Animated.View style={[styles.animatedModalContent2, { transform: [{ scale: habitModalScale }], opacity: habitModalOpacity }]}>
            <Text style={styles.modalTitle}>Choose a Habit</Text>
            <ScrollView style={styles.habitScrollView}>
              {HABIT_LIST.map((habit, index) => (
                <Pressable 
                  key={index} 
                  style={[
                    styles.habitItem, 
                    selectedHabitId === index && styles.habitItemSelected
                  ]} 
                  onPress={() => selectHabit(habit, index)}
                >
                  <Text style={[
                    styles.habitText,
                    selectedHabitId === index && styles.habitTextSelected
                  ]}>{habit.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {selectedHabit && (
              <View style={styles.benefitsContainer}>
                <Text style={styles.benefitsTitle}>Benefits:</Text>
                <Text style={styles.benefitsText}>{selectedHabit.benefits}</Text>
                <Pressable style={styles.nextButton} onPress={handleNext}>
                  <Text style={styles.nextButtonText}>Next</Text>
                </Pressable>
              </View>
            )}
            <Pressable style={styles.closeButton} onPress={() => animateHabitModalOut(() => { setIsHabitModalVisible(false); setSelectedHabit(null); })}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      )}

      {/* Animated Reminder Modal */}
      {isNotificationModalVisible && (
        <Animated.View style={[styles.animatedModalContainerr, { opacity: reminderModalBackdrop }]}>
          <Pressable style={styles.animatedBackdropr} onPress={() => animateReminderModalOut(() => setIsNotificationModalVisible(false))} />
          <Animated.View style={[styles.animatedModalContentr, { transform: [{ scale: reminderModalScale }], opacity: reminderModalOpacity }]}>
            <Text style={styles.modalTitle}>Set Reminder</Text>
            <Text style={styles.notificationText}>Allow push notifications to remind you of your habit.</Text>

            {/* Time Picker Section */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Time</Text>
              <View style={styles.timePickerRow}>
                <Pressable style={styles.pickerButton} onPress={() => adjustTime('hour', 1)}>
                  <Icon style={styles.pickerIcon} name="chevron-up" />
                </Pressable>
                <Text style={styles.timeDisplay}>{formatTimeForDisplay(reminderTime)}</Text>
                <Pressable style={styles.pickerButton} onPress={() => adjustTime('hour', -1)}>
                  <Icon style={styles.pickerIcon} name="chevron-down" />
                </Pressable>
              </View>
              <View style={styles.minutePickerRow}>
                <Pressable style={styles.pickerButtonSmall} onPress={() => adjustTime('minute', 15)}>
                  <Text style={styles.pickerButtonText}>+15m</Text>
                </Pressable>
                <Pressable style={styles.pickerButtonSmall} onPress={() => adjustTime('minute', -15)}>
                  <Text style={styles.pickerButtonText}>-15m</Text>
                </Pressable>
              </View>
            </View>

            {/* Date Picker Section */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Start Date</Text>
              <View style={styles.datePickerRow}>
                <Pressable style={styles.pickerButton} onPress={() => adjustDate(-1)}>
                  <Icon style={styles.pickerIcon} name="chevron-left" />
                </Pressable>
                <Text style={styles.dateDisplay}>{formatDateForDisplay(reminderDate)}</Text>
                <Pressable style={styles.pickerButton} onPress={() => adjustDate(1)}>
                  <Icon style={styles.pickerIcon} name="chevron-right" />
                </Pressable>
              </View>
              <Pressable style={styles.todayButton} onPress={() => setReminderDate(new Date().toISOString().split('T')[0])}>
                <Text style={styles.todayButtonText}>Today</Text>
              </Pressable>
            </View>

            {/* Repeat Options Section */}
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Repeat</Text>
              <View style={styles.repeatOptionsRow}>
                <Pressable 
                  style={[styles.repeatOption, repeatOption === 'Daily' && styles.repeatOptionActive]} 
                  onPress={() => setRepeatOption('Daily')}
                >
                  <Text style={[styles.repeatOptionText, repeatOption === 'Daily' && styles.repeatOptionTextActive]}>Daily</Text>
                </Pressable>
                <Pressable 
                  style={[styles.repeatOption, repeatOption === 'Weekdays' && styles.repeatOptionActive]} 
                  onPress={() => setRepeatOption('Weekdays')}
                >
                  <Text style={[styles.repeatOptionText, repeatOption === 'Weekdays' && styles.repeatOptionTextActive]}>Weekdays</Text>
                </Pressable>
                <Pressable 
                  style={[styles.repeatOption, repeatOption === 'Weekends' && styles.repeatOptionActive]} 
                  onPress={() => setRepeatOption('Weekends')}
                >
                  <Text style={[styles.repeatOptionText, repeatOption === 'Weekends' && styles.repeatOptionTextActive]}>Weekends</Text>
                </Pressable>
              </View>
            </View>

            <Pressable style={styles.createButton} onPress={handleCreateHabit}>
              <Text style={styles.createButtonText}>Create Habit</Text>
            </Pressable>
            <Pressable style={styles.closeButton} onPress={() => animateReminderModalOut(() => setIsNotificationModalVisible(false))}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      )}

      {/* Sticky Note Modal */}
      {isStickyNoteModalVisible && (
        <Animated.View style={[styles.animatedModalContainer, { opacity: stickyNoteModalBackdrop }]}>
          <Pressable style={styles.animatedBackdrop} onPress={() => {
            // Save before closing if there's content
            if (currentNote && (newNoteTitle.trim() || newNoteContent.trim() || currentNote.items.length > 0)) {
              const now = new Date().toISOString();
              const updatedNote: StickyNote = {
                ...currentNote,
                title: newNoteTitle || currentNote.title,
                content: newNoteContent || currentNote.content,
                updatedAt: now,
              };
              const existingNoteIndex = stickyNotes.findIndex(note => note.id === currentNote.id);
              let updatedNotes: StickyNote[];
              if (existingNoteIndex >= 0) {
                updatedNotes = stickyNotes.map(note => note.id === currentNote.id ? updatedNote : note);
              } else {
                updatedNotes = [...stickyNotes, updatedNote];
              }
              setStickyNotes(updatedNotes);
            } else if (!currentNote && (newNoteTitle.trim() || newNoteContent.trim())) {
              const now = new Date().toISOString();
              const newNote: StickyNote = { 
                id: Date.now().toString(),
                title: newNoteTitle || "Untitled Note",
                content: newNoteContent,
                items: [],
                createdAt: now,
                updatedAt: now,
              };
              const updatedNotes = [...stickyNotes, newNote];
              setStickyNotes(updatedNotes);
            }
            animateStickyNoteModalOut(() => { setIsStickyNoteModalVisible(false); setCurrentNote(null); setIsCreatingNew(false); });
          }} />
          <Animated.View style={[styles.stickyNoteModalContent, { transform: [{ scale: stickyNoteModalScale }], opacity: stickyNoteModalOpacity }]}>
            <Text style={styles.modalTitleN}>My Notes</Text>
            
            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              <Pressable 
                style={[styles.tab, activeTab === 'write' && styles.tabActive]} 
                onPress={() => setActiveTab('write')}
              >
                <Text style={[styles.tabText, activeTab === 'write' && styles.tabTextActive]}>Write</Text>
              </Pressable>
              <Pressable 
                style={[styles.tab, activeTab === 'list' && styles.tabActive]} 
                onPress={() => setActiveTab('list')}
              >
                <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>List</Text>
              </Pressable>
              <Pressable 
                style={[styles.tab, activeTab === 'notes' && styles.tabActive]} 
                onPress={() => setActiveTab('notes')}
              >
                <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>Notes</Text>
              </Pressable>
            </View>

            {/* Tab Content */}
            {activeTab === 'write' && (
              <View style={styles.tabContent}>
                <TextInput
                  style={styles.noteTitleInput}
                  placeholder="Title"
                  placeholderTextColor="#000000"
                  value={newNoteTitle}
                  onChangeText={setNewNoteTitle}
                />
                <TextInput
                  style={styles.noteContentInput}
                  placeholder="Start writing your thoughts..."
                  placeholderTextColor="#000000"
                  value={newNoteContent}
                  onChangeText={setNewNoteContent}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            )}

            {activeTab === 'list' && (
              <View style={styles.tabContent}>
                <View style={styles.listInputContainer}>
                  <TextInput
                    style={styles.listInput}
                    placeholder="Add item to list..."
                    placeholderTextColor="#000000"
                    value={newListItem}
                    onChangeText={setNewListItem}
                  />
                  <Pressable style={styles.addItemButton} onPress={handleAddListItem}>
                    <Icon style={styles.addItemIcon} name="plus" />
                  </Pressable>
                </View>
                <View style={styles.scrollbgg}></View>
                <ScrollView style={styles.listScrollView}>
                  {currentNote && currentNote.items.map((item) => (
                    <Pressable key={item.id} style={styles.listItem} onPress={() => handleToggleItem(item.id)}>
                      <Icon 
                        style={[styles.checkbox, item.checked && styles.checkboxChecked]} 
                        name={item.checked ? "check-square" : "square-o"} 
                      />
                      <Text style={[styles.listItemText, item.checked && styles.listItemTextChecked]}>
                        {item.text}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {activeTab === 'notes' && (
              <View style={styles.tabContent}>
                <ScrollView style={styles.notesScrollView}>
                <View style={styles.scrollbg}></View>
                  {stickyNotes.length === 0 ? (
                    <Text style={styles.emptyNotesText}>No notes yet. Create your first note!</Text>
                  ) : (
                    stickyNotes.map((note) => (
                      <Pressable 
                        key={note.id} 
                        style={styles.noteCard}
                        onPress={() => handleSelectNote(note)}
                      >
                        <Text style={styles.noteCardTitle}>{note.title}</Text>
                        <Text style={styles.noteCardContent} numberOfLines={2}>
                          {note.content || (note.items.length > 0 ? `${note.items.length} items` : '')}
                        </Text>
                        <View style={styles.noteCardFooter}>
                          <Text style={styles.noteCardDate}>
                            {new Date(note.updatedAt).toLocaleDateString()}
                          </Text>
                          <Pressable onPress={() => handleDeleteNote(note.id)}>
                            <Icon style={styles.deleteIcon} name="trash" />
                          </Pressable>
                        </View>
                      </Pressable>
                    ))
                  )}
                </ScrollView>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
              <Pressable style={styles.saveButton} onPress={handleSaveNote}>
                <Icon style={styles.buttonIcon} name="save" />
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </View>
            
            <Pressable style={styles.closeButton} onPress={() => {
              // Save the current note before closing if it has any content (title, content, or items)
              if (currentNote && (newNoteTitle.trim() || newNoteContent.trim() || currentNote.items.length > 0)) {
                const saveBeforeClose = async () => {
                  const now = new Date().toISOString();
                  const updatedNote: StickyNote = {
                    ...currentNote,
                    title: newNoteTitle || currentNote.title,
                    content: newNoteContent || currentNote.content,
                    updatedAt: now,
                  };
                  
                  // Check if note already exists in stickyNotes
                  const existingNoteIndex = stickyNotes.findIndex(note => note.id === currentNote.id);
                  let updatedNotes: StickyNote[];
                  
                  if (existingNoteIndex >= 0) {
                    // Update existing note
                    updatedNotes = stickyNotes.map(note => 
                      note.id === currentNote.id ? updatedNote : note
                    );
                  } else {
                    // Add new note
                    updatedNotes = [...stickyNotes, updatedNote];
                  }
                  
                  setStickyNotes(updatedNotes);
                };
                saveBeforeClose();
              } else if (!currentNote && (newNoteTitle.trim() || newNoteContent.trim())) {
                // Save as new note if there's no current note but there's content
                const saveNewNote = async () => {
                  const now = new Date().toISOString();
                  const newNote: StickyNote = {
                    id: Date.now().toString(),
                    title: newNoteTitle || "Untitled Note",
                    content: newNoteContent,
                    items: [],
                    createdAt: now,
                    updatedAt: now,
                  };
                  
                  const updatedNotes = [...stickyNotes, newNote];
                  setStickyNotes(updatedNotes);
                };
                saveNewNote();
              }
              animateStickyNoteModalOut(() => { setIsStickyNoteModalVisible(false); setCurrentNote(null); setIsCreatingNew(false); setNewNoteTitle(""); setNewNoteContent(""); setNewListItem(""); });
            }}>
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      )}

      {/* Note Overview Modal - Expanded View for Saved Notes */}
      {showNoteOverviewModal && selectedNoteForOverview && (
        <Animated.View style={[styles.animatedModalContainer, { opacity: noteOverviewModalBackdrop }]}>
          <Pressable style={styles.animatedBackdrop} onPress={() => animateNoteOverviewModalOut(() => { setShowNoteOverviewModal(false); setSelectedNoteForOverview(null); })} />
          <Animated.View style={[styles.noteOverviewModalContent, { transform: [{ scale: noteOverviewModalScale }], opacity: noteOverviewModalOpacity }]}>
            <Text style={styles.noteOverviewTitle}>{selectedNoteForOverview.title}</Text>
            
            {/* Content Section */}
            {selectedNoteForOverview.content ? (
              <ScrollView style={styles.noteOverviewContentScroll}>
                <Text style={styles.noteOverviewContent}>{selectedNoteForOverview.content}</Text>
              </ScrollView>
            ) : null}
            
            {/* List Items Section */}
            {selectedNoteForOverview.items && selectedNoteForOverview.items.length > 0 && (
              <View style={styles.noteOverviewItemsContainer}>
                <Text style={styles.noteOverviewItemsTitle}>List Items ({selectedNoteForOverview.items.length})</Text>
                {selectedNoteForOverview.items.map((item) => (
                  <View key={item.id} style={styles.noteOverviewItem}>
                    <Icon 
                      style={[styles.noteOverviewCheckbox, item.checked && styles.checkboxChecked]} 
                      name={item.checked ? "check-square" : "square-o"} 
                    />
                    <Text style={[styles.noteOverviewItemText, item.checked && styles.noteOverviewItemTextChecked]}>
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            {/* Footer with Dates */}
            <View style={styles.noteOverviewFooter}>
              <Text style={styles.noteOverviewDate}>Created: {new Date(selectedNoteForOverview.createdAt).toLocaleDateString()}</Text>
              <Text style={styles.noteOverviewDate}>Updated: {new Date(selectedNoteForOverview.updatedAt).toLocaleDateString()}</Text>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.noteOverviewButtons}>
              <Pressable 
                style={styles.noteOverviewEditButton}
                onPress={() => {
                  // Open the note in edit mode
                  handleSelectNote(selectedNoteForOverview);
                  animateNoteOverviewModalOut(() => { 
                    setShowNoteOverviewModal(false); 
                    setSelectedNoteForOverview(null); 
                    setIsStickyNoteModalVisible(true);
                  });
                }}
              >
                <Icon style={styles.noteOverviewButtonIcon} name="edit" />
                <Text style={styles.noteOverviewEditButtonText}>Edit</Text>
              </Pressable>
              <Pressable 
                style={styles.noteOverviewCloseButton}
                onPress={() => animateNoteOverviewModalOut(() => { setShowNoteOverviewModal(false); setSelectedNoteForOverview(null); })}
              >
                <Text style={styles.noteOverviewCloseButtonText}>Close</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* Render the screen overlay for navigation - THIS IS THE FIX */}
{renderScreenOverlay()}

      {/* Goal Reached Modal */}
      <GoalReachedModal 
        visible={showGoalReachedModal || showGoalReachedNotification} 
        quote={selectedQuote} 
        onClose={() => {
          setShowGoalReachedModal(false);
          setShowGoalReachedNotification(false);
        }}
        themeColors={currentThemeColors} 
      />
    </View>
  );
}

export default Dashboard

const styles = StyleSheet.create({
  savedNotesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  refreshButton: {
    padding: 5,
  },
  loadingText: {
    textAlign: 'center',
    color: '#84d7f4',
    fontSize: 14,
  },
  errorText: {
    textAlign: 'center',
    color: '#ff6b6b',
    fontSize: 14,
  },

  statisticsPressable: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 10,
  },
  statisticsContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  statisticsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalCloseButton: {
    padding: 5,
  },
  statisticsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statisticsModalContent: {
    padding: 10,
  },
  statCard: {
    backgroundColor: '#414141',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 16,
    color: '#CCCCCC',
    fontWeight: 500,
  },
  statLabelf: {
    fontSize: 16,
    color: '#84d7f4',
    fontWeight: 500,
  },
  statLabele: {
    fontSize: 16,
    color: '#F3AF41',
    fontWeight: 500,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  remainingStat: {
    color: '#4CAF50',
  },
  progressButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  actionButtonf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#84d7f4',
    padding: 15,
    borderRadius: 10,
  },
  actionButtone: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3AF41',
    padding: 15,
    borderRadius: 10,
  },
  actionButtonr: {
    position: 'absolute',
    top: 60,
    width: 115,
    height: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f34141',
    padding: 15,
    borderRadius: 10,
  },
  actionButtong: {
    position: 'absolute',
    top: 60,
    left: 123,
    width: 115,
    height: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#999999',
    padding: 15,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
  },
  scrollView: {
    flex: 1,
    top: 30,
    width: "100%",
    maxHeight: "87%",
  },
  scrollViewContent: {
    paddingBottom: 520,
  },
  cardsContainer: {
    position:"relative",
    top: 602,
  },
  container: {
    display: "flex",
    height: "100%",
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#15041f",
  },
  // Screen overlay styles - MISSING STYLES ADDED
  screenContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
  },
  screenOverlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
  },
  screenContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  screenBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backdropPressable: {
    flex: 1,
  },
  img: {
    position: "absolute",
    top: 30,
    height: "105%",
    width: "104%",
    resizeMode: "cover",
    opacity: 0.4,
  },
  header: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  tagline: {
    position: "relative",
    height: 40,
    width: 200,
    top: 15,
    shadowColor: "#1d1820",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    backgroundColor: "#D1C7FF",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 18,
    fontFamily: "Roboto",
    fontWeight: "800",
    color: "#000000",
  },
  icon: {
    position: "relative",
    fontSize: 30,
    top: 15,
    marginLeft: -70,
    color: "#FFFFFF",
    backgroundColor: "#211c24",
    borderRadius: 5,
    padding: 5,
    width: 50,
    textAlign: "center",
  },
  close: {
    fontSize: 30,
    color: "#FFFFFF",
    backgroundColor: "#211c24",
    borderRadius: 5,
    padding: 5,
  },
  icon2: {
    position: "absolute",
    fontSize: 30,
    top: -10,
    right: -65,
    backgroundColor: "#1d1820",
    color: "#ffff",
    borderRadius: 50,
    padding: 7,
    width: 45,
    textAlign: "center",
  },
  sidebar: {
    position: "absolute",
    top: 33,
    left: 0,
    width: "65%",
    height: "100%",
    backgroundColor: "#211c24",
    zIndex: 10,
    paddingTop: 50,
  },
  closeIcon: {
    position: "absolute",
    top: 15,
    right: 25,
    zIndex: 11,
  },
  sidebarContent: {
    flex: 1,
    marginTop: 70,
    paddingTop: 20,
    overflow: 'hidden',
  },
  sidebarItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  sidebarItemL: {
    backgroundColor: "#1a112b",
    height: 50,
    width: 150,
    marginTop: 20,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 25,
    marginLeft: 55,
    borderColor: "#302546",
    borderBottomWidth: 3,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 3,
  },
  sidebarText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontFamily: "Roboto",
  },
  userProfile: {
    position: "absolute",
    top: 60,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#c67ee2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#362c3a',
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    justifyContent: "center",
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    fontFamily: "Roboto",
  },
  userEmail: {
    fontSize: 14,
    color: "#CCCCCC",
    fontFamily: "Roboto",
  },
  menu: {
    position: "absolute",
    top: 55,
    right: -73,
    backgroundColor: "#ADABB1",
    borderRadius: 30,
    padding: 10,
    alignItems: "center",
    zIndex: 10,
    borderBlockColor: "#1E1C27",
    borderBottomWidth: 3,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 3,
  },
  menuItem: {
    marginVertical: 5,
  },
  icn: {
    fontSize: 20,
    color: "#FFFFFF",
    backgroundColor: "#1E1C27",
    padding: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  wcont: {
    backgroundColor: "#211c24",
    width: 350,
    height: 50,
    padding: 15,
    borderRadius: 15,
    justifyContent: "space-evenly",
    alignItems: "stretch",
  },
  Weather: {
    position: "relative",
    top: 0,
    fontSize: 15,
    fontFamily: "Roboto",
    fontWeight: 900,
    color: "#ffffff",
  },
  WeatherTime: {
    position: "relative",
    top: -20,
    right: -250,
    fontSize: 15,
    fontFamily: "Roboto",
    fontWeight: "bold",
    color: "#ffffff",
  },
  calories: {
    position: "relative",
    top: 10,
    height: 275,
    width: 350,
    backgroundColor: "#211c24",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  caloriesText: {
    position: "absolute",
    top: 15,
    left: 20,
    fontSize: 20,
    fontFamily: "Roboto",
    color: "#c67ee2",
    fontWeight: 900,
  },
  caloriesC: {
    top: -5,
    left: 20,
    fontFamily: "Roboto",
    color: "#FFFFFF",
    fontWeight: "700",
  },
  pieChartContainer: {
    position: "absolute",
    top: 70,
    left: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  centerLabel: {
    justifyContent: "center",
    alignItems: "center",
  },
  centerLabelText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Roboto",
  },
  centerLabelSubText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontFamily: "Roboto",
  },
  statistics: {
    position: "absolute",
    top: 70,
    right: 20,
    flexDirection: "column",
    alignItems: "flex-start",
  },
  BG: {
    top: -25,
    marginBottom: -20,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  F: {
    top: -25,
    marginBottom: -20,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  EX: {
    top: -25,
    marginBottom: -20,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  icon3: {
    position: "relative",
    flexDirection: "column",
    left: -50,
    top: 13,
    fontSize: 40,
    color: "#B3B3B3",
  },
  icon33: {
    position: "absolute",
    flexDirection: "column",
    left: -44,
    top: 20,
    fontSize: 25,
    color: "#1E1027",
  },
  icon4: {
    position: "relative",
    flexDirection: "column",
    left: -50,
    top: 13,
    fontSize: 40,
    color: "#84d7f4",
  },
  icon44: {
    position: "absolute",
    flexDirection: "column",
    left: -44,
    top: 74.5,
    fontSize: 25,
    color: "#1E1027",
  },
  icon5: {
    position: "relative",
    flexDirection: "column",
    left: -50,
    top: 10,
    fontSize: 40,
    color: "#F3AF41",
  },
  icon55: {
    position: "absolute",
    flexDirection: "column",
    left: -44,
    top: 126.5,
    fontSize: 25,
    color: "#1E1027",
  },
  statisticsText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontFamily: "Roboto",
  },
  numB: {
    fontSize: 14,
    color: "#FFFFFF",
    fontFamily: "Roboto",
    alignItems: "flex-start",
  },
  num: {
    fontSize: 14,
    top: -1,
    left: 0,
    color: "#FFFFFF",
    fontFamily: "Roboto",
    alignItems: "flex-start",
  },
  clout: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  cloutcont: {
    position: "absolute",
    top: 225,
    left: 0,
    backgroundColor: "#211c24",
    width: 350,
    height: 115,
    borderRadius: 25,
    padding: 20,
    overflow: "hidden",
  },
  img1: {
    position: "absolute",
    top: 40,
    left: -50,
    height: "100%",
    width: "100%",
    resizeMode: "cover",
    opacity: 0.6,
    borderBlockColor: "#000000",
  },
  clouttext: {
    position: "relative",
    fontSize: 20,
    fontWeight: 900,
    color: "#c67ee2",
    width: 205,
  },
  cloutsub: {
    color: "#f5f5f5",
    fontSize: 10,
  },
  cloutsrch: {
    position: "relative",
    fontSize: 40,
    color: "#cfcfcf",
    right: -270,
    top: -5,
  },
  animatedModalContainer2: {
    position: "absolute",
    width: '100%',
    height: '100%',
    justifyContent: "center",
    alignItems: "center",
    zIndex: 800,
  },
  animatedBackdrop2: {
    position: "absolute",
    width: '100%',
    height: '100%',
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 25,
  },
  animatedModalContent2: {
    position: 'relative',
    top: 40,
    backgroundColor: "#2c2c2c",
    borderRadius: 15,
    padding: 20,
    width: "85%",
    height: 600,
  },
  animatedModalContainerr: {
    position: "absolute",
    width: '100%',
    height: '100%',
    justifyContent: "center",
    alignItems: "center",
    zIndex: 800,
  },
  animatedBackdropr: {
    position: "absolute",
    width: '100%',
    height: '100%',
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 25,
  },
  animatedModalContentr: {
    position: 'relative',
    top: 0,
    backgroundColor: "#2c2c2c",
    borderRadius: 15,
    padding: 20,
    width: "85%",
    height: 680,
  },
  animatedModalContainer: {
    position: "absolute",
    width: '100%',
    height: '100%',
    justifyContent: "center",
    alignItems: "center",
    zIndex: 800,
  },
  animatedBackdrop: {
    position: "absolute",
    width: '100%',
    height: '100%',
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 25,
  },
  animatedModalContent: {
    position: 'relative',
    top: 120,
    backgroundColor: "#2c2c2c",
    borderRadius: 15,
    padding: 20,
    width: "85%",
    height: 490,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
    padding: 10,
    borderRadius: 10,
    borderColor: "#3f3f3f",
    borderBottomWidth: 3,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 3,
  },
  habitScrollView: {
    maxHeight: "100%",
  },
  habitItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#444444",
  },
  habitItemSelected: {
    backgroundColor: "#222222",
    width: '100%',
  },
  habitText: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  habitTextSelected: {
    color: "#FFFFFF",
    fontWeight: 900,
  },
  benefitsContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#211c24",
    borderRadius: 10,
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: "#c67ee2",
    marginBottom: 10,
  },
  benefitsText: {
    fontSize: 16,
    color: "#f5f5f5",
  },
  nextButton: {
    marginTop: 20,
    backgroundColor: "#c67ee2",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  closeButton: {
    marginTop: 10,
    backgroundColor: "#4e4e4e",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  notificationText: {
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
  },
  timeInput: {
    borderWidth: 1,
    borderColor: "#c67ee2",
    borderRadius: 10,
    padding: 15,
    fontSize: 18,
    color: "#FFFFFF",
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: "#c67ee2",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  createButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  footstep: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    bottom: 100,
    left: 20,
    width: 170,
    height: 170,
    borderRadius: 25,
    borderColor: "#d6d5d5",
    borderBottomWidth: 5,
    backgroundColor: "#211c24",
  },
  numImg: {
    position: "absolute",
    height: "100%",
    width: "100%",
    resizeMode: "cover",
    opacity: 0.3,
    borderBlockColor: "#000000",
  },
  fsttl: {
    position: "relative",
    top: -40,
    fontSize: 25,
    color: "#c67ee2",
    fontFamily: "Roboto",
    fontWeight: "700",
  },
  fsImage: {
    position: "absolute",
    top: 85,
    left: 20,
    height: 80,
    width: 70,
    resizeMode: "cover",
  },
  fsd: {
    position: "relative",
    justifyContent: "center",
    top: -30,
    fontSize: 15,
    color: "#FFFFFF",
  },
  fsicon: {
    position: "absolute",
    right: 25,
    top: 100,
    fontSize: 40,
    color: "#cfcfcf",
  },
  exercise: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    bottom: 100,
    right: 20,
    width: 170,
    height: 170,
    borderRadius: 25,
    borderColor: "#d6d5d5",
    borderBottomWidth: 5,
    backgroundColor: "#211c24",
  },
  exettl: {
    position: "relative",
    top: 36,
    fontSize: 25,
    color: "#c67ee2",
    fontFamily: "Roboto",
    fontWeight: "700",
  },
  calImage: {
    position: "relative",
    top: 39,
    left: -35,
    height: 50,
    width: 60,
    resizeMode: "cover",
  },
  kcalttl: {
    position: "relative",
    top: -5,
    left: 20,
    fontSize: 15,
    color: "#FFFFFF",
  },
  numC: {
    position: "relative",
    top: -5,
    left: 9,
    fontSize: 14,
    color: "#FFFFFF",
  },
  exeImage: {
    position: "relative",
    top: 10,
    left: -33,
    height: 52,
    width: 60,
    resizeMode: "cover",
  },
  exettle: {
    position: "relative",
    top: -41,
    left: 22,
    fontSize: 15,
    color: "#FFFFFF",
  },
  numE: {
    position: "relative",
    top: -41,
    left: 7,
    fontSize: 14,
    color: "#FFFFFF",
  },
  // Picker styles
  pickerContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#363636",
    borderRadius: 10,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#c67ee2",
    marginBottom: 10,
    textAlign: "center",
  },
  timePickerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  minutePickerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  timeDisplay: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginHorizontal: 20,
    minWidth: 120,
    textAlign: "center",
  },
  datePickerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  dateDisplay: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginHorizontal: 15,
    minWidth: 150,
    textAlign: "center",
  },
  pickerButton: {
    backgroundColor: "#2b2a2a",
    padding: 10,
    borderRadius: 8,
    minWidth: 44,
    alignItems: "center",
  },
  pickerButtonSmall: {
    backgroundColor: "#2b2a2a",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  pickerIcon: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  pickerButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  todayButton: {
    position: "relative",
    width: 150,
    borderTopWidth: 2,
    marginLeft: 62,
    borderColor: "#c67ee2",
    alignItems: "center",
    justifyContent: "center",
  },
  todayButtonText: {
    fontSize: 17,
    color: "#FFFFFF",
    fontWeight: "bold",
    marginTop: 10,
  },
  repeatOptionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  repeatOption: {
    flex: 1,
    backgroundColor: "#2b2a2a",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  repeatOptionActive: {
    backgroundColor: "#c67ee2",
  },
  repeatOptionText: {
    fontSize: 12,
    color: "#CCCCCC",
    fontWeight: "bold",
  },
  repeatOptionTextActive: {
    fontWeight: 800,
    fontSize: 14,
    color: "#FFFFFF",
  },
  // Sticky Note Modal Styles
  stickyNoteModalContent: {
    backgroundColor: "#222022",
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxHeight: "85%",
  },
  modalTitleN: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 20,
    textAlign: "center",
    padding: 10,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 3,
    borderBottomWidth: 3,
    borderColor: "#3f3f3f",
  },
  tabContainer: {
    flexDirection: "row",
    marginBottom: 15,
    backgroundColor: "#2b2a2a",
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "#c67ee2",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
  },
  tabTextActive: {
    fontWeight: 800,
    fontSize: 16,
    color: "#ffffff",
  },
  tabContent: {
    minHeight: 200,
    maxHeight: 300,
  },
  noteTitleInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#000000",
    marginBottom: 10,
  },
  noteContentInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#000000",
    minHeight: 150,
    maxHeight: 200,
    textAlignVertical: "top",
  },
  listInputContainer: {
    flexDirection: "row",
    marginBottom: 10,
  },
  listInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#000000",
  },
  addItemButton: {
    backgroundColor: "#c67ee2",
    borderRadius: 10,
    padding: 12,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addItemIcon: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  listScrollView: {
    maxHeight: 200,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "#363636",
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderColor:"#c67ee2",
  },
  checkbox: {
    fontSize: 20,
    color: "#999",
    marginRight: 10,
  },
  checkboxChecked: {
    color: "#059669",
  },
  listItemText: {
    fontSize: 14,
    color: "#FFFFFF",
    flex: 1,
  },
  listItemTextChecked: {
    textDecorationLine: "line-through",
    color: "#FFFFFF",
  },
  notesScrollView: {
    maxHeight: 280,
  },
  emptyNotesText: {
    textAlign: "center",
    color: "#92400E",
    fontSize: 14,
    marginTop: 20,
  },
  noteCard: {
    backgroundColor: "#363636",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#c67ee2",
  },
  noteCardTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  noteCardContent: {
    fontSize: 12,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  noteCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  noteCardDate: {
    fontSize: 10,
    color: "#999",
  },
  deleteIcon: {
    fontSize: 16,
    color: "#999",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    marginTop: 15,
    gap: 10,
  },
  newNoteButton: {
    flex: 1,
    backgroundColor: "#059669",
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#2dbd51",
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    fontSize: 16,
    color: "#FFFFFF",
    marginRight: 8,
  },
  newNoteButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  // Saved Notes Section Styles
  savedNotesSection: {
    position: "relative",
    top: 353,
    height: 170,
    width: 345,
    backgroundColor: "#211c24",
    padding: 20,
    borderRadius: 25,
  },
  savedNotesTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: "#ffffff",
    marginBottom: 10,
  },
  savedNoteCard: {
    backgroundColor: "#2a2335",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 150,
    height: 80,
    borderLeftWidth: 3,
    borderColor: "#c67ee2",
    justifyContent: "space-between",
  },
  savedNoteTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  savedNoteContent: {
    fontSize: 11,
    color: "#CCCCCC",
    lineHeight: 15,
    flex: 1,
  },
  savedNoteListPreview: {
    flex: 1,
    gap: 3,
  },
  savedNoteListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  savedNoteCheckbox: {
    fontSize: 11,
    color: "#888888",
  },
  savedNoteCheckboxChecked: {
    color: "#4CAF50",
  },
  savedNoteItemText: {
    fontSize: 11,
    color: "#CCCCCC",
    flex: 1,
  },
  savedNoteItemTextChecked: {
    textDecorationLine: "line-through",
    color: "#666666",
  },
  savedNoteMoreItems: {
    fontSize: 10,
    color: "#888888",
    fontStyle: "italic",
    marginTop: 1,
  },
  savedNoteFooter: {
    marginTop: 5,
  },
  savedNoteTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  savedNoteTypeBadgeNote: {
    backgroundColor: "rgba(198,126,226,0.25)",
  },
  savedNoteTypeBadgeList: {
    backgroundColor: "rgba(76,175,80,0.25)",
  },
  savedNoteTypeIcon: {
    fontSize: 9,
    color: "#c67ee2",
  },
  savedNoteTypeText: {
    fontSize: 9,
    color: "#c67ee2",
    fontWeight: "600",
  },
  // Note Overview Modal Styles
  noteOverviewModalContent: {
    backgroundColor: "#211c24",
    borderRadius: 15,
    padding: 20,
    width: "85%",
    maxHeight: "80%",
  },
  noteOverviewTitle: {
    fontSize: 24,
    fontWeight: 800,
    color: "#FFFFFF",
    marginBottom: 15,
    textAlign: "center",
  },
  noteOverviewContentScroll: {
    maxHeight: 150,
    marginBottom: 15,
  },
  noteOverviewContent: {
    fontSize: 16,
    color: "#CCCCCC",
    lineHeight: 20,
  },
  noteOverviewItemsContainer: {
    marginBottom: 15,
  },
  noteOverviewItemsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#c67ee2",
    marginBottom: 10,
  },
  noteOverviewItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  noteOverviewCheckbox: {
    fontSize: 18,
    color: "#c67ee2",
    marginRight: 10,
  },
  noteOverviewItemText: {
    fontSize: 14,
    color: "#FFFFFF",
    flex: 1,
  },
  noteOverviewItemTextChecked: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  noteOverviewFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#362c3a",
  },
  noteOverviewDate: {
    fontSize: 12,
    color: "#888888",
  },
  noteOverviewButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },
  noteOverviewEditButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#c67ee2",
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  noteOverviewButtonIcon: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  noteOverviewEditButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  noteOverviewCloseButton: {
    flex: 1,
    backgroundColor: "#362c3a",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  noteOverviewCloseButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  // Scroll background styles
  scrollbgg: {
    height: 10,
  },
  scrollbg: {
    height: 10,
  },
});