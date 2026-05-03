import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function TabLayout() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  // --- ROUTE GUARD: PREVENT BACK-BUTTON GHOSTING ---
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('userInfo');
        
        if (!storedUser) {
          // If no user is found, kick them to the login screen
          router.replace('/'); 
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.replace('/');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, []);

  // Show a smooth loading spinner while verifying security
  if (isChecking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

  return (
    <Tabs 
      screenOptions={{ 
        tabBarActiveTintColor: '#14B8A6', 
        tabBarInactiveTintColor: '#94A3B8', 
        headerShown: false, 
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />

      {/* HIDE ALL OTHER SCREENS FROM THE BOTTOM BAR */}
      <Tabs.Screen name="doctors" options={{ href: null }} />
      <Tabs.Screen name="medical-records" options={{ href: null }} />
      <Tabs.Screen name="invoices" options={{ href: null }} />
      <Tabs.Screen name="payments" options={{ href: null }} />
      <Tabs.Screen name="prescriptions" options={{ href: null }} />
      <Tabs.Screen name="users" options={{ href: null }} />
      
      {/* NEWLY HIDDEN SCREENS */}
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
});