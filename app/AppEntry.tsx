// AppEntry.tsx — Root navigator: Auth → Onboarding → Dashboard
// 📁 Place this file in the same folder as dashboard.tsx  (e.g. app/ or screens/)
// 📁 Place AuthScreen.tsx and OnboardingScreen.tsx in components/
import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import supabase from '../lib/supabase';
import AuthScreen from '../components/AuthScreen';
import OnboardingScreen from '../components/OnboardingScreen';
import Dashboard from '../components/dashboard';

type AppState = 'loading' | 'auth' | 'onboarding' | 'app';

export default function AppEntry() {
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    checkSession();

    // Listen for auth changes (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setAppState('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAppState('auth'); return; }

      // Check onboarding
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_complete')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.onboarding_complete) {
        setAppState('onboarding');
      } else {
        setAppState('app');
      }
    } catch {
      setAppState('auth');
    }
  };

  const handleAuthenticated = (isNewUser: boolean) => {
    setAppState(isNewUser ? 'onboarding' : 'app');
  };

  const handleOnboardingComplete = () => {
    setAppState('app');
  };

  if (appState === 'loading') {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#c67ee2" />
      </View>
    );
  }

  if (appState === 'auth') {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  if (appState === 'onboarding') {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return <Dashboard />;
}

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: '#15041f', justifyContent: 'center', alignItems: 'center' },
});