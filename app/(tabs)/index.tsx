import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:5000/api'
  : 'http://10.233.96.81:5000/api';


export default function DashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // User States
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false); // 🛑 DOCTOR STATE
  const [userName, setUserName] = useState('');
  const [userId, setUserId] = useState('');

  // Data States
  const [appointments, setAppointments] = useState<any[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [activeDoctorsCount, setActiveDoctorsCount] = useState<number | string>('Active');
  const [activePatientsCount, setActivePatientsCount] = useState<number | string>('Active');

  const registerForPushNotificationsAsync = async () => {
    let token;
    if (Platform.OS === 'web') {
      console.log('Skipping push notification setup on web browser.');
      return;
    }
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
      }
      try {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: 'your-project-id'
        })).data;
        console.log("📱 MY EXPO PUSH TOKEN:", token);
      } catch (e) {
        console.log("Push token error:", e);
      }
    }
    return token;
  };

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setLoading(true);

      const fetchDashboardData = async () => {
        try {
          const storedUser = await AsyncStorage.getItem('userInfo');
          if (!storedUser) {
            if (isActive) setLoading(false);
            return;
          }

          const parsedUser = JSON.parse(storedUser);
          const id = parsedUser.user?.id || parsedUser.user?._id || parsedUser.id || parsedUser._id;

          // Safety check: force role to lowercase to avoid "Doctor" vs "doctor" issues
          const rawRole = parsedUser.user?.role || parsedUser.role || 'patient';
          const role = rawRole.toLowerCase();
          const name = parsedUser.user?.name || parsedUser.name || 'User';

          if (isActive) {
            setUserId(id);
            setIsAdmin(role === 'admin');
            setIsDoctor(role === 'doctor');
            setUserName(name);
          }

          // 1. Fetch Appointments based on role
          let appointmentsResponse;

          if (role === 'admin') {
            appointmentsResponse = await axios.get(`${BASE_URL}/appointments`);

            // Fetch doctors count
            try {
              const docRes = await axios.get(`${BASE_URL}/doctors`);
              if (isActive) setActiveDoctorsCount(docRes.data.length);
            } catch (e) {
              console.log("Error fetching doctors for count:", e);
            }

            // Fetch patients count
            try {
              const token = parsedUser.token || parsedUser.user?.token;
              const config = { headers: { Authorization: `Bearer ${token}` } };
              const userRes = await axios.get(`${BASE_URL}/user/all`, config);
              if (isActive) {
                const patients = userRes.data.filter((u: any) => u.role === 'patient');
                setActivePatientsCount(patients.length);
              }
            } catch (e) {
              console.log("Error fetching users for count:", e);
            }

          } else if (role === 'doctor') {
            appointmentsResponse = await axios.get(`${BASE_URL}/appointments/doctor/${id}`);
          } else {
            appointmentsResponse = await axios.get(`${BASE_URL}/appointments/user/${id}`);
          }

          const upcoming = appointmentsResponse.data.filter((app: any) => app.status !== 'Completed' && app.status !== 'Cancelled');
          if (isActive) setAppointments(upcoming);

          // 2. Fetch Notifications to check for unread
          const notiResponse = await axios.get(`${BASE_URL}/notifications/user/${id}`);
          const unreadExists = notiResponse.data.some((noti: any) => noti.isRead === false);
          if (isActive) setHasUnread(unreadExists);

        } catch (error) {
          console.log("Error fetching dashboard data:", error);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      fetchDashboardData();
      return () => { isActive = false; };
    }, [])
  );

  const handleNavigation = (path: any) => {
    router.push(path);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  // ================= ADMIN VIEW =================
  if (isAdmin) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.heroSection}>
            <View style={styles.heroHeaderRow}>
              <View>
                <Text style={styles.heroGreeting}>Admin Portal</Text>
                <Text style={styles.heroSubGreeting}>Welcome back, {userName}</Text>
              </View>
              <TouchableOpacity style={styles.bellIconContainer} onPress={() => handleNavigation('/notifications')}>
                <Ionicons name="notifications-outline" size={24} color="#0F172A" />
                {hasUnread && <View style={styles.bellBadge} />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Clinic Overview</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
              <View style={[styles.miniStatCard, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
                <View style={styles.statIconBox}><MaterialCommunityIcons name="calendar-month" size={24} color="#4F46E5" /></View>
                <Text style={styles.miniStatNumber}>{appointments.length}</Text>
                <Text style={styles.miniStatLabel}>Upcoming Apps</Text>
              </View>
              <View style={[styles.miniStatCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <View style={[styles.statIconBox, { backgroundColor: '#D1FAE5' }]}><MaterialCommunityIcons name="doctor" size={24} color="#059669" /></View>
                <Text style={[styles.miniStatNumber, { color: '#059669' }]}>{activeDoctorsCount}</Text>
                <Text style={styles.miniStatLabel}>Doctors</Text>
              </View>
              <View style={[styles.miniStatCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <View style={[styles.statIconBox, { backgroundColor: '#FEE2E2' }]}><MaterialCommunityIcons name="account-group" size={24} color="#DC2626" /></View>
                <Text style={[styles.miniStatNumber, { color: '#DC2626' }]}>{activePatientsCount}</Text>
                <Text style={styles.miniStatLabel}>Patients</Text>
              </View>
            </ScrollView>

            <Text style={styles.sectionTitle}>Management Actions</Text>
            <View style={styles.adminGrid}>
              <TouchableOpacity style={styles.adminGridCard} onPress={() => handleNavigation('/doctors')}>
                <View style={styles.adminIconWrapper}><MaterialCommunityIcons name="doctor" size={28} color="#4F46E5" /></View>
                <Text style={styles.adminGridText}>Doctors</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adminGridCard} onPress={() => handleNavigation('/medical-records')}>
                <View style={styles.adminIconWrapper}><MaterialCommunityIcons name="folder-account-outline" size={28} color="#059669" /></View>
                <Text style={styles.adminGridText}>Records</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adminGridCard} onPress={() => handleNavigation('/appointments')}>
                <View style={styles.adminIconWrapper}><MaterialCommunityIcons name="calendar-month-outline" size={28} color="#D97706" /></View>
                <Text style={styles.adminGridText}>Appts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adminGridCard} onPress={() => handleNavigation('/users')}>
                <View style={styles.adminIconWrapper}><MaterialCommunityIcons name="account-group-outline" size={28} color="#DC2626" /></View>
                <Text style={styles.adminGridText}>Users</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adminGridCard} onPress={() => handleNavigation('/payments')}>
                <View style={styles.adminIconWrapper}><MaterialCommunityIcons name="credit-card-outline" size={28} color="#0EA5E9" /></View>
                <Text style={styles.adminGridText}>Payments</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adminGridCard} onPress={() => handleNavigation('/invoices')}>
                <View style={styles.adminIconWrapper}><MaterialCommunityIcons name="receipt" size={28} color="#9333EA" /></View>
                <Text style={styles.adminGridText}>Invoices</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ================= PATIENT / DOCTOR VIEW =================
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.heroSection}>
          <View style={styles.heroHeaderRow}>
            <View>
              <Text style={styles.heroGreeting}>Hello, {userName}!</Text>
              <Text style={styles.heroSubGreeting}>How are you feeling today?</Text>
            </View>
            <TouchableOpacity style={styles.bellIconContainer} onPress={() => handleNavigation('/notifications')}>
              <Ionicons name="notifications-outline" size={24} color="#0F172A" />
              {hasUnread && <View style={styles.bellBadge} />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.contentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{isDoctor ? 'Next Patient' : 'Next Appointment'}</Text>
            <TouchableOpacity onPress={() => handleNavigation('/appointments')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {appointments.length > 0 ? (
            <View style={styles.ticketCard}>
              <View style={styles.ticketColorBar} />
              <View style={styles.ticketContent}>
                <View style={styles.ticketTopRow}>
                  <View style={styles.doctorInfoRow}>
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitials}>{isDoctor ? 'P' : 'D'}</Text>
                    </View>
                    <View>
                      <Text style={styles.ticketDoctorName}>
                        {isDoctor ? 'Patient Booking' : `Dr. ${appointments[0].doctorName}`}
                      </Text>
                      <Text style={styles.ticketSpecialty}>
                        {isDoctor ? 'General Consultation' : appointments[0].specialty}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.statusBadgeSmall}>
                    <Text style={styles.statusTextSmall}>{appointments[0].status || 'Scheduled'}</Text>
                  </View>
                </View>

                <View style={styles.ticketDivider} />

                <View style={styles.ticketBottomRow}>
                  <View style={styles.timeBlock}>
                    <Ionicons name="calendar-outline" size={16} color="#64748B" />
                    <Text style={styles.timeBlockText}>{appointments[0].date}</Text>
                  </View>
                  <View style={styles.timeBlock}>
                    <Ionicons name="time-outline" size={16} color="#64748B" />
                    <Text style={styles.timeBlockText}>{appointments[0].time}</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCardContainer}>
              <View style={styles.emptyCardIconBox}>
                <Ionicons name="calendar-clear-outline" size={32} color="#94A3B8" />
              </View>
              <Text style={styles.emptyCardTitle}>No Upcoming Appointments</Text>
              <Text style={styles.emptyCardText}>Your schedule is clear right now.</Text>
              {!isDoctor && (
                <TouchableOpacity style={styles.emptyCardButton} onPress={() => handleNavigation('/doctors')}>
                  <Text style={styles.emptyCardButtonText}>Find a Doctor</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Quick Services</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickServicesScroll}>
            <TouchableOpacity style={styles.quickServiceCard} onPress={() => handleNavigation('/doctors')}>
              <View style={[styles.quickServiceIconBox, { backgroundColor: '#EEF2FF' }]}><MaterialCommunityIcons name="stethoscope" size={28} color="#4F46E5" /></View>
              <Text style={styles.quickServiceText}>Find Doctor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickServiceCard} onPress={() => handleNavigation('/medical-records')}>
              <View style={[styles.quickServiceIconBox, { backgroundColor: '#ECFDF5' }]}><MaterialCommunityIcons name="folder-account-outline" size={28} color="#059669" /></View>
              <Text style={styles.quickServiceText}>My Records</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickServiceCard} onPress={() => handleNavigation('/prescriptions')}>
              <View style={[styles.quickServiceIconBox, { backgroundColor: '#FEF2F2' }]}><MaterialCommunityIcons name="pill" size={28} color="#DC2626" /></View>
              <Text style={styles.quickServiceText}>Prescriptions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickServiceCard} onPress={() => handleNavigation('/payments')}>
              <View style={[styles.quickServiceIconBox, { backgroundColor: '#FFFBEB' }]}><MaterialCommunityIcons name="credit-card-outline" size={28} color="#D97706" /></View>
              <Text style={styles.quickServiceText}>Payments</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickServiceCard} onPress={() => handleNavigation('/invoices')}>
              <View style={[styles.quickServiceIconBox, { backgroundColor: '#F3E8FF' }]}><MaterialCommunityIcons name="receipt" size={28} color="#9333EA" /></View>
              <Text style={styles.quickServiceText}>My Bills</Text>
            </TouchableOpacity>
          </ScrollView>

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Specialties</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickServicesScroll}>
            {[
              { name: 'Cardiologist', icon: 'heart-pulse', color: '#EF4444', bg: '#FEE2E2' },
              { name: 'Neurologist', icon: 'brain', color: '#6366F1', bg: '#E0E7FF' },
              { name: 'Dermatologist', icon: 'magnify', color: '#EAB308', bg: '#FEF08A' },
              { name: 'Pediatrician', icon: 'baby-carriage', color: '#10B981', bg: '#D1FAE5' },
              { name: 'Dentist', icon: 'tooth-outline', color: '#0EA5E9', bg: '#E0F2FE' },
              { name: 'Psychiatrist', icon: 'head-lightbulb-outline', color: '#D946EF', bg: '#FAE8FF' },
            ].map((specialty, index) => (
              <TouchableOpacity
                key={index}
                style={styles.specialtyCard}
                onPress={() => router.push({ pathname: '/doctors', params: { specialty: specialty.name } })}
              >
                <View style={[styles.specialtyIconBox, { backgroundColor: specialty.bg }]}>
                  <MaterialCommunityIcons name={specialty.icon as any} size={32} color={specialty.color} />
                </View>
                <Text style={styles.specialtyText}>{specialty.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  scrollContent: { paddingBottom: 100 },

  heroSection: { backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 50 : 20, paddingBottom: 40, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  heroHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroGreeting: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginBottom: 4, letterSpacing: -0.5 },
  heroSubGreeting: { fontSize: 15, color: '#C7D2FE', fontWeight: '500' },
  bellIconContainer: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  bellBadge: { position: 'absolute', top: 10, right: 12, width: 10, height: 10, backgroundColor: '#EF4444', borderRadius: 5, borderWidth: 2, borderColor: '#FFFFFF' },

  contentSection: { paddingHorizontal: 24, marginTop: -20 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16, marginTop: 10, letterSpacing: -0.5 },
  seeAllText: { fontSize: 14, color: '#4F46E5', fontWeight: '700' },

  // Patient Ticket Style Card
  ticketCard: { backgroundColor: '#FFFFFF', borderRadius: 20, marginBottom: 24, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  ticketColorBar: { width: 8, backgroundColor: '#4F46E5' },
  ticketContent: { flex: 1, padding: 20 },
  ticketTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  doctorInfoRow: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarInitials: { fontSize: 18, fontWeight: '800', color: '#4F46E5' },
  ticketDoctorName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  ticketSpecialty: { fontSize: 13, color: '#64748B', marginTop: 2, fontWeight: '500' },
  statusBadgeSmall: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusTextSmall: { color: '#059669', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  ticketDivider: { height: 1, backgroundColor: '#F1F5F9', borderStyle: 'dashed', marginVertical: 16 },
  ticketBottomRow: { flexDirection: 'row', gap: 20 },
  timeBlock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeBlockText: { fontSize: 14, color: '#334155', fontWeight: '600' },

  // Empty State Card
  emptyCardContainer: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, alignItems: 'center', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.03, shadowRadius: 15, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  emptyCardIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyCardTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  emptyCardText: { color: '#64748B', fontSize: 14, marginBottom: 20, textAlign: 'center' },
  emptyCardButton: { backgroundColor: '#4F46E5', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  emptyCardButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  // Quick Services Horizontal Scroll
  quickServicesScroll: { gap: 16, paddingRight: 24 },
  quickServiceCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, alignItems: 'center', width: 100, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  quickServiceIconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  quickServiceEmoji: { fontSize: 24 },
  quickServiceText: { fontSize: 12, fontWeight: '700', color: '#334155', textAlign: 'center' },

  // Admin View
  statsScroll: { gap: 16, paddingRight: 24, marginBottom: 24 },
  miniStatCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, width: 140, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  statIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  statEmoji: { fontSize: 20 },
  miniStatNumber: { fontSize: 28, fontWeight: '900', color: '#4F46E5', marginBottom: 4, letterSpacing: -1 },
  miniStatLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },

  adminGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  adminGridCard: { width: '47%', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 4 },
  adminIconWrapper: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  adminGridIcon: { fontSize: 26 },
  adminGridText: { fontSize: 14, fontWeight: '700', color: '#1E293B', textAlign: 'center' },

  // Specialties
  specialtyCard: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 20, alignItems: 'center', width: 90, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  specialtyIconBox: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  specialtyEmoji: { fontSize: 28 },
  specialtyText: { fontSize: 12, fontWeight: '700', color: '#334155', textAlign: 'center' },
});