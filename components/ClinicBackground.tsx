import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

// --- THE INDIVIDUAL ANIMATED ICON ---
const FloatingIcon = ({ name, size, left, delay, duration }: any) => {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // This loops the animation forever: moving from bottom (0) to top (-1500)
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateY, {
          toValue: -1500, // Move it far up off the screen
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: true, // Keeps the app running fast
        }),
      ])
    );
    animation.start();
  }, [delay, duration, translateY]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: left,
        bottom: -100, // Start just below the visible screen
        opacity: 0.15, // Very subtle! We don't want to blind the user
        transform: [{ translateY }],
      }}
    >
      <Ionicons name={name} size={size} color="#14B8A6" />
    </Animated.View>
  );
};

// --- THE MAIN BACKGROUND WRAPPER ---
export default function ClinicBackground() {
  return (
    // pointerEvents="none" is SUPER important. It allows the user to click 
    // the buttons on your dashboard 'through' the background animation.
    <View style={styles.backgroundContainer} pointerEvents="none">
      
      {/* Feel free to change the icons, speeds, and positions! */}
      <FloatingIcon name="heart" size={60} left="10%" delay={0} duration={15000} />
      <FloatingIcon name="medkit" size={80} left="40%" delay={4000} duration={18000} />
      <FloatingIcon name="fitness" size={70} left="75%" delay={2000} duration={12000} />
      <FloatingIcon name="water" size={50} left="85%" delay={8000} duration={16000} />
      <FloatingIcon name="bandage" size={90} left="25%" delay={10000} duration={20000} />
      <FloatingIcon name="medical" size={70} left="60%" delay={6000} duration={14000} />
      
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject, // Stretches over the whole screen
    overflow: 'hidden', 
    backgroundColor: '#F8FAFC', // Matches your current app background
    zIndex: -1, // Forces the animation behind all your text and buttons
  },
});