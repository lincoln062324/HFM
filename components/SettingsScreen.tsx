// Settings Screen Component
import { StyleSheet, Text, View, ScrollView, Pressable, Switch, Alert, useColorScheme, Modal, Animated } from "react-native";
import React, { useState, useEffect, useRef } from "react";
import Icon from "react-native-vector-icons/FontAwesome";
import * as Haptics from "expo-haptics";

interface SettingsScreenProps {
  onClose: () => void;
  currentTheme?: string;
  onThemeChange?: (themeId: string) => void;
}

interface ThemeColor {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  background: string;
  card: string;
  text: string;
  accent: string;
}

const THEME_COLORS: ThemeColor[] = [
  {
    id: 'system',
    name: 'System',
    primary: '#2196F3',
    secondary: '#1a237e',
    background: '#0d1b2a',
    card: '#1b263b',
    text: '#FFFFFF',
    accent: '#64b5f6',
  },
  {
    id: 'purple',
    name: 'Purple Dream',
    primary: '#c67ee2',
    secondary: '#1e1929',
    background: '#15041f',
    card: '#211c24',
    text: '#FFFFFF',
    accent: '#84d7f4',
  },
  {
    id: 'blue',
    name: 'Ocean Blue',
    primary: '#2196F3',
    secondary: '#1a237e',
    background: '#0d1b2a',
    card: '#1b263b',
    text: '#FFFFFF',
    accent: '#64b5f6',
  },
  {
    id: 'green',
    name: 'Forest Green',
    primary: '#4CAF50',
    secondary: '#1b5e20',
    background: '#0a1f0a',
    card: '#1b3a1b',
    text: '#FFFFFF',
    accent: '#81c784',
  },
  {
    id: 'orange',
    name: 'Sunset Orange',
    primary: '#FF9800',
    secondary: '#e65100',
    background: '#1a0f00',
    card: '#2d1f0a',
    text: '#FFFFFF',
    accent: '#ffb74d',
  },
  {
    id: 'red',
    name: 'Cherry Red',
    primary: '#f44336',
    secondary: '#b71c1c',
    background: '#1a0505',
    card: '#2d0f0f',
    text: '#FFFFFF',
    accent: '#e57373',
  },
  {
    id: 'teal',
    name: 'Teal Time',
    primary: '#009688',
    secondary: '#004d40',
    background: '#001a17',
    card: '#0d2d28',
    text: '#FFFFFF',
    accent: '#4db6ac',
  },
];

// Get system theme colors
const getSystemThemeColors = (isDark: boolean): ThemeColor => ({
  id: 'system',
  name: 'System',
  primary: isDark ? '#2196F3' : '#2196F3',
  secondary: isDark ? '#1a237e' : '#bbdefb',
  background: isDark ? '#0d1b2a' : '#f5f5f5',
  card: isDark ? '#1b263b' : '#ffffff',
  text: isDark ? '#FFFFFF' : '#000000',
  accent: isDark ? '#64b5f6' : '#1976D2',
});

interface AppSettings {
  theme: string;
  notifications: boolean;
  soundEffects: boolean;
  vibration: boolean;
  autoLock: boolean;
  biometricAuth: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'purple',
  notifications: true,
  soundEffects: true,
  vibration: true,
  autoLock: false,
  biometricAuth: false,
};

