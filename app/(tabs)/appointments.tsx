import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:5000/api' 
  : 'http://10.233.96.81:5000/api';

export default function AppointmentsScreen() {
  const router = useRouter();
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Upcoming');
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState('');
  
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [rawDateObj, setRawDateObj] = useState(new Date()); 
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [webTimeStr, setWebTimeStr] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchAppointments = async () => {
        setLoading(true);
        try {
          const storedUser = await AsyncStorage.getItem('userInfo');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            const userId = parsedUser.user?.id || parsedUser.user?._id || parsedUser.id || parsedUser._id;
            const role = parsedUser.user?.role || parsedUser.role || 'patient';
            
            setIsAdmin(role === 'admin');
            setIsDoctor(role === 'doctor');

            let backendUrl = '';
            if (role === 'admin') {
              backendUrl = `${BASE_URL}/appointments`;
            } else if (role === 'doctor') {
              backendUrl = `${BASE_URL}/appointments/doctor/${userId}`;
            } else {
              backendUrl = `${BASE_URL}/appointments/user/${userId}`;
            }

            const response = await axios.get(backendUrl);
            if (isActive) setAppointments(response.data);
          }
        } catch (error) {
          console.log("Error fetching appointments:", error);
        } finally {
          if (isActive) setLoading(false);
        }
      };
      fetchAppointments();
      return () => { isActive = false; };
    }, [])
  );

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    try {
      await axios.put(`${BASE_URL}/appointments/${appointmentId}/status`, { status: newStatus });
      
      setAppointments(prev => prev.map((appt: any) => 
        appt._id === appointmentId ? { ...appt, status: newStatus } : appt
      ));

      if (Platform.OS === 'web') window.alert(`Appointment marked as ${newStatus}`);
      else Alert.alert("Success", `Appointment marked as ${newStatus}`);
    } catch (error) {
      console.log("Error updating status:", error);
      if (Platform.OS === 'web') window.alert("Failed to update status.");
      else Alert.alert("Error", "Failed to update status.");
    }
  };

  const handleCancelAppointment = async (appointmentId: string, doctorName: string) => {
    const executeCancellation = async () => {
      try {
        await axios.delete(`${BASE_URL}/appointments/${appointmentId}`);
        setAppointments(prev => prev.filter((appt: any) => appt._id !== appointmentId));
        
        if (Platform.OS === 'web') window.alert("Appointment has been cancelled.");
        else Alert.alert("Cancelled", "Appointment has been cancelled.");
      } catch (error: any) {
        if (Platform.OS === 'web') window.alert("Error: Could not cancel.");
        else Alert.alert("Error", "Could not cancel.");
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to cancel the appointment with ${doctorName}?`)) executeCancellation();
    } else {
      Alert.alert("Cancel", `Cancel appointment with ${doctorName}?`, [
        { text: "No", style: "cancel" },
        { text: "Yes", style: "destructive", onPress: executeCancellation }
      ]);
    }
  };

  // 🛑 NEW FUNCTION: Dedicated to deleting PAST records so the prompt makes sense
  const handleDeletePastRecord = async (appointmentId: string) => {
    const executeDelete = async () => {
      try {
        await axios.delete(`${BASE_URL}/appointments/${appointmentId}`);
        setAppointments(prev => prev.filter((appt: any) => appt._id !== appointmentId));
        
        if (Platform.OS === 'web') window.alert("Record deleted successfully.");
        else Alert.alert("Deleted", "Record deleted successfully.");
      } catch (error: any) {
        if (Platform.OS === 'web') window.alert("Error: Could not delete record.");
        else Alert.alert("Error", "Could not delete record.");
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to permanently delete this past record?`)) executeDelete();
    } else {
      Alert.alert("Delete Record", `Permanently delete this past record?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: executeDelete }
      ]);
    }
  };

  // 🛑 NEW FUNCTION: Navigate to Prescriptions with autofill data
  const handleCreatePrescription = (appt: any) => {
    // We pass the patient ID and Name through the router parameters
    router.push({
      pathname: '/prescriptions',
      params: { 
        autoFillPatientId: appt.userId || appt.user || '', // Ensure your backend returns the user's ID here!
        autoFillPatientName: appt.userName || appt.patientName || 'Patient' 
      }
    });
  };

  const openRescheduleModal = (appt: any) => {
    setSelectedApptId(appt._id);
    setNewDate(appt.date);
    setNewTime(appt.time);
    setWebTimeStr(''); 
    setRawDateObj(new Date()); 
    setModalVisible(true);
  };

  const handleSaveReschedule = async () => {
    if (!newDate || !newTime) {
      if (Platform.OS === 'web') window.alert("Please select a date and time!");
      else Alert.alert("Error", "Please select a date and time!");
      return;
    }

    try {
      await axios.put(`${BASE_URL}/appointments/${selectedApptId}`, {
        date: newDate,
        time: newTime
      });

      setAppointments(prev => prev.map((appt: any) => 
        appt._id === selectedApptId ? { ...appt, date: newDate, time: newTime } : appt
      ));

      setModalVisible(false);
      
      if (Platform.OS === 'web') window.alert("Appointment rescheduled!");
      else Alert.alert("Success", "Appointment rescheduled!");
    } catch (error) {
      console.log("Error rescheduling:", error);
      if (Platform.OS === 'web') window.alert("Failed to reschedule.");
      else Alert.alert("Error", "Failed to reschedule.");
    }
  };

  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  const filteredAppointments = appointments.filter(app => {
    const status = app.status || 'Pending';
    const appDateStr = app.date; 
    const isPastDate = appDateStr < todayStr; 

    if (activeTab === 'Upcoming') {
      return !isPastDate && ['Pending', 'Confirmed', 'Rescheduled', 'Upcoming'].includes(status);
    } else {
      return isPastDate || ['Completed', 'Cancelled'].includes(status);
    }
  });

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setRawDateObj(selectedDate);
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setNewDate(`${year}-${month}-${day}`);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setRawDateObj(selectedTime);
      let hours = selectedTime.getHours();
      let minutes = selectedTime.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strMinutes = minutes < 10 ? '0' + minutes : minutes;
      setNewTime(`${hours}:${strMinutes} ${ampm}`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {isAdmin ? 'All Bookings' : isDoctor ? 'My Patients' : 'My Bookings'}
          </Text>
          {isAdmin && <Text style={styles.adminBadgeText}>Admin Clinic View</Text>}
          {isDoctor && <Text style={styles.adminBadgeText}>Doctor Schedule View</Text>}
        </View>
        
        {!isAdmin && !isDoctor && (
          <TouchableOpacity style={styles.newBookingBtn} onPress={() => router.push('/doctors' as any)}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.newBookingBtnText}>New</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'Upcoming' && styles.activeTab]} onPress={() => setActiveTab('Upcoming')}>
          <Text style={[styles.tabText, activeTab === 'Upcoming' && styles.activeTabText]}>
            {isDoctor ? 'Doctor Appointments' : 'Upcoming'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabButton, activeTab === 'Past' && styles.activeTab]} onPress={() => setActiveTab('Past')}>
          <Text style={[styles.tabText, activeTab === 'Past' && styles.activeTabText]}>Past</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#14B8A6" style={{ marginTop: 50 }} />
        ) : filteredAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-clear-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyStateTitle}>No {activeTab} Appointments</Text>
            <Text style={styles.emptyStateSub}>There are no {activeTab.toLowerCase()} bookings at the moment.</Text>
          </View>
        ) : (
          filteredAppointments.map((appt: any) => (
            <View key={appt._id} style={styles.card}>
              
              <View style={styles.cardHeader}>
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>
                    {/* Display Patient name for doctor, Doctor name for patient */}
                    {isDoctor ? (appt.userName || appt.patientName || 'Patient Booking') : (appt.doctorName || 'Assigned Doctor')}
                  </Text>
                  <Text style={styles.specialty}>
                    {isDoctor ? 'General Consultation' : (appt.specialty || 'General Consultation')}
                  </Text>
                </View>
                <View style={[styles.badge, appt.status === 'Confirmed' ? {backgroundColor: '#D1FAE5'} : appt.status === 'Completed' ? {backgroundColor: '#DBEAFE'} : {}]}>
                  <Text style={[styles.badgeText, appt.status === 'Confirmed' ? {color: '#059669'} : appt.status === 'Completed' ? {color: '#2563EB'} : {}]}>
                    {appt.status || 'Pending'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.dateTimeContainer}>
                <View style={styles.dateTimeItem}>
                  <Text style={styles.icon}>📅</Text>
                  <Text style={styles.dateTimeText}>{appt.date}</Text>
                </View>
                <View style={styles.dateTimeItem}>
                  <Text style={styles.icon}>⏰</Text>
                  <Text style={styles.dateTimeText}>{appt.time}</Text>
                </View>
              </View>

              {/* UPCOMING TAB BUTTONS */}
              {activeTab === 'Upcoming' && (
                <View style={styles.actionButtonsRow}>
                  {(isDoctor || isAdmin) && (!appt.status || appt.status === 'Pending') && (
                    <TouchableOpacity style={styles.acceptButton} onPress={() => handleUpdateStatus(appt._id, 'Confirmed')}>
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                  )}

                  {(isDoctor || isAdmin) && appt.status === 'Confirmed' && (
                    <TouchableOpacity style={styles.completeButton} onPress={() => handleUpdateStatus(appt._id, 'Completed')}>
                      <Text style={styles.completeButtonText}>Complete</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.rescheduleButton} onPress={() => openRescheduleModal(appt)}>
                    <Text style={styles.rescheduleButtonText}>Reschedule</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelAppointment(appt._id, appt.doctorName)}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 🛑 NEW: PAST TAB BUTTONS */}
              {activeTab === 'Past' && (
                <View style={styles.actionButtonsRow}>
                  {/* Create Prescription is mainly for Doctors */}
                  {isDoctor && (
                    <TouchableOpacity style={styles.prescriptionButton} onPress={() => handleCreatePrescription(appt)}>
                      <Text style={styles.prescriptionButtonText}>Create Prescription</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.cancelButton} onPress={() => handleDeletePastRecord(appt._id)}>
                    <Text style={styles.cancelButtonText}>Delete Record</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* RESCHEDULE MODAL */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Reschedule Appointment</Text>
            
            <Text style={styles.inputLabel}>Select New Date</Text>
            {Platform.OS === 'web' ? (
              <input 
                type="date" 
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, fontSize: 16, color: '#1E293B', marginBottom: 20, width: '100%', boxSizing: 'border-box' }}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)} 
              />
            ) : (
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.pickerButtonText}>{newDate || 'Tap to select date'}</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.inputLabel}>Select New Time</Text>
            {Platform.OS === 'web' ? (
              <input 
                type="time" 
                style={{ backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, fontSize: 16, color: '#1E293B', marginBottom: 20, width: '100%', boxSizing: 'border-box' }}
                value={webTimeStr}
                onChange={(e) => {
                  const timeVal = e.target.value;
                  setWebTimeStr(timeVal);
                  if(timeVal) {
                    let [hours, minutes] = timeVal.split(':');
                    let h = parseInt(hours);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    h = h % 12;
                    h = h ? h : 12; 
                    setNewTime(`${h}:${minutes} ${ampm}`);
                  }
                }} 
              />
            ) : (
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
                <Text style={styles.pickerButtonText}>{newTime || 'Tap to select time'}</Text>
              </TouchableOpacity>
            )}

            {showDatePicker && Platform.OS !== 'web' && (
              <DateTimePicker value={rawDateObj} mode="date" display="default" onChange={onDateChange} minimumDate={new Date()} />
            )}
            {showTimePicker && Platform.OS !== 'web' && (
              <DateTimePicker value={rawDateObj} mode="time" display="default" onChange={onTimeChange} />
            )}

            <TouchableOpacity style={styles.saveModalButton} onPress={handleSaveReschedule}>
              <Text style={styles.saveModalText}>Save Changes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  backgroundImage: { flex: 1, backgroundColor: '#E0F2FE' }, 
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 15 },
  headerTitle: { fontSize: 30, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  adminBadgeText: { fontSize: 13, fontWeight: '800', color: '#4F46E5', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  newBookingBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4F46E5', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  newBookingBtnText: { color: '#FFFFFF', fontWeight: '800', marginLeft: 6, fontSize: 14 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', marginHorizontal: 20, borderRadius: 14, padding: 6, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  activeTabText: { color: '#0F172A', fontWeight: '800' },
  emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40, backgroundColor: '#FFFFFF', paddingVertical: 40, borderRadius: 24, marginHorizontal: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 2 },
  emptyStateTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 20, marginBottom: 8 },
  emptyStateSub: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 4, borderWidth: 1, borderColor: 'rgba(226, 232, 240, 0.8)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  doctorInfo: { flex: 1, paddingRight: 10 },
  doctorName: { fontSize: 19, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
  specialty: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  badge: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 18 },
  dateTimeContainer: { flexDirection: 'row', justifyContent: 'flex-start', gap: 20, marginBottom: 24, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 },
  dateTimeItem: { flexDirection: 'row', alignItems: 'center' },
  icon: { fontSize: 16, marginRight: 8 },
  dateTimeText: { fontSize: 14, fontWeight: '700', color: '#334155' },
  
  actionButtonsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  acceptButton: { flex: 1, minWidth: '45%', backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  acceptButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  completeButton: { flex: 1, minWidth: '45%', backgroundColor: '#3B82F6', paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  completeButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  rescheduleButton: { flex: 1, minWidth: '45%', backgroundColor: '#EEF2FF', paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#C7D2FE' },
  rescheduleButtonText: { color: '#4F46E5', fontSize: 14, fontWeight: '800' },
  cancelButton: { flex: 1, minWidth: '45%', backgroundColor: '#FEF2F2', paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#FECACA' },
  cancelButtonText: { color: '#EF4444', fontSize: 14, fontWeight: '800' },
  
  prescriptionButton: { flex: 1, minWidth: '45%', backgroundColor: '#8B5CF6', paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  prescriptionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: 20 },
  modalView: { width: '100%', backgroundColor: 'white', borderRadius: 28, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 24, textAlign: 'center' },
  inputLabel: { fontSize: 12, fontWeight: '800', color: '#64748B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  pickerButton: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 18, marginBottom: 24 },
  pickerButtonText: { fontSize: 16, color: '#1E293B', fontWeight: '500' },
  saveModalButton: { backgroundColor: '#4F46E5', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveModalText: { color: 'white', fontWeight: '800', fontSize: 16 },
  closeModalButton: { backgroundColor: '#F1F5F9', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  closeModalText: { color: '#475569', fontWeight: '800', fontSize: 16 },
});