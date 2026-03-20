import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView,
  Animated, ActivityIndicator, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icon5 from 'react-native-vector-icons/FontAwesome5';
import supabase from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────
type AuthMode = 'login' | 'register';
type Step = 'form' | 'otp';

interface AuthScreenProps {
  onAuthenticated: (isNewUser: boolean, userId: string, email: string) => void;
}

// ─── OTP Input — auto-submits on 6th digit ────────────────────────────────────
function OtpInput({
  value, onChange, onComplete, disabled,
}: {
  value: string; onChange: (v: string) => void;
  onComplete: () => void; disabled?: boolean;
}) {
  const inputs = useRef<(TextInput | null)[]>([]);
  const digits = value.padEnd(6, ' ').split('').slice(0, 6);

  const handleKey = (index: number, key: string) => {
    if (disabled) return;
    if (key === 'Backspace') {
      const next = value.slice(0, index > 0 ? index - (value[index] && value[index] !== ' ' ? 0 : 1) : 0);
      onChange(next);
      if (index > 0 && (!value[index] || value[index] === ' ')) inputs.current[index - 1]?.focus();
      return;
    }
    if (!/^\d$/.test(key)) return;
    const arr = value.padEnd(6, ' ').split('');
    arr[index] = key;
    const next = arr.join('').replace(/ /g, '').slice(0, 6);
    onChange(next);
    if (index < 5) {
      inputs.current[index + 1]?.focus();
    } else {
      inputs.current[index]?.blur();
      if (next.length === 6) onComplete();
    }
  };

  useEffect(() => { if (value.length === 6) onComplete(); }, [value]);

  return (
    <View style={otpStyles.row}>
      {digits.map((d, i) => (
        <TextInput
          key={i}
          ref={r => { inputs.current[i] = r; }}
          style={[otpStyles.box, d.trim() && otpStyles.boxFilled, disabled && otpStyles.boxDisabled]}
          value={d.trim()} keyboardType="number-pad" maxLength={1} editable={!disabled}
          onKeyPress={({ nativeEvent }) => handleKey(i, nativeEvent.key)}
          onChangeText={t => { if (t) handleKey(i, t.slice(-1)); }}
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const otpStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginVertical: 20 },
  box: {
    width: 48, height: 56, borderRadius: 12, borderWidth: 2,
    borderColor: '#362c3a', backgroundColor: '#211c24',
    textAlign: 'center', fontSize: 22, fontWeight: '700', color: '#fff',
  },
  boxFilled: { borderColor: '#c67ee2', backgroundColor: '#2d1f3a' },
  boxDisabled: { opacity: 0.4 },
});

// ─── Main AuthScreen ──────────────────────────────────────────────────────────
export default function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [step, mode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const resetAnim = () => {
    fadeAnim.setValue(0); slideAnim.setValue(40);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const switchMode = (m: AuthMode) => {
    setMode(m); setStep('form'); setOtp('');
    setEmail(''); setPassword(''); setConfirmPassword(''); setFullName('');
    setPendingUserId(null);
    resetAnim();
  };

  // ── Generate OTP & store in otp_codes table ──────────────────────────────────
  // Generates a 6-digit code client-side, upserts into otp_codes, then sends via
  // Supabase custom SMTP (Brevo) — no rate limits, no Edge Functions needed.
  const generateAndStoreOtp = async (targetEmail: string): Promise<string> => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    const { error } = await supabase
      .from('otp_codes')
      .upsert(
        { email: targetEmail, code, expires_at: expiresAt, used: false },
        { onConflict: 'email' }
      );
    if (error) throw new Error('Failed to store code: ' + error.message);
    return code;
  };

  // ── REGISTER ─────────────────────────────────────────────────────────────────
  // 1. Validate form
  // 2. signUp() — creates the account immediately (email confirm must be OFF)
  // 3. Generate OTP → store in otp_codes table
  // 4. Show OTP screen — user enters the code they receive by email (via Brevo SMTP)
  const handleRegister = async () => {
    if (!fullName.trim()) { shake(); return Alert.alert('Missing', 'Please enter your full name.'); }
    if (!email.trim()) { shake(); return Alert.alert('Missing', 'Please enter your email.'); }
    if (!/\S+@\S+\.\S+/.test(email)) { shake(); return Alert.alert('Invalid', 'Please enter a valid email address.'); }
    if (password.length < 6) { shake(); return Alert.alert('Weak', 'Password must be at least 6 characters.'); }
    if (password !== confirmPassword) { shake(); return Alert.alert('Mismatch', 'Passwords do not match.'); }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Create account — email confirm must be OFF in Supabase Dashboard
      //    (Authentication → Providers → Email → Confirm email: OFF)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (signUpError) throw signUpError;

      // 2. Save the user id so verifyOtp can use it without needing getUser()
      const userId = signUpData.user?.id ?? null;
      setPendingUserId(userId);

      // 3. Generate OTP and store in otp_codes table
      //    The code is emailed automatically via your Brevo SMTP configuration.
      //    If Brevo is not set up yet, you can find the code in the otp_codes table.
      await generateAndStoreOtp(cleanEmail);

      setStep('otp');
      setResendCooldown(60);
      resetAnim();
    } catch (err: any) {
      shake();
      Alert.alert('Registration Failed', err.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── VERIFY OTP ────────────────────────────────────────────────────────────────
  // Checks code against otp_codes table directly — no Supabase email API call.
  const handleVerifyOtp = async () => {
    if (otp.length < 6) return;
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Read the stored code from otp_codes
      const { data: stored, error: fetchError } = await supabase
        .from('otp_codes')
        .select('code, expires_at, used')
        .eq('email', cleanEmail)
        .single();

      if (fetchError || !stored) {
        shake(); setOtp('');
        Alert.alert('No Code Found', 'Please request a new code.');
        setLoading(false);
        return;
      }

      // 2. Check expiry
      if (new Date(stored.expires_at) < new Date()) {
        shake(); setOtp('');
        Alert.alert('Code Expired', 'This code has expired. Tap Resend for a new one.');
        setLoading(false);
        return;
      }

      // 3. Check already used
      if (stored.used) {
        shake(); setOtp('');
        Alert.alert('Code Used', 'This code was already used. Tap Resend for a new one.');
        setLoading(false);
        return;
      }

      // 4. Check match
      if (stored.code !== otp) {
        shake(); setOtp('');
        Alert.alert('Wrong Code', 'That code is incorrect. Please try again.');
        setLoading(false);
        return;
      }

      // 5. Mark as used
      await supabase.from('otp_codes').update({ used: true }).eq('email', cleanEmail);

      // 6. Sign in so we have a valid session for the profile upsert
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      const userId = signInData?.user?.id ?? pendingUserId;
      if (!userId) throw new Error('Could not identify user. Please try logging in.');

      // 7. Create user profile row
      await supabase.from('user_profiles').upsert({
        user_id: userId,
        email: cleanEmail,
        full_name: fullName.trim(),
        onboarding_complete: false,
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      setPendingUserId(null);
      onAuthenticated(true, signInData?.user?.id ?? '', cleanEmail);
    } catch (err: any) {
      shake(); setOtp('');
      Alert.alert('Error', err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── LOGIN ─────────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email.trim()) { shake(); return Alert.alert('Missing', 'Please enter your email.'); }
    if (!password) { shake(); return Alert.alert('Missing', 'Please enter your password.'); }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_complete')
        .eq('user_id', data.user.id)
        .single();

      onAuthenticated(!profile?.onboarding_complete, data.user.id, data.user.email ?? '');
    } catch (err: any) {
      shake();
      Alert.alert('Login Failed', err.message ?? 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // ── RESEND ────────────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const code = await generateAndStoreOtp(cleanEmail);

      // Re-send via Supabase OTP (uses your custom SMTP)
      await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: false, data: { otp_code: code } },
      });

      setOtp('');
      setResendCooldown(60);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Logo */}
        <Animated.View style={[styles.logoArea, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoCircle}>
            <Icon5 name="heartbeat" size={36} color="#c67ee2" />
          </View>
          <Text style={styles.appName}>FitLife</Text>
          <Text style={styles.tagline}>Your personal health companion</Text>
        </Animated.View>

        {/* Card */}
        <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { translateX: shakeAnim }] }]}>
          {step === 'form' ? (
            <>
              {/* Mode tabs */}
              <View style={styles.modeTabs}>
                <Pressable style={[styles.modeTab, mode === 'login' && styles.modeTabActive]} onPress={() => switchMode('login')}>
                  <Text style={[styles.modeTabText, mode === 'login' && styles.modeTabTextActive]}>Sign In</Text>
                </Pressable>
                <Pressable style={[styles.modeTab, mode === 'register' && styles.modeTabActive]} onPress={() => switchMode('register')}>
                  <Text style={[styles.modeTabText, mode === 'register' && styles.modeTabTextActive]}>Create Account</Text>
                </Pressable>
              </View>

              {/* Full name (register only) */}
              {mode === 'register' && (
                <View style={styles.field}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputRow}>
                    <Icon name="user" size={16} color="#888" style={styles.inputIcon} />
                    <TextInput style={styles.input} placeholder="John Doe" placeholderTextColor="#555"
                      value={fullName} onChangeText={setFullName} autoCapitalize="words" />
                  </View>
                </View>
              )}

              {/* Email */}
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputRow}>
                  <Icon name="envelope" size={14} color="#888" style={styles.inputIcon} />
                  <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor="#555"
                    value={email} onChangeText={setEmail} keyboardType="email-address"
                    autoCapitalize="none" autoCorrect={false} />
                </View>
              </View>

              {/* Password */}
              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputRow}>
                  <Icon name="lock" size={16} color="#888" style={styles.inputIcon} />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Min. 6 characters" placeholderTextColor="#555"
                    value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" />
                  <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                    <Icon name={showPassword ? 'eye-slash' : 'eye'} size={16} color="#888" />
                  </Pressable>
                </View>
              </View>

              {/* Confirm password (register only) */}
              {mode === 'register' && (
                <View style={styles.field}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={styles.inputRow}>
                    <Icon name="lock" size={16} color="#888" style={styles.inputIcon} />
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="Repeat password" placeholderTextColor="#555"
                      value={confirmPassword} onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirm} autoCapitalize="none" />
                    <Pressable onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
                      <Icon name={showConfirm ? 'eye-slash' : 'eye'} size={16} color="#888" />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Submit */}
              <Pressable style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={mode === 'login' ? handleLogin : handleRegister} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Icon name={mode === 'login' ? 'sign-in' : 'user-plus'} size={16} color="#fff" />
                    <Text style={styles.submitBtnText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
                  </>
                )}
              </Pressable>

              {mode === 'register' && (
                <Text style={styles.otpNote}>
                  A 6-digit code will be sent to your email — no confirmation link needed.
                </Text>
              )}
            </>
          ) : (
            /* OTP Step */
            <>
              <View style={styles.otpHeader}>
                <View style={styles.otpIconCircle}>
                  <Icon name="envelope-open" size={28} color="#c67ee2" />
                </View>
                <Text style={styles.otpTitle}>Check your email</Text>
                <Text style={styles.otpSubtitle}>We sent a 6-digit code to</Text>
                <Text style={styles.otpEmail}>{email}</Text>
                <Text style={styles.otpHint}>Enter the code below — it expires in 10 minutes</Text>
              </View>

              {/* OTP boxes — auto-submits on 6th digit */}
              <OtpInput value={otp} onChange={setOtp} onComplete={handleVerifyOtp} disabled={loading} />

              {loading && (
                <View style={styles.verifyingRow}>
                  <ActivityIndicator color="#c67ee2" size="small" />
                  <Text style={styles.verifyingText}>Verifying…</Text>
                </View>
              )}

              {!loading && otp.length < 6 && (
                <Text style={styles.otpRemaining}>
                  {6 - otp.length} digit{6 - otp.length !== 1 ? 's' : ''} remaining
                </Text>
              )}

              <Pressable style={[styles.resendBtn, resendCooldown > 0 && styles.resendBtnDisabled]}
                onPress={handleResend} disabled={resendCooldown > 0 || loading}>
                <Text style={styles.resendText}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : '↩ Resend code'}
                </Text>
              </Pressable>

              <Pressable style={styles.backBtn} onPress={() => { setStep('form'); setOtp(''); resetAnim(); }} disabled={loading}>
                <Icon name="arrow-left" size={13} color="#888" />
                <Text style={styles.backBtnText}> Back</Text>
              </Pressable>
            </>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#15041f' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60, paddingBottom: 40 },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(198,126,226,0.15)', borderWidth: 2, borderColor: '#c67ee2',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  appName: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 14, color: '#888', marginTop: 4 },
  card: { backgroundColor: '#1e1929', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#362c3a' },
  modeTabs: { flexDirection: 'row', backgroundColor: '#15041f', borderRadius: 14, padding: 4, marginBottom: 24 },
  modeTab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  modeTabActive: { backgroundColor: '#c67ee2' },
  modeTabText: { fontSize: 14, fontWeight: '600', color: '#888' },
  modeTabTextActive: { color: '#fff' },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#aaa', marginBottom: 7 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#15041f', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#362c3a', paddingHorizontal: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, fontSize: 15, color: '#fff' },
  eyeBtn: { padding: 6 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#c67ee2', borderRadius: 14, paddingVertical: 15, marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  otpNote: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 12, lineHeight: 18 },
  otpHeader: { alignItems: 'center', marginBottom: 4 },
  otpIconCircle: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(198,126,226,0.15)', borderWidth: 2, borderColor: '#c67ee2',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  otpTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
  otpSubtitle: { fontSize: 14, color: '#888' },
  otpEmail: { fontSize: 15, fontWeight: '700', color: '#c67ee2', marginTop: 2 },
  otpHint: { fontSize: 13, color: '#666', marginTop: 6, textAlign: 'center' },
  verifyingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4 },
  verifyingText: { fontSize: 15, color: '#c67ee2', fontWeight: '600' },
  otpRemaining: { textAlign: 'center', fontSize: 13, color: '#555', marginTop: 2 },
  resendBtn: { alignItems: 'center', marginTop: 14, padding: 8 },
  resendBtnDisabled: { opacity: 0.4 },
  resendText: { fontSize: 14, color: '#c67ee2', fontWeight: '600' },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8, padding: 8 },
  backBtnText: { fontSize: 14, color: '#888' },
});