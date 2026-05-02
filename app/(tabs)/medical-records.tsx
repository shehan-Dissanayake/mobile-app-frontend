import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:5000/api' 
  : 'http://10.233.96.81:5000/api';


export default function MedicalRecordsScreen() {
  const [records, setRecords] = useState<any[]>([]); 
  const [patients, setPatients] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [expandedCards, setExpandedCards] = useState<string[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');
  
  const [formData, setFormData] = useState({ 
    userId: '', doctorName: '', recordType: 'Diagnosis', diagnosis: '', treatment: '', date: '', status: 'Completed', expectedTime: '', isRead: false, attachedFile: '' 
  });

  // 🛑 NEW: States for the Invoice Creation process
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [selectedRecordForInvoice, setSelectedRecordForInvoice] = useState<any>(null);
  const [invoiceAmount, setInvoiceAmount] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchAllData = async () => {
        setLoading(true);
        try {
          const storedUser = await AsyncStorage.getItem('userInfo');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            const uid = parsedUser.user?.id || parsedUser.user?._id || parsedUser.id || parsedUser._id;
            const role = parsedUser.user?.role || parsedUser.role || 'patient';
            
            const userIsAdmin = role === 'admin';
            const userIsDoctor = role === 'doctor';
            
            if (isActive) { 
              setUserId(uid); 
              setIsAdmin(userIsAdmin); 
              setIsDoctor(userIsDoctor);
            }

            const recordsUrl = userIsAdmin ? `${BASE_URL}/medicalRecords` 
                             : userIsDoctor ? `${BASE_URL}/medicalRecords/doctor/${uid}` 
                             : `${BASE_URL}/medicalRecords/user/${uid}`;
            const recordsRes = await axios.get(recordsUrl);
            const formattedRecords = recordsRes.data.map((r: any) => ({ ...r, source: 'record' }));

            const presUrl = userIsAdmin ? `${BASE_URL}/prescriptions` 
                          : userIsDoctor ? `${BASE_URL}/prescriptions/doctor/${uid}` 
                          : `${BASE_URL}/prescriptions/user/${uid}`;
            const presRes = await axios.get(presUrl);
            const formattedPrescriptions = presRes.data.map((p: any) => ({ ...p, source: 'prescription' }));

            if (isActive) setRecords([...formattedRecords, ...formattedPrescriptions]);

            if (userIsAdmin || userIsDoctor) {
               const patientsResponse = await axios.get(`${BASE_URL}/user/patients`);
               if (isActive) setPatients(patientsResponse.data);
            }
          }
        } catch (error) { console.log("FETCH ERROR:", error); } 
        finally { if (isActive) setLoading(false); }
      };
      fetchAllData();
      return () => { isActive = false; };
    }, [])
  );

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const openModal = (item: any = null, forceComplete: boolean = false) => {
    if (item) {
      setIsEditing(true); setCurrentId(item._id);
      setFormData({ 
        userId: item.userId || '', doctorName: item.doctorName, recordType: item.recordType || 'Diagnosis',
        diagnosis: forceComplete ? '' : item.diagnosis, 
        treatment: item.treatment || '', date: item.date, 
        status: forceComplete ? 'Completed' : (item.status || 'Completed'), 
        expectedTime: item.expectedTime || '', isRead: item.isRead || false,
        attachedFile: forceComplete ? '' : (item.attachedFile || '') 
      });
    } else {
      setIsEditing(false); 
      const today = new Date().toISOString().split('T')[0];
      setFormData({ userId: '', doctorName: '', recordType: 'Diagnosis', diagnosis: '', treatment: '', date: today, status: 'Completed', expectedTime: '', isRead: false, attachedFile: '' });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.doctorName || !formData.diagnosis || !formData.date) {
      Alert.alert("Error", "Please fill in Doctor Name, Details, and Date"); return;
    }
    
    const finalUserId = (isAdmin || isDoctor) && formData.userId ? formData.userId : (userId || "test-user-123"); 
    const finalIsRead = ((isAdmin || isDoctor) && formData.status === 'Completed') ? false : formData.isRead;

    try {
      const payload: any = { ...formData, userId: finalUserId, isRead: finalIsRead };
      
      if (isDoctor) {
        payload.doctorId = userId; 
      }

      if (isEditing) {
        await axios.put(`${BASE_URL}/medicalRecords/${currentId}`, payload);
        setRecords(prev => prev.map(r => r._id === currentId ? { ...r, ...payload, source: 'record' } : r));
      } else {
        const response = await axios.post(`${BASE_URL}/medicalRecords`, payload);
        setRecords(prev => [...prev, { ...response.data, source: 'record' }]);
      }
      setModalVisible(false);
    } catch (error: any) { console.log("FRONTEND ERROR:", error.message); }
  };

  const handleDelete = async (id: string, source: string) => {
    try {
      if (source === 'record') await axios.delete(`${BASE_URL}/medicalRecords/${id}`);
      else if (source === 'prescription') await axios.delete(`${BASE_URL}/prescriptions/${id}`);
      setRecords(prev => prev.filter(r => r._id !== id));
    } catch (error) { console.log(error); }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setFormData({ ...formData, attachedFile: result.assets[0].name });
      }
    } catch (error) { Alert.alert("Error", "Could not pick a document."); }
  };

  // 🛑 NEW: Function to open Invoice Modal
  const handleOpenInvoiceModal = (item: any) => {
    setSelectedRecordForInvoice(item);
    setInvoiceAmount('');
    setInvoiceModalVisible(true);
  };

  // 🛑 NEW: Function to submit Invoice and update Record
  const handleSubmitInvoice = async () => {
    if (!invoiceAmount || isNaN(Number(invoiceAmount))) {
      Alert.alert("Invalid Input", "Please enter a valid numeric amount.");
      return;
    }
    try {
      // 1. Create the Invoice in backend
      const description = `${selectedRecordForInvoice.source === 'prescription' ? 'Prescription' : selectedRecordForInvoice.recordType} - ${selectedRecordForInvoice.diagnosis || 'Medical Service'}`;
      const invoicePayload = {
        userId: selectedRecordForInvoice.userId,
        description: description,
        amount: invoiceAmount,
        status: 'Pending'
      };
      await axios.post(`${BASE_URL}/invoices`, invoicePayload);

      // 2. Mark the record/prescription as Billed
      const updateEndpoint = selectedRecordForInvoice.source === 'prescription' 
        ? `${BASE_URL}/prescriptions/${selectedRecordForInvoice._id}` 
        : `${BASE_URL}/medicalRecords/${selectedRecordForInvoice._id}`;
      
      await axios.put(updateEndpoint, { isBilled: true });

      // 3. Update the UI locally
      setRecords(prev => prev.map(r => r._id === selectedRecordForInvoice._id ? { ...r, isBilled: true } : r));
      
      setInvoiceModalVisible(false);
      Alert.alert("Success", "Invoice generated and linked successfully!");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to generate invoice.");
    }
  };

  const filteredRecords = records.filter(item => {
    const matchesTab = activeTab === 'active' ? item.status === 'Pending' : (item.status === 'Completed' || !item.status);
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = item.diagnosis?.toLowerCase().includes(searchLower) || 
                          item.doctorName?.toLowerCase().includes(searchLower) || 
                          ((isAdmin || isDoctor) && item.userId?.toLowerCase().includes(searchLower));
    const matchesFilter = filterType === 'All' ? true : (filterType === 'Prescription' ? item.source === 'prescription' : item.recordType === filterType);
    return matchesTab && matchesSearch && matchesFilter;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.navHeader}>
        <Text style={styles.navTitle}>{(isAdmin || isDoctor) ? 'Clinic Database' : 'My Health Journey'}</Text>
        {(isAdmin || isDoctor) && <Text style={{color: '#4F46E5', fontWeight: '700', marginTop: 4, fontSize: 12}}>{isAdmin ? 'ADMINISTRATION PANEL' : 'DOCTOR PANEL'}</Text>}
        
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, activeTab === 'active' && styles.activeTab]} onPress={() => setActiveTab('active')}>
            <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Active Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 'history' && styles.activeTab]} onPress={() => setActiveTab('history')}>
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Health History</Text>
          </TouchableOpacity>
        </View>

        {((isAdmin || isDoctor) || records.length > 5) && (
          <View style={styles.searchFilterContainer}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color="#94A3B8" />
              <TextInput style={styles.searchInput} placeholder={(isAdmin || isDoctor) ? "Search Patient ID, Dr, or Diagnosis..." : "Search doctors or diagnosis..."} value={searchQuery} onChangeText={setSearchQuery} />
              {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={20} color="#94A3B8" /></TouchableOpacity>}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {['All', 'Prescription', 'Lab Report', 'Diagnosis', 'Imaging / X-Ray'].map(type => (
                <TouchableOpacity key={type} style={[styles.filterPill, filterType === type && styles.activeFilterPill]} onPress={() => setFilterType(type)}>
                  <Text style={[styles.filterPillText, filterType === type && styles.activeFilterPillText]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {loading ? <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} /> : 
          filteredRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No records found.</Text>
            </View>
          ) : (
          filteredRecords.map((item, index) => {
            const isExpanded = expandedCards.includes(item._id);
            const isPatientHistory = (!isAdmin && !isDoctor) && activeTab === 'history';

            return (
              <View key={item._id} style={isPatientHistory ? styles.timelineWrapper : null}>
                {isPatientHistory && <View style={styles.timelineDot} />}
                
                <View style={[styles.card, item.status === 'Pending' && styles.pendingCard, isPatientHistory && styles.timelineCard]}>
                  
                  <View style={styles.cardHeader}>
                    {/* 🛑 NEW: Wrap Tags in a Row to accommodate the Billed Badge */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.tagContainer, item.status === 'Pending' ? {backgroundColor: '#FEF3C7'} : {backgroundColor: item.source === 'prescription' ? '#D1FAE5' : '#E0E7FF'}]}>
                        <Text style={styles.tagIcon}>{item.source === 'prescription' ? '💊' : (item.recordType === 'Lab Report' ? '🧪' : '🩺')}</Text>
                        <Text style={[styles.tagText, item.status === 'Pending' ? {color: '#D97706'} : {color: item.source === 'prescription' ? '#047857' : '#4F46E5'}]}>
                          {item.status === 'Pending' ? 'Action Needed' : (item.source === 'prescription' ? 'Prescription' : item.recordType)}
                        </Text>
                      </View>
                      
                      {/* 🛑 NEW: Show Billed Badge if true */}
                      {item.isBilled && (
                        <View style={[styles.tagContainer, { backgroundColor: '#D1FAE5', marginLeft: 8 }]}>
                          <Text style={[styles.tagText, { color: '#047857' }]}>✓ BILLED</Text>
                        </View>
                      )}
                    </View>

                    {(isAdmin || isDoctor) && (
                      <View style={styles.adminActions}>
                        {/* 🛑 NEW: Add Invoice Button for Admins on Completed Records */}
                        {isAdmin && item.status === 'Completed' && !item.isBilled && (
                           <TouchableOpacity onPress={() => handleOpenInvoiceModal(item)} style={[styles.iconBtn, { backgroundColor: '#4F46E5', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, borderRadius: 8 }]}>
                             <Ionicons name="receipt" size={14} color="#FFF" style={{marginRight: 4}} />
                             <Text style={{color: '#FFF', fontSize: 11, fontWeight: '700'}}>BILL</Text>
                           </TouchableOpacity>
                        )}

                        {item.source === 'record' && item.status === 'Pending' && (
                          <TouchableOpacity onPress={() => openModal(item, true)} style={styles.iconBtn}><Ionicons name="checkmark-circle" size={24} color="#10B981" /></TouchableOpacity>
                        )}
                        {item.source === 'record' && (
                          <TouchableOpacity onPress={() => openModal(item)} style={styles.iconBtn}><Ionicons name="create-outline" size={22} color="#4F46E5" /></TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => handleDelete(item._id, item.source)} style={styles.iconBtn}><Ionicons name="trash-outline" size={22} color="#EF4444" /></TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {(isAdmin || isDoctor) && <Text style={styles.adminPatientId}>Patient: {item.userId}</Text>}
                  
                  <Text style={styles.title}>{item.diagnosis || 'Medication Issued'}</Text>
                  <Text style={styles.subtitle}>
                    <Ionicons name="person-circle-outline" size={14} /> Dr. {item.doctorName}  •  <Ionicons name="calendar-outline" size={14} /> {item.date}
                  </Text>
                  
                  {item.expectedTime && item.status === 'Pending' && (
                    <View style={styles.alertBox}><Ionicons name="time-outline" size={16} color="#B45309" /><Text style={styles.alertText}> Expected: {item.expectedTime}</Text></View>
                  )}

                  {(item.treatment || item.attachedFile || item.medications?.length > 0) && (
                    <TouchableOpacity style={styles.expandToggle} onPress={() => toggleExpand(item._id)}>
                      <Text style={styles.expandToggleText}>{isExpanded ? 'Hide Details' : 'View Details'}</Text>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#64748B" />
                    </TouchableOpacity>
                  )}

                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      {item.treatment ? <Text style={styles.details}><Text style={{fontWeight: '700'}}>Notes:</Text> {item.treatment}</Text> : null}
                      
                      {item.source === 'prescription' && item.medications?.map((med: any, idx: number) => (
                          <View key={idx} style={styles.medRow}><Ionicons name="medical" size={12} color="#10B981" /><Text style={styles.medText}> {med.name} ({med.dosage})</Text></View>
                      ))}

                      {item.attachedFile ? (
                        <TouchableOpacity style={styles.fileBtn} onPress={() => Linking.openURL('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf')}>
                          <Ionicons name="document-text" size={18} color="#FFF" />
                          <Text style={styles.fileBtnText}>Open {item.attachedFile}</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  )}

                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {(isAdmin || isDoctor) && (
        <TouchableOpacity style={styles.fab} onPress={() => openModal()} activeOpacity={0.8}>
          <Ionicons name="add" size={32} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Main Record Creation Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
              <Text style={styles.modalTitle}>{isEditing ? "Edit Record" : "Add Record"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={28} color="#64748B" /></TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {(isAdmin || isDoctor) && (
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerLabel}>Assign to Patient:</Text>
                  <Picker selectedValue={formData.userId} onValueChange={(v) => setFormData({...formData, userId: v})} style={styles.picker}>
                    <Picker.Item label="-- Select a Patient --" value="" color="#94A3B8" />
                    {patients.map((p) => <Picker.Item key={p._id} label={p.name ? `${p.name} (${p.email})` : p.email} value={p._id} />)}
                  </Picker>
                </View>
              )}
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Record Type:</Text>
                <Picker selectedValue={formData.recordType} onValueChange={(v) => setFormData({...formData, recordType: v})} style={styles.picker}>
                  <Picker.Item label="🩺 Diagnosis" value="Diagnosis" /><Picker.Item label="🧪 Lab Report" value="Lab Report" /><Picker.Item label="🩻 Imaging / X-Ray" value="Imaging / X-Ray" /><Picker.Item label="📝 Doctor Note" value="Doctor Note" />
                </Picker>
              </View>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Status:</Text>
                <Picker selectedValue={formData.status} onValueChange={(v) => setFormData({...formData, status: v})} style={styles.picker}>
                  <Picker.Item label="✅ Completed (Save to History)" value="Completed" /><Picker.Item label="⏳ Pending (Needs Action)" value="Pending" />
                </Picker>
              </View>

              <TextInput style={styles.input} value={formData.doctorName} onChangeText={t => setFormData({...formData, doctorName: t})} placeholder="Doctor Name" />
              <TextInput style={[styles.input, { height: 80 }]} multiline value={formData.diagnosis} onChangeText={t => setFormData({...formData, diagnosis: t})} placeholder={formData.status === 'Pending' ? "What is requested?" : "Findings / Lab Results"} />
              
              {formData.status === 'Pending' && <TextInput style={styles.input} value={formData.expectedTime} onChangeText={t => setFormData({...formData, expectedTime: t})} placeholder="Expected Time (e.g. Tomorrow 4 PM)" />}
              {formData.status === 'Completed' && <TextInput style={styles.input} value={formData.treatment} onChangeText={t => setFormData({...formData, treatment: t})} placeholder="Treatment / Notes" />}
              
              {formData.status === 'Completed' && (
                <TouchableOpacity style={styles.uploadBtn} onPress={handleFileUpload}>
                  <Ionicons name="cloud-upload-outline" size={24} color="#475569" style={{marginBottom: 4}}/>
                  <Text style={styles.uploadBtnText}>{formData.attachedFile ? `📎 ${formData.attachedFile}` : 'Browse & Attach Document'}</Text>
                </TouchableOpacity>
              )}
              
              <TextInput style={styles.input} value={formData.date} onChangeText={t => setFormData({...formData, date: t})} placeholder="Date (YYYY-MM-DD)" />
              
              <TouchableOpacity style={styles.saveModalButton} onPress={handleSave}><Text style={styles.saveModalText}>Save Record</Text></TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 🛑 NEW: Mini Invoice Modal */}
      <Modal animationType="fade" transparent={true} visible={invoiceModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalView, { minHeight: 280 }]}>
             <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
               <Text style={styles.modalTitle}>Issue Invoice</Text>
               <TouchableOpacity onPress={() => setInvoiceModalVisible(false)}><Ionicons name="close" size={28} color="#64748B" /></TouchableOpacity>
             </View>
             
             <Text style={styles.pickerLabel}>Service Description (Auto-filled)</Text>
             <TextInput 
               style={[styles.input, { backgroundColor: '#E2E8F0', color: '#64748B' }]} 
               value={selectedRecordForInvoice?.diagnosis || selectedRecordForInvoice?.recordType} 
               editable={false} 
             />

             <Text style={styles.pickerLabel}>Charge Amount ($)</Text>
             <TextInput 
               style={styles.input} 
               value={invoiceAmount} 
               onChangeText={setInvoiceAmount} 
               placeholder="e.g. 150.00" 
               keyboardType="numeric" 
             />

             <TouchableOpacity style={styles.saveModalButton} onPress={handleSubmitInvoice}>
               <Text style={styles.saveModalText}>Generate Invoice & Mark Billed</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  navHeader: { paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 16, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, zIndex: 10 },
  navTitle: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  
  tabContainer: { flexDirection: 'row', marginTop: 24, backgroundColor: '#F1F5F9', borderRadius: 14, padding: 6, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  activeTabText: { color: '#0F172A', fontWeight: '800' },

  searchFilterContainer: { marginTop: 10, marginBottom: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 16, height: 50, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#1E293B', fontWeight: '500' },
  filterScroll: { flexDirection: 'row', paddingBottom: 4 },
  filterPill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F8FAFC', marginRight: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  activeFilterPill: { backgroundColor: '#4F46E5', borderColor: '#4F46E5', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
  filterPillText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  activeFilterPillText: { color: '#FFFFFF' },

  container: { flex: 1, padding: 20 },
  emptyState: { alignItems: 'center', marginTop: 60, opacity: 0.6, backgroundColor: '#FFFFFF', padding: 40, borderRadius: 24, marginHorizontal: 10 },
  emptyText: { marginTop: 16, fontSize: 18, color: '#64748B', fontWeight: '700' },

  timelineWrapper: { borderLeftWidth: 2, borderColor: '#E2E8F0', marginLeft: 12, paddingLeft: 24, paddingBottom: 20 },
  timelineDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#4F46E5', position: 'absolute', left: -9, top: 24, borderWidth: 4, borderColor: '#F8FAFC' },
  
  card: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(226, 232, 240, 0.8)', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 4 },
  pendingCard: { borderColor: '#FDE68A', borderWidth: 2, backgroundColor: '#FFFAF0' },
  timelineCard: { marginBottom: 0 },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  tagContainer: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  tagIcon: { fontSize: 12, marginRight: 6 },
  tagText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  adminActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  iconBtn: { padding: 4 },
  adminPatientId: { fontSize: 12, color: '#94A3B8', fontWeight: '800', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#64748B', fontWeight: '600', marginBottom: 10 },
  
  alertBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', padding: 12, borderRadius: 12, marginTop: 10 },
  alertText: { fontSize: 14, color: '#B45309', fontWeight: '700' },

  expandToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderColor: '#F1F5F9' },
  expandToggleText: { color: '#64748B', fontSize: 14, fontWeight: '800' },
  expandedContent: { marginTop: 16, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16 },
  
  details: { fontSize: 15, color: '#334155', lineHeight: 22, marginBottom: 10, fontWeight: '500' },
  medRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  medText: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginLeft: 6 },

  fileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5', padding: 14, borderRadius: 12, marginTop: 16, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  fileBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15, marginLeft: 8 },

  fab: { position: 'absolute', bottom: 30, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  modalView: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, width: '100%', maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 18, marginBottom: 16, fontSize: 16, color: '#1E293B', fontWeight: '500' },
  pickerContainer: { marginBottom: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 12 },
  pickerLabel: { fontSize: 12, color: '#64748B', fontWeight: '800', marginTop: 12, paddingLeft: 8, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  picker: { height: 55, width: '100%' },
  uploadBtn: { backgroundColor: '#F8FAFC', borderWidth: 2, borderColor: '#CBD5E1', borderStyle: 'dashed', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  uploadBtnText: { color: '#475569', fontWeight: '800', fontSize: 15, marginTop: 8 },
  saveModalButton: { backgroundColor: '#4F46E5', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 12, shadowColor: '#4F46E5', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }, 
  saveModalText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});