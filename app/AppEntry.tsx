// AppEntry.tsx — Root navigator: Auth → Onboarding → Dashboard
// 📁 Place this file in the same folder as dashboard.tsx  (e.g. app/ or screens/)
// 📁 Place AuthScreen.tsx and OnboardingScreen.tsx in components/
import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import supabase from '../lib/supabase';
import AuthScreen from '../components/AuthScreen';
import OnboardingScreen from '../components/OnboardingScreen';
import Dashboard from '../components/dashboard';

type AppState = 'loading' | 'auth' | 'onboarding' | 'app';

interface PendingUser {
  userId: string;
  email: string;
}

export default function AppEntry() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [pendingUser, setPendingUser] = useState<PendingUser | null>(null);
  const activeSessionId = React.useRef<string | null>(null);

  // ── Log a login event to user_session_logs ────────────────────────────────
  const logLogin = async (userId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('user_session_logs')
        .insert({ user_id: userId, login_date: today, login_at: new Date().toISOString() })
        .select('id')
        .single();
      if (data?.id) activeSessionId.current = data.id;
    } catch (e) {
      console.warn('Session log error:', e);
    }
  };

  // ── Log a logout event ────────────────────────────────────────────────────
  const logLogout = async () => {
    if (!activeSessionId.current) return;
    try {
      await supabase
        .from('user_session_logs')
        .update({
          logout_at: new Date().toISOString(),
          duration_min: null, // DB can compute via trigger or leave null
        })
        .eq('id', activeSessionId.current);
      activeSessionId.current = null;
    } catch (e) {
      console.warn('Session logout log error:', e);
    }
  };

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.id) {
        logLogin(session.user.id);
      }
      if (event === 'SIGNED_OUT' || !session) {
        await logLogout();
        setAppState('auth');
        setPendingUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAppState('auth'); return; }

      // Log this session open (app resumed with existing session)
      logLogin(session.user.id);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_complete')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.onboarding_complete) {
        setPendingUser({ userId: session.user.id, email: session.user.email ?? '' });
        setAppState('onboarding');
      } else {
        setAppState('app');
      }
    } catch {
      setAppState('auth');
    }
  };

  // AuthScreen calls this with userId + email so OnboardingScreen never needs getSession()
  const handleAuthenticated = (isNewUser: boolean, userId: string, email: string) => {
    logLogin(userId);
    if (isNewUser) {
      setPendingUser({ userId, email });
      setAppState('onboarding');
    } else {
      setAppState('app');
    }
  };

  const handleOnboardingComplete = () => {
    setPendingUser(null);
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
    return (
      <OnboardingScreen
        onComplete={handleOnboardingComplete}
        userId={pendingUser?.userId ?? ''}
        email={pendingUser?.email ?? ''}
      />
    );
  }

  return <Dashboard />;
}

const styles = StyleSheet.create({
  loader: { flex: 1, backgroundColor: '#15041f', justifyContent: 'center', alignItems: 'center' },
});