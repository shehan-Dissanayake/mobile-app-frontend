import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ImageBackground, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Professional background pattern
const geometricBackground = require('../../assets/images/home_bg.jpg'); // Update with your actual asset path

// --- ⚠️ MAKE SURE THIS IP ADDRESS MATCHES YOUR LAPTOP'S CURRENT WI-FI IP ---
const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:5000/api'
  : 'http://10.233.96.81:5000/api';

export default function MatureProfileScreen() {
  const router = useRouter();

  // App States
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [userId, setUserId] = useState('');

  // Local Form Data States
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    profileImage: ''
  });

  // --- ADDED: State for new password ---
  const [newPassword, setNewPassword] = useState('');

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        const storedUser = await AsyncStorage.getItem('userInfo');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          const id = parsedUser.user?.id || parsedUser.user?._id || parsedUser.id || parsedUser._id;

          // 1. Extract the token from storage
          const token = parsedUser.token || parsedUser.user?.token;
          setUserId(id);

          // 2. Create the configuration object with the Authorization header
          const config = {
            headers: {
              Authorization: `Bearer ${token}`
            }
          };

          // 3. Attach the config to your GET request!
          const response = await axios.get(`${BASE_URL}/user/${id}`, config);

          if (response.data) {
            const { name, email, phone, address, profileImage } = response.data;
            setProfileData({
              name: name || '',
              email: email || '',
              phone: phone || '',
              address: address || '',
              profileImage: profileImage || ''
            });
          }
        }
      } catch (error) {
        if (error?.response?.status !== 401) console.log("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  // --- IMAGE PICKER LOGIC ---
  const pickImage = async () => {
    // 1. Ask for permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "You need to allow access to your photos to upload a profile picture.");
      return;
    }

    // 2. Open Gallery
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      // 3. Save the base64 string to state
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setProfileData({ ...profileData, profileImage: base64Image });
    }
  };

  // --- SAVE PROFILE LOGIC ---
  const handleSaveChanges = async () => {
    if (!profileData.name || !profileData.phone) {
      if (Platform.OS === 'web') window.alert("Name and Phone Number are required.");
      else Alert.alert("Error", "Name and Phone Number are required.");
      return;
    }

    setSaveLoading(true);
    try {
      const storedUser = await AsyncStorage.getItem('userInfo');
      let token = '';

      // 1. Get the Token from storage
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        token = parsedUser.token || parsedUser.user?.token;
      }

      // 2. Attach the token to the request headers
      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      // --- ADDED: Prepare data and conditionally add password if user typed one ---
      // This approach prevents TypeScript/linting "property does not exist" errors
      const dataToSend = newPassword.trim() !== ''
        ? { ...profileData, password: newPassword }
        : { ...profileData };

      // 3. Send the data AND the config (which holds the token)
      await axios.post(`${BASE_URL}/user/update/${userId}`, dataToSend, config);

      // Update local storage so the UI updates instantly
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.user.name = profileData.name;
        parsedUser.user.profileImage = profileData.profileImage;
        await AsyncStorage.setItem('userInfo', JSON.stringify(parsedUser));
      }

      if (Platform.OS === 'web') window.alert("Profile updated successfully!");
      else Alert.alert("Success", "Profile updated successfully!");

      setIsEditing(false);
      setNewPassword(''); // Clear password field after successful save

    } catch (error) {
      console.log("Error saving profile:", error);
      if (Platform.OS === 'web') window.alert("Failed to save changes.");
      else Alert.alert("Error", "Failed to save changes.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userInfo');

    if (Platform.OS === 'web') {
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      window.location.replace('/');
    } else {
      setTimeout(() => {
        router.replace('/');
      }, 100);
    }
  };

  // --- HELPERS ---
  const renderDetailCard = (label: string, value: string) => (
    <View style={styles.detailCard}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'Not provided'}</Text>
    </View>
  );

  const renderInputBlock = (label: string, value: string, setter: (text: string) => void, placeholder: string, readOnly: boolean = false) => (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, readOnly && styles.readOnlyInput]}
        value={value}
        onChangeText={setter}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        editable={!readOnly}
        keyboardType={label === 'Phone Number' ? 'phone-pad' : 'default'}
        // --- ADDED: Auto mask text if it's a password field ---
        secureTextEntry={label.includes('Password')}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={geometricBackground}
        style={styles.backgroundImage}
        resizeMode="cover"
        imageStyle={{ opacity: 0.15 }}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => isEditing ? setIsEditing(false) : router.back()}>
              <Text style={styles.navIcon}>{isEditing ? '✕' : '←'}</Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{isEditing ? 'Edit Profile' : 'My Profile'}</Text>

            {isEditing ? (
              <TouchableOpacity onPress={handleSaveChanges} disabled={saveLoading} style={styles.saveHeaderBtn}>
                {saveLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveHeaderBtnText}>Save</Text>}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editHeaderBtn}>
                <Text style={styles.editHeaderBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#14B8A6" style={{ marginTop: 50 }} />
          ) : (
            <>
              <View style={styles.avatarSection}>
                <TouchableOpacity
                  style={styles.avatarCircle}
                  onPress={pickImage}
                  disabled={!isEditing}
                >
                  {profileData.profileImage ? (
                    <Image source={{ uri: profileData.profileImage }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>{profileData.name ? profileData.name.charAt(0).toUpperCase() : 'P'}</Text>
                  )}

                  {isEditing && (
                    <View style={styles.cameraBadge}>
                      <Ionicons name="camera" size={16} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={styles.userName}>{profileData.name || 'Patient Name'}</Text>
                <Text style={styles.userEmail}>{profileData.email}</Text>
              </View>

              {isEditing ? (
                <View style={styles.formSection}>
                  {renderInputBlock('Full Name', profileData.name, (t) => setProfileData({ ...profileData, name: t }), 'Enter your full name')}
                  {renderInputBlock('Email Address (Read Only)', profileData.email, () => { }, '', true)}
                  {renderInputBlock('Phone Number', profileData.phone, (t) => setProfileData({ ...profileData, phone: t }), 'e.g. 077 123 4567')}
                  {renderInputBlock('Home Address', profileData.address, (t) => setProfileData({ ...profileData, address: t }), 'Enter your full address')}

                  {/* --- ADDED: Password Change Fields --- */}
                  <View style={styles.divider} />
                  <Text style={styles.sectionTitle}>Account Security</Text>
                  {renderInputBlock('New Password (Optional)', newPassword, setNewPassword, 'Enter new password')}
                  {/* ----------------------------------- */}

                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges} disabled={saveLoading}>
                    {saveLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Personal Details</Text>
                  {renderDetailCard('Phone Number', profileData.phone)}
                  {renderDetailCard('Home Address', profileData.address)}

                  <View style={[styles.detailCard, { marginTop: 20 }]}>
                    <Text style={styles.detailLabel}>Email Security</Text>
                    <View style={styles.readOnlyValueBlock}>
                      <Text style={styles.lockIcon}>🔒</Text>
                      <Text style={styles.detailValueReadOnly}>{profileData.email}</Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>Log Out Account</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  backgroundImage: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1, paddingHorizontal: 24 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20, marginBottom: 20, marginTop: Platform.OS === 'android' ? 40 : 10 },

  navIcon: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  editHeaderBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E0E7FF' },
  editHeaderBtnText: { color: '#4F46E5', fontWeight: '800', fontSize: 14 },
  saveHeaderBtn: { backgroundColor: '#4F46E5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  saveHeaderBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 4, borderColor: '#FFFFFF', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 5 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 55 },
  avatarText: { fontSize: 44, fontWeight: '900', color: '#FFFFFF' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0F172A', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFFFFF' },

  userName: { fontSize: 28, fontWeight: '900', color: '#0F172A', marginBottom: 6, letterSpacing: -0.5 },
  userEmail: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#4F46E5', textTransform: 'uppercase', marginBottom: 16, marginTop: 10, letterSpacing: 0.5 },
  detailsSection: { marginBottom: 20 },
  detailCard: { backgroundColor: '#FFFFFF', paddingHorizontal: 24, paddingVertical: 20, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(226, 232, 240, 0.8)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  detailLabel: { fontSize: 13, color: '#64748B', fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 17, color: '#1E293B', fontWeight: '700' },
  readOnlyValueBlock: { flexDirection: 'row', alignItems: 'center' },
  lockIcon: { fontSize: 16, marginRight: 10 },
  detailValueReadOnly: { fontSize: 16, color: '#94A3B8', fontWeight: '600' },
  formSection: { marginBottom: 20 },
  inputBlock: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 10, marginLeft: 4, letterSpacing: 0.5 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 18, fontSize: 16, color: '#0F172A', fontWeight: '500', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  readOnlyInput: { backgroundColor: '#F8FAFC', color: '#94A3B8' },
  saveButton: { backgroundColor: '#4F46E5', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 12, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  logoutButton: { marginTop: 32, paddingVertical: 18, backgroundColor: '#FEF2F2', borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  logoutButtonText: { color: '#EF4444', fontWeight: '800', fontSize: 16 },

  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 20 }
});