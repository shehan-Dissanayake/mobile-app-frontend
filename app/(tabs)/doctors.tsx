import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- CHANGE THIS IF YOU ARE ON ANDROID EMULATOR TO 'http://10.0.2.2:5000/api' ---
const BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:5000/api' 
  : 'http://10.233.96.81:5000/api';

export default function DoctorsScreen() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Role & User States
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState('');

  // Modals States
  const [doctorModalVisible, setDoctorModalVisible] = useState(false);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Router
  const { specialty } = useLocalSearchParams();
  const router = useRouter();

  // Form States - For Admin adding/editing doctors
  const [editDocId, setEditDocId] = useState('');
  const [docName, setDocName] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('');
  const [docFee, setDocFee] = useState('');

  // Form States - For Users booking appointments
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');

  // NEW Form States - For Date & Time Pickers
  const [dateObj, setDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Dedicated state to fix Web Time Picker display bug
  const [webTimeStr, setWebTimeStr] = useState('');

  // 1. Fetch User Role & Doctors on Load
  useEffect(() => {
    let isActive = true;
    const initializeData = async () => {
      try {
        // Get Role
        const storedUser = await AsyncStorage.getItem('userInfo');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          const id = parsedUser.user?.id || parsedUser.user?._id || parsedUser.id || parsedUser._id;
          const role = parsedUser.user?.role || parsedUser.role || 'patient';
          
          setUserId(id);
          setIsAdmin(role === 'admin');
        }

        // Fetch Doctors List
        const response = await axios.get(`${BASE_URL}/doctors`);
        if (isActive) setDoctors(response.data);
      } catch (error) {
        console.log("Error fetching data:", error);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    initializeData();
    return () => { isActive = false; };
  }, []);

  // ================= ADMIN FUNCTIONS =================

  const openAdminModal = (doctor: any = null) => {
    if (doctor) {
      setEditDocId(doctor._id || doctor.id);
      setDocName(doctor.name || '');
      setDocSpecialty(doctor.specialty || '');
      setDocFee(doctor.fee ? doctor.fee.toString() : '');
    } else {
      setEditDocId('');
      setDocName('');
      setDocSpecialty('');
      setDocFee('');
    }
    setDoctorModalVisible(true);
  };

  const handleSaveDoctor = async () => {
    if (!docName || !docSpecialty) return alert("Name and Specialty are required.");

    try {
      if (editDocId) {
        // UPDATE Existing Doctor
        await axios.put(`${BASE_URL}/doctors/${editDocId}`, {
          name: docName,
          specialty: docSpecialty,
          fee: docFee
        });
        setDoctors(prev => prev.map(doc => doc._id === editDocId || doc.id === editDocId ? { ...doc, name: docName, specialty: docSpecialty, fee: docFee } : doc));
      } else {
        // ADD New Doctor
        const response = await axios.post(`${BASE_URL}/doctors`, {
          name: docName,
          specialty: docSpecialty,
          fee: docFee
        });
        setDoctors(prev => [...prev, response.data]);
      }
      setDoctorModalVisible(false);
    } catch (error: any) {
      console.log("Error saving doctor:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      alert(`Failed to save doctor: ${errorMessage}`);
    }
  };

  const handleDeleteDoctor = async (id: string, name: string) => {
    const executeDelete = async () => {
      try {
        await axios.delete(`${BASE_URL}/doctors/${id}`);
        setDoctors(prev => prev.filter(doc => doc._id !== id && doc.id !== id));
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
        alert(`Failed to delete doctor: ${errorMessage}`);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete ${name}?`)) executeDelete();
    } else {
      Alert.alert("Delete", `Remove ${name} from the system?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: executeDelete }
      ]);
    }
  };

  // ================= PATIENT FUNCTIONS =================

  const openBookingModal = (doctor: any) => {
    setSelectedDoctor(doctor);
    setProfileModalVisible(false); // Close profile if open
    setBookDate('');
    setBookTime('');
    setWebTimeStr(''); // Reset the web time input display
    setDateObj(new Date()); 
    setBookingModalVisible(true);
  };

  const openProfileModal = (doctor: any) => {
    setSelectedDoctor(doctor);
    setProfileModalVisible(true);
  };

  const handleBookAppointment = async () => {
    if (!bookDate || !bookTime) return alert("Please select a date and time.");

    try {
      await axios.post(`${BASE_URL}/appointments/book`, {
        userId: userId,
        doctorId: selectedDoctor._id || selectedDoctor.id,
        doctorName: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        date: bookDate,
        time: bookTime,
        status: 'Pending'
      });

      setBookingModalVisible(false);
      
      if (Platform.OS === 'web') window.alert("Appointment Booked Successfully!");
      else Alert.alert("Success", "Appointment Booked Successfully!");
    } catch (error: any) {
      console.log("FULL ERROR DETAILS:", error.response?.data || error.message);
      
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message;
      
      if (Platform.OS === 'web') window.alert(`Booking Failed: ${errorMessage}`);
      else Alert.alert("Booking Failed", errorMessage);
    }
  };

  // ================= TIMEZONE-SAFE PICKER HANDLERS =================

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateObj(selectedDate);
      
      // Build the YYYY-MM-DD string locally
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      
      setBookDate(`${year}-${month}-${day}`);
    }
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateObj(selectedDate);
      
      // Extract local time correctly
      let hours = selectedDate.getHours();
      let minutes = selectedDate.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; 
      const strMinutes = minutes < 10 ? '0' + minutes : minutes;
      
      setBookTime(`${hours}:${strMinutes} ${ampm}`);
    }
  };

  // ================= RENDER =================

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {specialty && (
            <TouchableOpacity onPress={() => router.push('/doctors')} style={{ marginRight: 10 }}>
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>
          )}
          <Text style={styles.pageTitle}>
            {isAdmin ? 'Manage Doctors' : (specialty ? `${specialty}s` : 'Find a Doctor')}
          </Text>
        </View>
        {isAdmin && (
          <TouchableOpacity style={styles.addButton} onPress={() => openAdminModal(null)}>
            <Text style={styles.addButtonText}>+ Add Doctor</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* DOCTORS LIST */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} />
        ) : doctors.length === 0 ? (
          <Text style={styles.emptyText}>No doctors found in the system.</Text>
        ) : (
          doctors
            .filter((doctor) => !specialty || doctor.specialty?.toLowerCase() === (specialty as string).toLowerCase())
            .map((doctor, index) => {
            const docId = doctor._id || doctor.id || index.toString();
            return (
              <View key={docId} style={styles.card}>
                <View style={styles.headerRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{doctor.name ? doctor.name.charAt(0).toUpperCase() : 'D'}</Text>
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{doctor.name}</Text>
                    <Text style={styles.specialty}>{doctor.specialty}</Text>
                    <Text style={styles.fee}>Fee: <Text style={styles.feeAmount}>{doctor.fee || 'N/A'}</Text></Text>
                  </View>
                </View>

                {/* CONDITIONAL BUTTONS BASED ON ROLE */}
                {isAdmin ? (
                  <View style={styles.adminActionRow}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openAdminModal(doctor)}>
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteDoctor(docId, doctor.name)}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.bookButton} onPress={() => openProfileModal(doctor)}>
                    <Text style={styles.bookButtonText}>View Profile</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
        <View style={{height: 40}}/>
      </ScrollView>

      {/* ADMIN MODAL: Add/Edit Doctor */}
      <Modal animationType="slide" transparent={true} visible={doctorModalVisible} onRequestClose={() => setDoctorModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{editDocId ? 'Edit Doctor' : 'Add New Doctor'}</Text>
            
            <TextInput style={styles.input} placeholder="Doctor Name" value={docName} onChangeText={setDocName} />
            <TextInput style={styles.input} placeholder="Specialty (e.g. Cardiologist)" value={docSpecialty} onChangeText={setDocSpecialty} />
            <TextInput style={styles.input} placeholder="Consultation Fee (e.g. Rs. 2500)" value={docFee} onChangeText={setDocFee} />

            <TouchableOpacity style={styles.primaryModalBtn} onPress={handleSaveDoctor}>
              <Text style={styles.primaryModalBtnText}>Save Doctor</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryModalBtn} onPress={() => setDoctorModalVisible(false)}>
              <Text style={styles.secondaryModalBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PATIENT MODAL: Doctor Profile */}
      <Modal animationType="slide" transparent={true} visible={profileModalVisible} onRequestClose={() => setProfileModalVisible(false)}>
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModalView}>
            <TouchableOpacity style={styles.closeProfileBtn} onPress={() => setProfileModalVisible(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
            
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>{selectedDoctor?.name ? selectedDoctor.name.charAt(0).toUpperCase() : 'D'}</Text>
              </View>
              <Text style={styles.profileName}>{selectedDoctor?.name}</Text>
              <Text style={styles.profileSpecialty}>{selectedDoctor?.specialty}</Text>
            </View>
            
            <View style={styles.profileDetailsCard}>
              <View style={styles.profileDetailRow}>
                <View style={styles.profileDetailIconBox}>
                  <Ionicons name="star" size={20} color="#F59E0B" />
                </View>
                <View>
                  <Text style={styles.profileDetailLabel}>Rating</Text>
                  <Text style={styles.profileDetailValue}>4.9 (120+ Reviews)</Text>
                </View>
              </View>
              
              <View style={styles.profileDivider} />
              
              <View style={styles.profileDetailRow}>
                <View style={[styles.profileDetailIconBox, {backgroundColor: '#ECFDF5'}]}>
                  <Ionicons name="cash-outline" size={20} color="#10B981" />
                </View>
                <View>
                  <Text style={styles.profileDetailLabel}>Consultation Fee</Text>
                  <Text style={[styles.profileDetailValue, {color: '#10B981'}]}>
                    ${selectedDoctor?.fee ? selectedDoctor.fee.toString().replace(/[^0-9.]/g, '') : '0'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.profileDivider} />
              
              <View style={styles.profileDetailRow}>
                <View style={[styles.profileDetailIconBox, {backgroundColor: '#EEF2FF'}]}>
                  <Ionicons name="time-outline" size={20} color="#4F46E5" />
                </View>
                <View>
                  <Text style={styles.profileDetailLabel}>Availability</Text>
                  <Text style={styles.profileDetailValue}>Mon - Fri, 09:00 AM - 05:00 PM</Text>
                </View>
              </View>
            </View>

            <View style={styles.profileAboutSection}>
              <Text style={styles.profileAboutTitle}>About Doctor</Text>
              <Text style={styles.profileAboutText}>
                {selectedDoctor?.name} is a highly experienced {selectedDoctor?.specialty} dedicated to providing the best care.
                Known for professional excellence and a compassionate approach to patient well-being.
              </Text>
            </View>

            <TouchableOpacity style={styles.bookNowActionBtn} onPress={() => openBookingModal(selectedDoctor)}>
              <Text style={styles.bookNowActionBtnText}>Book Appointment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PATIENT MODAL: Book Appointment */}
      <Modal animationType="slide" transparent={true} visible={bookingModalVisible} onRequestClose={() => setBookingModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Book with {selectedDoctor?.name}</Text>
            
            {/* DATE SELECTION */}
            <Text style={styles.label}>Select Date</Text>
            {Platform.OS === 'web' ? (
              // Web native date picker fallback
              <input 
                type="date" 
                style={{ 
                  backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', 
                  borderRadius: 12, padding: 16, fontSize: 16, color: '#1E293B', 
                  marginBottom: 16, width: '100%', boxSizing: 'border-box' 
                }}
                value={bookDate}
                onChange={(e) => setBookDate(e.target.value)} 
              />
            ) : (
              // Mobile DatePicker
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: bookDate ? '#1E293B' : '#94A3B8' }}>
                  {bookDate ? bookDate : 'Tap to select a date'}
                </Text>
              </TouchableOpacity>
            )}

            {showDatePicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={dateObj}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()} 
              />
            )}
            
            {/* TIME SELECTION */}
            <Text style={styles.label}>Select Time</Text>
            {Platform.OS === 'web' ? (
              // Web native time picker fallback
              <input 
                type="time" 
                style={{ 
                  backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', 
                  borderRadius: 12, padding: 16, fontSize: 16, color: '#1E293B', 
                  marginBottom: 16, width: '100%', boxSizing: 'border-box' 
                }}
                value={webTimeStr} // THE FIX: Uses strict 24hr string to keep UI visible
                onChange={(e) => {
                  const timeVal = e.target.value;
                  setWebTimeStr(timeVal); // Keeps the input box visually populated
                  
                  if(timeVal) {
                    let [hours, minutes] = timeVal.split(':');
                    let h = parseInt(hours);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    h = h % 12;
                    h = h ? h : 12; 
                    setBookTime(`${h}:${minutes} ${ampm}`); // Still saves correct 12hr string for backend!
                  }
                }} 
              />
            ) : (
              // Mobile TimePicker
              <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)}>
                <Text style={{ color: bookTime ? '#1E293B' : '#94A3B8' }}>
                  {bookTime ? bookTime : 'Tap to select a time'}
                </Text>
              </TouchableOpacity>
            )}

            {showTimePicker && Platform.OS !== 'web' && (
              <DateTimePicker
                value={dateObj}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            )}

            <TouchableOpacity style={styles.primaryModalBtn} onPress={handleBookAppointment}>
              <Text style={styles.primaryModalBtnText}>Confirm Booking</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryModalBtn} onPress={() => setBookingModalVisible(false)}>
              <Text style={styles.secondaryModalBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 16 },
  pageTitle: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  addButton: { backgroundColor: '#4F46E5', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  addButtonText: { color: 'white', fontWeight: '800', fontSize: 14 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  emptyText: { textAlign: 'center', color: '#64748B', marginTop: 40, fontSize: 16, fontWeight: '500' },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 4, borderWidth: 1, borderColor: 'rgba(226, 232, 240, 0.8)' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 18, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  avatarText: { fontSize: 26, fontWeight: '900', color: '#4F46E5' },
  info: { flex: 1 },
  name: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
  specialty: { fontSize: 15, color: '#64748B', marginBottom: 8, fontWeight: '500' },
  fee: { fontSize: 14, color: '#10B981', fontWeight: '700', backgroundColor: '#ECFDF5', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, overflow: 'hidden' },
  feeAmount: { fontWeight: '800' },
  
  bookButton: { backgroundColor: '#4F46E5', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  bookButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
  
  adminActionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  editBtn: { flex: 1, backgroundColor: '#EEF2FF', paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#C7D2FE' },
  editBtnText: { color: '#4F46E5', fontWeight: '800', fontSize: 14 },
  deleteBtn: { flex: 1, backgroundColor: '#FEF2F2', paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  deleteBtnText: { color: '#EF4444', fontWeight: '800', fontSize: 14 },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: 20 },
  modalView: { width: '100%', backgroundColor: 'white', borderRadius: 28, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 24, textAlign: 'center' },
  label: { fontSize: 12, fontWeight: '800', color: '#64748B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 18, fontSize: 16, color: '#1E293B', marginBottom: 20, fontWeight: '500' },
  primaryModalBtn: { backgroundColor: '#4F46E5', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  primaryModalBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
  secondaryModalBtn: { backgroundColor: '#F1F5F9', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  secondaryModalBtnText: { color: '#475569', fontWeight: '800', fontSize: 16 },
  
  // Profile Modal Styles
  profileModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  profileModalView: { backgroundColor: '#F8FAFC', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingTop: 32, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20, maxHeight: '90%' },
  closeProfileBtn: { position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  profileAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6, borderWidth: 4, borderColor: '#FFFFFF' },
  profileAvatarText: { fontSize: 40, fontWeight: '900', color: '#4F46E5' },
  profileName: { fontSize: 24, fontWeight: '900', color: '#0F172A', marginBottom: 4 },
  profileSpecialty: { fontSize: 16, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  profileDetailsCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  profileDetailRow: { flexDirection: 'row', alignItems: 'center' },
  profileDetailIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  profileDetailLabel: { fontSize: 13, color: '#64748B', fontWeight: '500', marginBottom: 2 },
  profileDetailValue: { fontSize: 16, color: '#1E293B', fontWeight: '800' },
  profileDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  
  profileAboutSection: { marginBottom: 32 },
  profileAboutTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  profileAboutText: { fontSize: 15, color: '#475569', lineHeight: 24, fontWeight: '400' },
  
  bookNowActionBtn: { backgroundColor: '#4F46E5', paddingVertical: 18, borderRadius: 20, alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  bookNowActionBtnText: { color: 'white', fontWeight: '800', fontSize: 18, letterSpacing: 0.5 },
});