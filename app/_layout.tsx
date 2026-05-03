import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { PanResponder, Platform, View } from 'react-native';
import 'react-native-reanimated';

// --- IMPORT OUR NEW SMART WRAPPER ---
import StripeWrapper from '../components/StripeWrapper';

export const unstable_settings = {
  initialRouteName: 'index', 
};

// --- SET YOUR TIMEOUT HERE (in minutes) ---
const TIMEOUT_MINUTES = 15; 
const TIMEOUT_MS = TIMEOUT_MINUTES * 60 * 1000;

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments(); 
  const rootNavigationState = useRootNavigationState();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- THE ROUTE GUARD (THE BOUNCER) ---
  useEffect(() => {
    if (!rootNavigationState?.key) return; // Wait until navigation is fully awake

    const checkAuth = async () => {
      try {
        const userInfoString = await AsyncStorage.getItem('userInfo');
        const currentSegment = segments[0] as string | undefined;

        const tryingToAccessProtectedArea = currentSegment === '(tabs)';
        const tryingToAccessLoginOrRegister = currentSegment === 'index' || currentSegment === 'register' || !currentSegment;

        // SCENARIO 1: Nobody is logged in
        if (!userInfoString) {
          if (tryingToAccessProtectedArea) {
            console.log("Guard: Unauthorized access attempt. Redirecting to Login.");
            router.replace('/' as any);
          }
          return; 
        }

        // SCENARIO 2: Someone IS logged in
        // Prevent logged-in users from seeing the login screen again
        if (tryingToAccessLoginOrRegister) {
          // EVERYONE goes to the unified tabs now!
          router.replace('/(tabs)' as any);
          return;
        }

        // Removed the old strict role checks that were crashing the Admins!

      } catch (error) {
        console.error("Auth routing error:", error);
      }
    };

    checkAuth();
  }, [segments, rootNavigationState?.key]); 


  // --- THE SECURE LOGOUT FUNCTION ---
  const handleLogout = async () => {
    console.log("Session expired due to inactivity. Logging out...");
    
    // 1. Clear Mobile Storage (AsyncStorage)
    await AsyncStorage.removeItem('userInfo');
    
    // 2. Clear Web Cookies (If testing on browser)
    if (Platform.OS === 'web') {
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    }

    // 3. Kick user back to the Login screen
    router.replace('/' as any);
  };

  // --- TIMER RESET LOGIC ---
  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      handleLogout();
    }, TIMEOUT_MS);
  };

  // --- INVISIBLE TOUCH DETECTOR ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        resetTimer();
        return false; 
      },
      onPanResponderTerminationRequest: () => true,
      onShouldBlockNativeResponder: () => false,
    })
  ).current;

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StripeWrapper>
        <View style={{ flex: 1 }} {...panResponder.panHandlers}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
          </Stack>
        </View>
      </StripeWrapper>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}