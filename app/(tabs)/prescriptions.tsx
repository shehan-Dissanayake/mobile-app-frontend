import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:5000/api' 
  : 'http://10.233.96.81:5000/api';


export default function PrescriptionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const autoFillPatientId = params.autoFillPatientId as string;

  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  
  const [isPrivileged, setIsPrivileged] = useState(false);
  const [userRole, setUserRole] = useState('patient'); 
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // 🛑 FIX: Added doctorId to the initial state
  const [formData, setFormData] = useState({ 
    userId: '', 
    doctorId: '',
    doctorName: '', 
    medications: [{ name: '', dosage: '' }], 
    instructions: '', 
    date: '',
    status: 'Pending'
  });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchData = async () => {
        setLoading(true);
        try {
          const storedUser = await AsyncStorage.getItem('userInfo');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            const uid = parsedUser.user?.id || parsedUser.user?._id || parsedUser.id || parsedUser._id;
            const role = parsedUser.user?.role || parsedUser.role || 'patient';
            
            const hasPrivileges = role === 'admin' || role === 'doctor';
            
            if (isActive) {
                setUserId(uid);
                setIsPrivileged(hasPrivileges);
                setUserRole(role);
                
                if (role === 'doctor') {
                  const name = parsedUser.user?.name || parsedUser.name || '';
                  // 🛑 FIX: Pre-fill the doctorId with the logged in user's ID
                  setFormData(prev => ({ ...prev, doctorName: name, doctorId: uid }));
                }
            }

            const backendUrl = hasPrivileges ? `${BASE_URL}/prescriptions` : `${BASE_URL}/prescriptions/user/${uid}`;
            const response = await axios.get(backendUrl);
            if (isActive) setPrescriptions(response.data);

            if (hasPrivileges) {
               try {
                 const patientsResponse = await axios.get(`${BASE_URL}/user/patients`);
                 if (isActive) setPatients(patientsResponse.data);
               } catch (patientError: any) {
                 console.error("FAILED TO FETCH PATIENTS:", patientError.message);
               }
            }
          }
        } catch (error: any) { 
          console.error("OVERALL FETCH ERROR:", error.message); 
        } finally { 
          if (isActive) setLoading(false); 
        }
      };
      fetchData();
      return () => { isActive = false; };
    }, [])
  );

  const openModal = (item: any = null, injectedUserId: string = '') => {
    if (item) {
      setIsEditing(true); 
      setCurrentId(item._id);
      
      let formattedMedications = item.medications || [];
      if (formattedMedications.length === 0 && item.medication) {
         formattedMedications = [{ name: item.medication, dosage: item.dosage || '' }];
      }
      if (formattedMedications.length === 0) {
          formattedMedications = [{ name: '', dosage: '' }];
      }

      setFormData({ 
        userId: item.userId || '', 
        doctorId: item.doctorId || '',
        doctorName: item.doctorName, 
        medications: formattedMedications, 
        instructions: item.instructions, 
        date: item.date,
        status: item.status || 'Pending'
      });
      setSelectedDate(item.date ? new Date(item.date) : new Date());
    } else {
      setIsEditing(false); 
      const today = new Date();
      setSelectedDate(today);
      setFormData(prev => ({ 
        userId: injectedUserId || '', 
        doctorId: userRole === 'doctor' ? userId : '', // 🛑 FIX: Ensure doctorId stays intact on new records
        doctorName: userRole === 'doctor' ? prev.doctorName : '', 
        medications: [{ name: '', dosage: '' }],
        instructions: '', 
        date: today.toISOString().split('T')[0],
        status: 'Pending'
      }));
    }
    setModalVisible(true);
  };

  useEffect(() => {
    if (autoFillPatientId && isPrivileged) {
      openModal(null, autoFillPatientId);
      router.setParams({ autoFillPatientId: '', autoFillPatientName: '' });
    }
  }, [autoFillPatientId, isPrivileged]);

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      setFormData({ ...formData, date: date.toISOString().split('T')[0] });
    }
  };

  const handleAddMedicine = () => {
    setFormData({ ...formData, medications: [...formData.medications, { name: '', dosage: '' }] });
  };

  const handleRemoveMedicine = (indexToRemove: number) => {
    setFormData({ ...formData, medications: formData.medications.filter((_, index) => index !== indexToRemove) });
  };

  const handleMedicineChange = (text: string, index: number, field: 'name' | 'dosage') => {
    const updatedMedications = [...formData.medications];
    updatedMedications[index][field] = text;
    setFormData({ ...formData, medications: updatedMedications });
  };

  const handleSave = async () => {
    if (!formData.medications[0].name || !formData.medications[0].dosage) {
      if (Platform.OS === 'web') window.alert("Please fill in at least one Medication and Dosage");
      else Alert.alert("Error", "Please fill in at least one Medication and Dosage");
      return;
    }

    const finalUserId = isPrivileged ? formData.userId : (userId || "test-user-123"); 

    if (isPrivileged && !finalUserId) {
        if (Platform.OS === 'web') window.alert("Please select a patient from the dropdown.");
        else Alert.alert("Error", "Please select a patient from the dropdown.");
        return;
    }

    // 🛑 FIX: Explicitly inject the doctorId before saving to backend
    const cleanedData = {
        ...formData,
        userId: finalUserId,
        doctorId: userRole === 'doctor' ? userId : formData.doctorId, 
        medications: formData.medications.filter(med => med.name.trim() !== '' && med.dosage.trim() !== '')
    };

    try {
      if (isEditing) {
        await axios.put(`${BASE_URL}/prescriptions/${currentId}`, cleanedData);
        setPrescriptions(prev => prev.map(r => r._id === currentId ? { ...r, ...cleanedData } : r));
      } else {
        const response = await axios.post(`${BASE_URL}/prescriptions`, cleanedData);
        setPrescriptions(prev => [...prev, response.data]);
      }
      setModalVisible(false);
    } catch (error: any) { 
      console.error("FRONTEND ERROR:", error.message);
      if (Platform.OS === 'web') window.alert("Failed to save: " + error.message);
      else Alert.alert("Failed to save", error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`${BASE_URL}/prescriptions/${id}`);
      setPrescriptions(prev => prev.filter(r => r._id !== id));
    } catch (error) { console.log(error); }
  };

  const handlePickUp = async (id: string, currentItem: any) => {
    try {
      const updatedItem = { ...currentItem, status: 'Completed' };
      await axios.put(`${BASE_URL}/prescriptions/${id}`, updatedItem);
      
      setPrescriptions(prev => prev.filter(r => r._id !== id));
      
      if (Platform.OS === 'web') window.alert("Prescription marked as picked up! Moved to Records.");
      else Alert.alert("Success", "Prescription marked as picked up! Moved to Records.");
    } catch (error: any) {
      console.error("Error marking as picked up:", error.message);
    }
  };

  const activePrescriptions = prescriptions.filter(item => item.status !== 'Completed');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.navHeader}>
        <Text style={styles.navTitle}>{isPrivileged ? 'Active Prescriptions' : 'My Active Prescriptions'}</Text>
        {isPrivileged && <Text style={{color: '#4F46E5', fontWeight: '700', marginTop: 4, fontSize: 12, textTransform: 'uppercase'}}>{userRole} VIEW</Text>}
      </View>

      <ScrollView style={styles.container}>
        {loading ? <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} /> : 
          activePrescriptions.length === 0 ? (
            <Text style={styles.emptyText}>No active prescriptions right now!</Text>
          ) : (
            activePrescriptions.map((item) => (
              <View key={item._id} style={styles.card}>
                <View style={{ flex: 1 }}>
                  {isPrivileged && <Text style={{fontSize: 10, color: '#94A3B8', marginBottom: 4}}>Patient ID: {item.userId}</Text>}
                  
                  <Text style={styles.doctorText}>Dr. {item.doctorName}</Text>
                  
                  <View style={styles.medsContainer}>
                    {item.medications && item.medications.length > 0 ? (
                      item.medications.map((med: any, idx: number) => (
                        <View key={idx} style={styles.medRow}>
                          <Text style={styles.medDot}>•</Text>
                          <Text style={styles.title}>{med.name} <Text style={styles.subtitle}>({med.dosage})</Text></Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.medRow}>
                        <Text style={styles.medDot}>•</Text>
                        <Text style={styles.title}>{item.medication || 'Unknown'} <Text style={styles.subtitle}>({item.dosage || 'N/A'})</Text></Text>
                      </View>
                    )}
                  </View>

                  {item.instructions ? <Text style={styles.details}>📝 {item.instructions}</Text> : null}
                  <Text style={styles.dateText}>Issued: {item.date}</Text>

                  {!isPrivileged && (
                    <TouchableOpacity style={styles.pickupBtn} onPress={() => handlePickUp(item._id, item)}>
                      <Text style={styles.pickupBtnText}>✅ Mark as Picked Up</Text>
                    </TouchableOpacity>
                  )}

                </View>
                
                {isPrivileged && (
                  <View style={{ gap: 10, justifyContent: 'center' }}>
                    <TouchableOpacity onPress={() => openModal(item)} style={styles.editBtn}><Text style={styles.editBtnText}>Edit</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.deleteBtn}><Text style={styles.deleteBtnText}>X</Text></TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )
        }

        {isPrivileged && (
          <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
            <Text style={styles.addButtonText}>+ Write Prescription</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{isEditing ? "Edit Prescription" : "Write Prescription"}</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {isPrivileged && (
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Assign to Patient:</Text>
                  <Picker
                    selectedValue={formData.userId}
                    onValueChange={(itemValue) => setFormData({...formData, userId: itemValue})}
                    style={styles.picker}
                  >
                    <Picker.Item label="-- Select a Patient --" value="" color="#94A3B8" />
                    {patients.map((patient) => (
                      <Picker.Item key={patient._id} label={patient.name ? `${patient.name} (${patient.email})` : patient.email} value={patient._id} />
                    ))}
                  </Picker>
                </View>
              )}

              <Text style={styles.sectionLabel}>Doctor Details</Text>
              <TextInput style={styles.input} value={formData.doctorName} onChangeText={t => setFormData({...formData, doctorName: t})} placeholder="Doctor Name" />
              
              <View style={styles.medsSection}>
                <Text style={styles.sectionLabel}>Prescribed Medications</Text>
                {formData.medications.map((med, index) => (
                  <View key={index} style={styles.dynamicMedRow}>
                    <View style={styles.dynamicInputsContainer}>
                      <TextInput style={styles.dynamicInputName} value={med.name} onChangeText={(text) => handleMedicineChange(text, index, 'name')} placeholder="Medicine Name (e.g. Panadol)" />
                      <TextInput style={styles.dynamicInputDosage} value={med.dosage} onChangeText={(text) => handleMedicineChange(text, index, 'dosage')} placeholder="Dosage (e.g. 500mg)" />
                    </View>
                    {formData.medications.length > 1 && (
                      <TouchableOpacity onPress={() => handleRemoveMedicine(index)} style={styles.removeMedBtn}><Text style={styles.removeMedText}>🗑️</Text></TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity style={styles.addMedBtn} onPress={handleAddMedicine}><Text style={styles.addMedBtnText}>+ Add Another Medicine</Text></TouchableOpacity>
              </View>

              <Text style={styles.sectionLabel}>Additional Info</Text>
              <TextInput style={[styles.input, { height: 80 }]} multiline value={formData.instructions} onChangeText={t => setFormData({...formData, instructions: t})} placeholder="Special Instructions (e.g. Take after meals)" />
              
              <View style={styles.datePickerContainer}>
                <Text style={styles.sectionLabel}>Date Issued</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}><Text style={styles.dateButtonText}>{formData.date || "Select Date"}</Text></TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker value={selectedDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChange} />
              )}
              {Platform.OS === 'ios' && showDatePicker && (
                 <TouchableOpacity style={styles.doneBtn} onPress={() => setShowDatePicker(false)}><Text style={styles.doneBtnText}>Confirm Date</Text></TouchableOpacity>
              )}
              
              <TouchableOpacity style={styles.saveModalButton} onPress={handleSave}><Text style={styles.saveModalText}>Save Prescription</Text></TouchableOpacity>
              <TouchableOpacity style={styles.closeModalButton} onPress={() => setModalVisible(false)}><Text style={styles.closeModalText}>Cancel</Text></TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  navHeader: { paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, zIndex: 10 },
  navTitle: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  container: { flex: 1, padding: 20 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 16, color: '#64748B', fontWeight: '500' },
  
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(226, 232, 240, 0.8)', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 4 },
  doctorText: { fontSize: 14, color: '#4F46E5', fontWeight: '800', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  medsContainer: { marginBottom: 16 },
  medRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  medDot: { fontSize: 20, color: '#10B981', marginRight: 10, marginTop: -3 },
  title: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  subtitle: { fontSize: 15, color: '#64748B', fontWeight: '600' },
  details: { fontSize: 15, color: '#475569', marginBottom: 10, fontWeight: '500', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12 },
  dateText: { fontSize: 13, color: '#94A3B8', marginTop: 4, fontWeight: '600' },
  
  pickupBtn: { backgroundColor: '#D1FAE5', padding: 14, borderRadius: 14, marginTop: 16, alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  pickupBtnText: { color: '#047857', fontWeight: '800', fontSize: 15 },

  editBtn: { backgroundColor: '#EEF2FF', padding: 12, borderRadius: 12, marginBottom: 10, alignItems: 'center' }, editBtnText: { color: '#4F46E5', fontWeight: '800' },
  deleteBtn: { backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, alignItems: 'center' }, deleteBtnText: { color: '#DC2626', fontWeight: '800' },
  addButton: { backgroundColor: '#4F46E5', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }, addButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: 20 },
  modalView: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 28, width: '100%', maxWidth: 450, maxHeight: '90%', alignSelf: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 10 },
  modalTitle: { fontSize: 26, fontWeight: '900', marginBottom: 24, textAlign: 'center', color: '#0F172A' },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#64748B', marginBottom: 10, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, marginBottom: 16, fontSize: 16, color: '#1E293B', fontWeight: '500' },
  pickerContainer: { marginBottom: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  pickerLabel: { fontSize: 12, color: '#64748B', fontWeight: '800', marginBottom: 4, marginTop: 6, paddingLeft: 8, textTransform: 'uppercase' },
  picker: { height: 55, width: '100%' },
  
  medsSection: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20, marginTop: 10 },
  dynamicMedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  dynamicInputsContainer: { flex: 1, flexDirection: 'row', gap: 12 },
  dynamicInputName: { flex: 2, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, fontSize: 15 },
  dynamicInputDosage: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, fontSize: 15 },
  removeMedBtn: { backgroundColor: '#FEE2E2', padding: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  removeMedText: { fontSize: 16 },
  addMedBtn: { backgroundColor: '#EEF2FF', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#C7D2FE', borderStyle: 'dashed' },
  addMedBtnText: { color: '#4F46E5', fontWeight: '800', fontSize: 15 },

  datePickerContainer: { marginBottom: 24 },
  dateButton: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 18 },
  dateButtonText: { fontSize: 16, color: '#1E293B', fontWeight: '500' },
  doneBtn: { backgroundColor: '#EEF2FF', padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 20 },
  doneBtnText: { color: '#4F46E5', fontWeight: '800', fontSize: 15 },

  saveModalButton: { backgroundColor: '#4F46E5', padding: 18, borderRadius: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }, saveModalText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  closeModalButton: { backgroundColor: '#F1F5F9', padding: 18, borderRadius: 16, alignItems: 'center' }, closeModalText: { color: '#475569', fontWeight: '800', fontSize: 16 },
});