import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ImageBackground } from 'react-native';

// CORRECT IMPORT PATH: Just one level up to the components folder
import ClinicLogo from '../components/ClinicLogo';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    // SECRET ADMIN BYPASS
    if (email === 'admin' && password === 'admin123') {
      if (Platform.OS === 'web') window.alert("Welcome, Admin!");
      else Alert.alert("Success", "Welcome, Admin!");
      
      // FIXED ROUTING: Admin goes to the unified dashboard in the tabs folder
      router.replace('/(tabs)' as any);
      return; 
    }

    if (!email || !password) {
      alert("Please enter both email and password!");
      return;
    }

    try {
      // Create the dynamic base URL just like your other files
      const BASE_URL = Platform.OS === 'web' 
        ? 'http://localhost:5000/api' 
        : 'http://10.233.96.81:5000/api'; // Added :5000 here just in case your backend needs it!

      const backendUrl = `${BASE_URL}/auth/login`;
      
      const response = await axios.post(backendUrl, {
        email: email,
        password: password
      });

      // Save the user data/token into the phone's vault
      await AsyncStorage.setItem('userInfo', JSON.stringify(response.data));
      
      // FIXED ROUTING: Patient goes to the exact same unified dashboard
      router.replace('/(tabs)' as any);
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      alert("Login Failed: " + errorMessage);
      console.log("Login Error:", error.response?.data || errorMessage);
    }
  };

  return (
    <ImageBackground 
      source={{ uri: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=2000&auto=format&fit=crop' }} 
      style={styles.backgroundImage}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Header */}
            <View style={styles.headerContainer}>
              <View style={styles.logoCircle}>
                <ClinicLogo size={80} />
              </View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to access your medical records</Text>
            </View>

          {/* Input Form */}
          <View style={styles.formContainer}>
            
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="hello@example.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
              <Text style={styles.primaryButtonText}>Sign In </Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={{ marginHorizontal: 10, color: '#94A3B8', fontSize: 12 }}>OR</Text>
              <View style={styles.divider} />
            </View>

            {/* Go to Register Button */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/register' as any)}
            >
              <Text style={styles.secondaryButtonText}>New patient? <Text style={styles.secondaryButtonHighlight}>Create an account</Text></Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(248, 250, 252, 0.85)' },
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', paddingVertical: 40 },
  
  headerContainer: { marginBottom: 40, marginTop: 20, alignItems: 'center' },
  logoCircle: { marginBottom: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 100, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 },
  title: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#475569', fontWeight: '500', textAlign: 'center' },

  formContainer: { backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: 32, borderRadius: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.1, shadowRadius: 25, elevation: 5, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.8)' },
  
  inputGroup: { marginBottom: 24 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 18, fontSize: 16, color: '#0F172A', fontWeight: '500' },
  eyeIcon: { padding: 8 },

  primaryButton: { backgroundColor: '#4F46E5', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 28 },
  divider: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },

  secondaryButton: { alignItems: 'center', paddingVertical: 12 },
  secondaryButtonText: { color: '#64748B', fontSize: 15, fontWeight: '500' },
  secondaryButtonHighlight: { color: '#4F46E5', fontWeight: '800' },
});