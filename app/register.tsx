import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// --- CHANGE THIS IF YOU ARE ON ANDROID EMULATOR TO 'http://10.0.2.2:5000/api' ---
const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:5000/api'
  : 'http://10.233.96.81/api';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    // Basic validation before hitting the server
    if (!name || !email || !password) {
      if (Platform.OS === 'web') window.alert("Please fill in all fields.");
      else Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    try {
      // Send the data to your Node.js backend
      const response = await axios.post(`${BASE_URL}/auth/register`, {
        name,
        email,
        password,
      });

      console.log("Registration Success:", response.data);

      if (Platform.OS === 'web') window.alert("Account created successfully!");
      else Alert.alert("Success", "Account created successfully!");

      // Navigate back to the Login screen after success
      router.replace('/');

    } catch (error) {
      // 1. Check if the error came specifically from our Axios network request
      if (axios.isAxiosError(error)) {
        console.error("Registration Error:", error.response?.data || error.message);

        const errorMessage = error.response?.data?.message || "Failed to create account. Please try again.";

        if (Platform.OS === 'web') window.alert(errorMessage);
        else Alert.alert("Registration Failed", errorMessage);
      }
      // 2. Handle any other unexpected app errors
      else {
        console.error("Unexpected Error:", error);

        if (Platform.OS === 'web') window.alert("An unexpected error occurred.");
        else Alert.alert("Error", "An unexpected error occurred.");
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join our clinic portal today</Text>
          </View>

          <View style={styles.formContainer}>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Your Name"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

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

            <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
              <Text style={styles.primaryButtonText}>Sign Up</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
            </View>

            {/* Perfected routing for going back to login */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.secondaryButtonText}>Already have an account? <Text style={styles.secondaryButtonHighlight}>Sign In</Text></Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', paddingVertical: 40 },
  headerContainer: { marginBottom: 40, marginTop: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  title: { fontSize: 30, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  formContainer: { backgroundColor: '#FFFFFF', padding: 28, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 3 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#0F172A', fontWeight: '500' },
  eyeIcon: { padding: 8 },
  primaryButton: { backgroundColor: '#4F46E5', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  secondaryButton: { alignItems: 'center', paddingVertical: 12 },
  secondaryButtonText: { color: '#64748B', fontSize: 15, fontWeight: '500' },
  secondaryButtonHighlight: { color: '#4F46E5', fontWeight: '800' },
});