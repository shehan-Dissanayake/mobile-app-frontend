import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// --- CHANGE THIS IF YOU ARE ON ANDROID EMULATOR TO 'http://10.0.2.2:5000/api' ---
const BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:5000/api' 
  : 'http://192.168.1.45/api';

export default function DoctorsScreen() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Role & User States
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState('');

  // Modals States
  const [doctorModalVisible, setDoctorModalVisible] = useState(false);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

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
    setBookDate('');
    setBookTime('');
    setWebTimeStr(''); // Reset the web time input display
    setDateObj(new Date()); 
    setBookingModalVisible(true);
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
        <Text style={styles.pageTitle}>{isAdmin ? 'Manage Doctors' : 'Find a Doctor'}</Text>
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
          doctors.map((doctor, index) => {
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
                  <TouchableOpacity style={styles.bookButton} onPress={() => openBookingModal(doctor)}>
                    <Text style={styles.bookButtonText}>Book Appointment</Text>
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
            
