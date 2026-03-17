import React from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Dimensions, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useColorScheme } from 'react-native';

interface GoalReachedModalProps {
  visible: boolean;
  quote: string;
  onClose: () => void;
  themeColors: any;
}

const GoalReachedModal: React.FC<GoalReachedModalProps> = ({ 
  visible, 
  quote, 
  onClose, 
  themeColors 
}) => {
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const backdropAnim = React.useRef(new Animated.Value(0)).current;
  const confettiAnim = React.useRef(new Animated.Value(0)).current;
  const systemColorScheme = useColorScheme();

  React.useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(confettiAnim, { 
          toValue: 1, 
          duration: 2000, 
          useNativeDriver: false 
        })
      ]).start();
    } else {
      // Reset animations
      backdropAnim.setValue(0);
      scaleAnim.setValue(0.8);
      confettiAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity: backdropAnim }]}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      
      <Animated.View style={[
        styles.modal, 
        { 
          transform: [{ scale: scaleAnim }],
          backgroundColor: themeColors.card,
          borderColor: themeColors.primary
        }
      ]}>
        {/* Animated Confetti Stars */}
        <Animated.View style={[
          styles.confettiContainer,
          { opacity: confettiAnim }
        ]}>
          {[0,1,2,3,4].map(i => (
            <Animated.View key={i} style={[
              styles.confettiStar,
              {
                transform: [{
                  translateY: confettiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -Dimensions.get('window').height * 0.3]
                  })
                }],
                left: `${20 + i * 15}%`,
                animationDelay: i * 100
              }
            ]}>
              <Icon name="star" size={20} color="#FFD700" />
            </Animated.View>
          ))}
        </Animated.View>

        {/* Success Icon with Bounce */}
        <Animated.View style={{
          transform: [{
            scale: scaleAnim.interpolate({
              inputRange: [0.8, 1],
              outputRange: [1.2, 1]
            })
          }]
        }}>
          <View style={[
            styles.successIcon,
            { backgroundColor: themeColors.primary }
          ]}>
            <Icon name="trophy" size={60} color="#FFFFFF" />
          </View>
        </Animated.View>

        <Text style={[styles.title, { color: themeColors.text }]}>
          Goal Reached! 🎉
        </Text>
        
        <Text style={[styles.quote, { color: themeColors.text }]}>
          "{quote}"
        </Text>

        <Pressable 
          style={[styles.button, { backgroundColor: themeColors.primary }]}
          onPress={onClose}
        >
          <Text style={styles.buttonText}>Continue Crushing It!</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modal: {
    minHeight: 350,
    width: '85%',
    maxWidth: 400,
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 2,
    gap: 20,
  },
  confettiContainer: {
    position: 'absolute',
    top: -50,
    left: 0,
    right: 0,
    height: 100,
  },
  confettiStar: {
    position: 'absolute',
    top: 0,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  quote: {
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    color: '#E0E0E0',
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default GoalReachedModal;
