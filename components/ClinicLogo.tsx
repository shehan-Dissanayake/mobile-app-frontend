import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function ClinicLogo({ size = 60 }) {
  // We use the size prop so you can make it big for the login screen, or small for headers!
  const crossWidth = size * 0.3;
  const crossLength = size * 0.8;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2.5 }]}>
      {/* The Medical Cross */}
      <View style={[styles.verticalBar, { width: crossWidth, height: crossLength, borderRadius: crossWidth / 2 }]} />
      <View style={[styles.horizontalBar, { width: crossLength, height: crossWidth, borderRadius: crossWidth / 2 }]} />
      
      {/* Subtle modern glowing center */}
      <View style={[styles.centerGlow, { width: crossWidth * 0.8, height: crossWidth * 0.8, borderRadius: crossWidth }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#EEF2FF', // Very soft indigo background
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E7FF',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  verticalBar: {
    backgroundColor: '#4F46E5', // Premium Indigo
    position: 'absolute',
  },
  horizontalBar: {
    backgroundColor: '#14B8A6', // Premium Teal
    position: 'absolute',
  },
  centerGlow: {
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    opacity: 0.9,
  }
});