// Countdown Timer Component
const CountdownModal = ({ 
  visible, 
  themeName, 
  countdown, 
  onConfirm, 
  onCancel 
}: { 
  visible: boolean; 
  themeName: string; 
  countdown: number; 
  onConfirm: () => void; 
  onCancel: () => void;
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.countdownModalOverlay}>
        <View style={styles.countdownModalContent}>
          <Icon style={styles.countdownIcon} name="clock-o" />
          <Text style={styles.countdownTitle}>Applying Theme</Text>
          <Text style={styles.countdownThemeName}>{themeName}</Text>
          <View style={styles.countdownCircle}>
            <Text style={styles.countdownNumber}>{countdown}</Text>
          </View>
          <Text style={styles.countdownText}>
            {countdown > 0 ? "Theme will revert if not confirmed..." : "Time's up! Reverting theme..."}
          </Text>
          <View style={styles.countdownButtons}>
            <Pressable style={styles.countdownConfirmButton} onPress={onConfirm}>
              <Icon style={styles.countdownButtonIcon} name="check" />
              <Text style={styles.countdownConfirmText}>Confirm</Text>
            </Pressable>
            <Pressable style={styles.countdownCancelButton} onPress={onCancel}>
              <Icon style={styles.countdownButtonIcon} name="times" />
              <Text style={styles.countdownCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Permission Modal Component
const PermissionModal = ({ 
  visible, 
  title, 
  description, 
  iconName, 
  onConfirm, 
  onCancel 
}: { 
  visible: boolean; 
  title: string; 
  description: string; 
  iconName: string; 
  onConfirm: () => void; 
  onCancel: () => void;
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.permissionModalOverlay}>
        <View style={styles.permissionModalContent}>
          <Icon style={styles.permissionIcon} name={iconName} />
          <Text style={styles.permissionTitle}>{title}</Text>
          <Text style={styles.permissionDescription}>{description}</Text>
          <View style={styles.permissionButtons}>
            <Pressable style={styles.permissionAllowButton} onPress={onConfirm}>
              <Icon style={styles.permissionButtonIcon} name="check" />
              <Text style={styles.permissionAllowText}>Allow</Text>
            </Pressable>
            <Pressable style={styles.permissionDenyButton} onPress={onCancel}>
              <Icon style={styles.permissionButtonIcon} name="times" />
              <Text style={styles.permissionDenyText}>Don't Allow</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Verification Modal Component
const VerificationModal = ({ 
  visible, 
  title, 
  description, 
  iconName, 
  onConfirm, 
  onCancel 
}: { 
  visible: boolean; 
  title: string; 
  description: string; 
  iconName: string; 
  onConfirm: () => void; 
  onCancel: () => void;
}) => {
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handlePinPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      if (newPin.length === 4) {
        // Simulate verification
        setIsVerifying(true);
        setTimeout(() => {
          setIsVerifying(false);
          onConfirm();
        }, 1000);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.verificationModalOverlay}>
        <View style={styles.verificationModalContent}>
          <Icon style={styles.verificationIcon} name={iconName} />
          <Text style={styles.verificationTitle}>{title}</Text>
          <Text style={styles.verificationDescription}>{description}</Text>
          
          {/* PIN Dots */}
          <View style={styles.pinDotsContainer}>
            {[0, 1, 2, 3].map((index) => (
              <View 
                key={index} 
                style={[
                  styles.pinDot, 
                  pin.length > index && styles.pinDotFilled
                ]} 
              />
            ))}
          </View>
          
          {isVerifying ? (
            <Text style={styles.verifyingText}>Verifying...</Text>
          ) : (
            <>
              {/* Number Pad */}
              <View style={styles.numberPad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((num, index) => (
                  <Pressable 
                    key={index} 
                    style={[styles.numberPadButton, num === '' && styles.numberPadButtonEmpty]}
                    onPress={() => num === 'del' ? handleDelete() : num && handlePinPress(num)}
                    disabled={num === ''}
                  >
                    {num === 'del' ? (
                      <Icon name="delete" style={styles.numberPadIcon} />
                    ) : (
                      <Text style={styles.numberPadText}>{num}</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </>
          )}
          
          <View style={styles.verificationButtons}>
            <Pressable style={styles.verificationCancelButton} onPress={onCancel}>
              <Text style={styles.verificationCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function SettingsScreen({ onClose, currentTheme: initialTheme, onThemeChange }: SettingsScreenProps): React.JSX.Element {
  const systemColorScheme = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [selectedTheme, setSelectedTheme] = useState(initialTheme || 'purple');
  const [pendingTheme, setPendingTheme] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [showCountdownModal, setShowCountdownModal] = useState(false);
  
  // Permission modals state
  const [showNotificationPermission, setShowNotificationPermission] = useState(false);
  const [showSoundPermission, setShowSoundPermission] = useState(false);
  const [showVibrationPermission, setShowVibrationPermission] = useState(false);
  const [pendingNotificationSetting, setPendingNotificationSetting] = useState<boolean | null>(null);
  const [pendingSoundSetting, setPendingSoundSetting] = useState<boolean | null>(null);
  const [pendingVibrationSetting, setPendingVibrationSetting] = useState<boolean | null>(null);
  
  // Verification modals state
  const [showAutoLockVerification, setShowAutoLockVerification] = useState(false);
  const [showBiometricVerification, setShowBiometricVerification] = useState(false);
  const [pendingAutoLockSetting, setPendingAutoLockSetting] = useState<boolean | null>(null);
  const [pendingBiometricSetting, setPendingBiometricSetting] = useState<boolean | null>(null);
  
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get current theme based on selection
  const getCurrentTheme = (): ThemeColor => {
    if (selectedTheme === 'system') {
      return getSystemThemeColors(systemColorScheme === 'dark');
    }
    return THEME_COLORS.find(t => t.id === selectedTheme) || THEME_COLORS[1];
  };

  const currentTheme = getCurrentTheme();

  // Countdown effect
  useEffect(() => {
    if (showCountdownModal && countdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (showCountdownModal && countdown === 0) {
      // Time's up - revert to default
      handleRevertTheme();
    }

    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
      }
    };
  }, [showCountdownModal, countdown]);

  const handleRevertTheme = () => {
    setShowCountdownModal(false);
    setPendingTheme(null);
    setCountdown(5);
    Alert.alert('Theme Reverted', 'Theme was reverted to the previous state due to timeout.');
  };

  const handleConfirmTheme = () => {
    if (pendingTheme) {
      setSettings(prev => ({ ...prev, theme: pendingTheme }));
      setShowCountdownModal(false);
      setPendingTheme(null);
      setCountdown(5);
      if (onThemeChange) {
        onThemeChange(pendingTheme);
      }
      Alert.alert('Theme Applied', `Theme has been successfully applied!`);
    }
  };

  const handleThemeSelect = (themeId: string) => {
    if (themeId === selectedTheme) return;
    
    setPendingTheme(themeId);
    setCountdown(5);
    setShowCountdownModal(true);
  };

  const toggleSetting = (key: keyof AppSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Notification toggle with permission modal
  const handleNotificationToggle = (value: boolean) => {
    if (value && !settings.notifications) {
      // Turning on - show permission modal
      setPendingNotificationSetting(value);
      setShowNotificationPermission(true);
    } else {
      toggleSetting('notifications');
    }
  };

  // Sound toggle with permission modal
  const handleSoundToggle = (value: boolean) => {
    if (value && !settings.soundEffects) {
      setPendingSoundSetting(value);
      setShowSoundPermission(true);
    } else {
      toggleSetting('soundEffects');
    }
  };

  // Vibration toggle with permission modal
  const handleVibrationToggle = (value: boolean) => {
    if (value && !settings.vibration) {
      setPendingVibrationSetting(value);
      setShowVibrationPermission(true);
    } else {
      toggleSetting('vibration');
    }
  };

  // Auto lock toggle with verification
  const handleAutoLockToggle = (value: boolean) => {
    if (value && !settings.autoLock) {
      setPendingAutoLockSetting(value);
      setShowAutoLockVerification(true);
    } else {
      toggleSetting('autoLock');
    }
  };

  // Biometric toggle with verification
  const handleBiometricToggle = (value: boolean) => {
    if (value && !settings.biometricAuth) {
      setPendingBiometricSetting(value);
      setShowBiometricVerification(true);
    } else {
      toggleSetting('biometricAuth');
    }
  };

  // Confirm notification permission
  const confirmNotificationPermission = () => {
    setSettings(prev => ({ ...prev, notifications: true }));
    setShowNotificationPermission(false);
    setPendingNotificationSetting(null);
    Alert.alert('Success', 'Push notifications have been enabled!');
  };

  // Confirm sound permission
  const confirmSoundPermission = () => {
    setSettings(prev => ({ ...prev, soundEffects: true }));
    setShowSoundPermission(false);
    setPendingSoundSetting(null);
    Alert.alert('Success', 'Sound effects have been enabled!');
  };

  // Confirm vibration permission
  const confirmVibrationPermission = () => {
    setSettings(prev => ({ ...prev, vibration: true }));
    setShowVibrationPermission(false);
    setPendingVibrationSetting(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Success', 'Vibration has been enabled!');
  };

  // Confirm auto lock verification
  const confirmAutoLockVerification = () => {
    setSettings(prev => ({ ...prev, autoLock: true }));
    setShowAutoLockVerification(false);
    setPendingAutoLockSetting(null);
    Alert.alert('Success', 'Auto lock has been enabled!');
  };

  // Confirm biometric verification
  const confirmBiometricVerification = () => {
    setSettings(prev => ({ ...prev, biometricAuth: true }));
    setShowBiometricVerification(false);
    setPendingBiometricSetting(null);
    Alert.alert('Success', 'Biometric authentication has been enabled!');
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
     <View style={styles.header1} />
      <View style={[styles.header, { backgroundColor: currentTheme.secondary }]}>
        <Text style={[styles.title, { color: currentTheme.text }]}>Settings</Text>
        <Pressable onPress={onClose}>
          <Icon style={[styles.closeIcon, { color: currentTheme.text }]} name="times-circle" />
        </Pressable>
      </View>

      <ScrollView style={styles.content}>
        {/* Notification Settings */}
        <View style={[styles.section, { backgroundColor: currentTheme.card }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.primary }]}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon style={[styles.settingIcon, { color: currentTheme.primary }]} name="bell" />
              <View>
                <Text style={[styles.settingLabel, { color: currentTheme.text }]}>Push Notifications</Text>
                <Text style={[styles.settingDescription, { color: currentTheme.text }]}>Receive reminders and updates</Text>
              </View>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#362c3a', true: currentTheme.primary }}
              thumbColor={settings.notifications ? '#FFFFFF' : '#666666'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon style={[styles.settingIcon, { color: currentTheme.primary }]} name="volume-up" />
              <View>
                <Text style={[styles.settingLabel, { color: currentTheme.text }]}>Sound Effects</Text>
                <Text style={[styles.settingDescription, { color: currentTheme.text }]}>Play sounds for actions</Text>
              </View>
            </View>
            <Switch
              value={settings.soundEffects}
              onValueChange={handleSoundToggle}
              trackColor={{ false: '#362c3a', true: currentTheme.primary }}
              thumbColor={settings.soundEffects ? '#FFFFFF' : '#666666'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon style={[styles.settingIcon, { color: currentTheme.primary }]} name="mobile" />
              <View>
                <Text style={[styles.settingLabel, { color: currentTheme.text }]}>Vibration</Text>
                <Text style={[styles.settingDescription, { color: currentTheme.text }]}>Vibrate for notifications</Text>
              </View>
            </View>
            <Switch
              value={settings.vibration}
              onValueChange={handleVibrationToggle}
              trackColor={{ false: '#362c3a', true: currentTheme.primary }}
              thumbColor={settings.vibration ? '#FFFFFF' : '#666666'}
            />
          </View>
        </View>

        {/* Security Settings */}
        <View style={[styles.section, { backgroundColor: currentTheme.card }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.primary }]}>Security</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon style={[styles.settingIcon, { color: currentTheme.primary }]} name="lock" />
              <View>
                <Text style={[styles.settingLabel, { color: currentTheme.text }]}>Auto Lock</Text>
                <Text style={[styles.settingDescription, { color: currentTheme.text }]}>Lock app when in background</Text>
              </View>
            </View>
            <Switch
              value={settings.autoLock}
              onValueChange={handleAutoLockToggle}
              trackColor={{ false: '#362c3a', true: currentTheme.primary }}
              thumbColor={settings.autoLock ? '#FFFFFF' : '#666666'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon style={[styles.settingIcon, { color: currentTheme.primary }]} name="fingerprint" />
              <View>
                <Text style={[styles.settingLabel, { color: currentTheme.text }]}>Biometric Authentication</Text>
                <Text style={[styles.settingDescription, { color: currentTheme.text }]}>Use Face ID or fingerprint</Text>
              </View>
            </View>
            <Switch
              value={settings.biometricAuth}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: '#362c3a', true: currentTheme.primary }}
              thumbColor={settings.biometricAuth ? '#FFFFFF' : '#666666'}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={[styles.section, { backgroundColor: currentTheme.card }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.primary }]}>About</Text>
          
          <View style={styles.aboutItem}>
            <Icon style={[styles.aboutIcon, { color: currentTheme.primary }]} name="info-circle" />
            <View>
              <Text style={[styles.aboutLabel, { color: currentTheme.text }]}>App Version</Text>
              <Text style={[styles.aboutValue, { color: currentTheme.text }]}>1.0.0</Text>
            </View>
          </View>

          <View style={styles.aboutItem}>
            <Icon style={[styles.aboutIcon, { color: currentTheme.primary }]} name="code" />
            <View>
              <Text style={[styles.aboutLabel, { color: currentTheme.text }]}>Build Number</Text>
              <Text style={[styles.aboutValue, { color: currentTheme.text }]}>2024.01.15</Text>
            </View>
          </View>

          <Pressable style={styles.aboutButton}>
            <Icon style={[styles.aboutButtonIcon, { color: currentTheme.primary }]} name="star" />
            <Text style={[styles.aboutButtonText, { color: currentTheme.text }]}>Rate App</Text>
          </Pressable>

          <Pressable style={styles.aboutButton}>
            <Icon style={[styles.aboutButtonIcon, { color: currentTheme.primary }]} name="question-circle" />
            <Text style={[styles.aboutButtonText, { color: currentTheme.text }]}>Help & Support</Text>
          </Pressable>

          <Pressable style={styles.aboutButton}>
            <Icon style={[styles.aboutButtonIcon, { color: currentTheme.primary }]} name="file-text" />
            <Text style={[styles.aboutButtonText, { color: currentTheme.text }]}>Privacy Policy</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Countdown Modal */}
      <CountdownModal
        visible={showCountdownModal}
        themeName={THEME_COLORS.find(t => t.id === pendingTheme)?.name || ''}
        countdown={countdown}
        onConfirm={handleConfirmTheme}
        onCancel={handleRevertTheme}
      />

      {/* Permission Modals */}
      <PermissionModal
        visible={showNotificationPermission}
        title="Enable Push Notifications"
        description="Allow MyFitnessJourney to send you push notifications for reminders and updates?"
        iconName="bell"
        onConfirm={confirmNotificationPermission}
        onCancel={() => {
          setShowNotificationPermission(false);
          setPendingNotificationSetting(null);
        }}
      />

      <PermissionModal
        visible={showSoundPermission}
        title="Enable Sound Effects"
        description="Allow the app to play sound effects for actions and notifications?"
        iconName="volume-up"
        onConfirm={confirmSoundPermission}
        onCancel={() => {
          setShowSoundPermission(false);
          setPendingSoundSetting(null);
        }}
      />

      <PermissionModal
        visible={showVibrationPermission}
        title="Enable Vibration"
        description="Allow the app to vibrate for notifications and feedback?"
        iconName="mobile"
        onConfirm={confirmVibrationPermission}
        onCancel={() => {
          setShowVibrationPermission(false);
          setPendingVibrationSetting(null);
        }}
      />

      {/* Verification Modals */}
      <VerificationModal
        visible={showAutoLockVerification}
        title="Auto Lock Verification"
        description="Enter your 4-digit PIN to enable auto lock"
        iconName="lock"
        onConfirm={confirmAutoLockVerification}
        onCancel={() => {
          setShowAutoLockVerification(false);
          setPendingAutoLockSetting(null);
        }}
      />

      <VerificationModal
        visible={showBiometricVerification}
        title="Biometric Authentication"
        description="Verify your identity to enable biometric authentication"
        iconName="fingerprint"
        onConfirm={confirmBiometricVerification}
        onCancel={() => {
          setShowBiometricVerification(false);
          setPendingBiometricSetting(null);
        }}
      />
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
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#CCCCCC",
    marginBottom: 15,
  },
  previewSubtitle: {
    fontSize: 14,
    color: "#CCCCCC",
    marginBottom: 10,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  themeCard: {
    width: "30%",
    backgroundColor: "#1e1929",
    borderRadius: 12,
    padding: 8,
    marginBottom: 10,
    borderWidth: 2,
    alignItems: "center",
  },
  themeCardSelected: {
    borderWidth: 2,
  },
  themePreview: {
    width: "100%",
    height: 40,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 6,
  },
  themePreviewTop: {
    height: 12,
  },
  themePreviewCard: {
    flex: 1,
    margin: 3,
    borderRadius: 3,
  },
  themeInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  themeColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  themeName: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  themeCheckIcon: {
    position: "absolute",
    top: 3,
    right: 3,
    fontSize: 12,
    color: "#4CAF50",
  },
  
  // Enhanced Preview Styles
  previewContainer: {
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#362c3a",
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  previewMenuIcon: {
    padding: 4,
  },
  previewHeaderText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  previewPlusIcon: {
    padding: 4,
  },
  previewContent: {
    gap: 8,
  },
  previewCard: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  previewCardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
  },
  previewPieContainer: {
    flexDirection: "row",
    height: 20,
    width: '80%',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 6,
  },
  previewPieSegment: {
    height: '100%',
  },
  previewCardValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  previewCardLabel: {
    fontSize: 10,
    color: "#888888",
  },
  previewStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  previewStatItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 6,
    gap: 6,
  },
  previewStatText: {
    fontSize: 10,
    color: "#FFFFFF",
  },
  previewStatValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  previewButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 4,
  },
  previewButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  previewButtonText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#362c3a",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    color: "#c67ee2",
    marginRight: 15,
    width: 25,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: "#888888",
  },
  aboutItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#362c3a",
  },
  aboutIcon: {
    fontSize: 20,
    color: "#c67ee2",
    marginRight: 15,
    width: 25,
  },
  aboutLabel: {
    fontSize: 14,
    color: "#CCCCCC",
    marginBottom: 2,
  },
  aboutValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  aboutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#362c3a",
  },
  aboutButtonIcon: {
    fontSize: 20,
    color: "#c67ee2",
    marginRight: 15,
    width: 25,
  },
  aboutButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },

  // Countdown Modal Styles
  countdownModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  countdownModalContent: {
    backgroundColor: "#211c24",
    borderRadius: 20,
    padding: 25,
    width: "85%",
    alignItems: "center",
  },
  countdownIcon: {
    fontSize: 50,
    color: "#c67ee2",
    marginBottom: 15,
  },
  countdownTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  countdownThemeName: {
    fontSize: 18,
    color: "#c67ee2",
    marginBottom: 20,
  },
  countdownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#362c3a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 3,
    borderColor: "#c67ee2",
  },
  countdownNumber: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  countdownText: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    marginBottom: 20,
  },
  countdownButtons: {
    flexDirection: "row",
    gap: 15,
  },
  countdownConfirmButton: {
    flexDirection: "row",
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: "center",
    gap: 8,
  },
  countdownCancelButton: {
    flexDirection: "row",
    backgroundColor: "#f44336",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: "center",
    gap: 8,
  },
  countdownButtonIcon: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  countdownConfirmText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  countdownCancelText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  // Permission Modal Styles
  permissionModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  permissionModalContent: {
    backgroundColor: "#211c24",
    borderRadius: 20,
    padding: 25,
    width: "85%",
    alignItems: "center",
  },
  permissionIcon: {
    fontSize: 60,
    color: "#2196F3",
    marginBottom: 15,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 10,
    textAlign: "center",
  },
  permissionDescription: {
    fontSize: 16,
    color: "#CCCCCC",
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 22,
  },
  permissionButtons: {
    flexDirection: "row",
    gap: 15,
    width: "100%",
  },
  permissionAllowButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#4CAF50",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  permissionDenyButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#666666",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  permissionButtonIcon: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  permissionAllowText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  permissionDenyText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  // Verification Modal Styles
  verificationModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  verificationModalContent: {
    backgroundColor: "#211c24",
    borderRadius: 20,
    padding: 25,
    width: "85%",
    alignItems: "center",
  },
  verificationIcon: {
    fontSize: 50,
    color: "#c67ee2",
    marginBottom: 15,
  },
  verificationTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 5,
  },
  verificationDescription: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    marginBottom: 20,
  },
  pinDotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 15,
    marginBottom: 20,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#c67ee2",
    backgroundColor: "transparent",
  },
  pinDotFilled: {
    backgroundColor: "#c67ee2",
  },
  verifyingText: {
    fontSize: 16,
    color: "#c67ee2",
    marginBottom: 20,
  },
  numberPad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    maxWidth: 220,
    gap: 8,
    marginBottom: 20,
  },
  numberPadButton: {
    width: 60,
    height: 50,
    borderRadius: 10,
    backgroundColor: "#362c3a",
    justifyContent: "center",
    alignItems: "center",
  },
  numberPadButtonEmpty: {
    backgroundColor: "transparent",
  },
  numberPadText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  numberPadIcon: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  verificationButtons: {
    width: "100%",
  },
  verificationCancelButton: {
    backgroundColor: "#666666",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  verificationCancelText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});

