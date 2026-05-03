import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:5000/api' 
  : 'http://10.233.96.81:5000/api';

export default function UserManagementScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authToken, setAuthToken] = useState(''); // NEW: Store the token for API calls

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');
  
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '', role: 'patient' });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchUsers = async () => {
        setLoading(true);
        try {
          const storedUser = await AsyncStorage.getItem('userInfo');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            const role = parsedUser.user?.role || parsedUser.role || 'patient';
            const token = parsedUser.token || parsedUser.user?.token; // Extract Token
            
            const userIsAdmin = role === 'admin';
            setIsAdmin(userIsAdmin);
            
            if (token) setAuthToken(token);

            // Fetch with Authorization Header
            if (userIsAdmin && isActive && token) {
               const config = { headers: { Authorization: `Bearer ${token}` } };
               const response = await axios.get(`${BASE_URL}/user/all`, config);
               setUsers(response.data);
            }
          }
        } catch (error: any) { 
          console.log("Error fetching users:", error.response?.data || error.message); 
        } finally { 
          if (isActive) setLoading(false); 
        }
      };
      
      fetchUsers();
      return () => { isActive = false; };
    }, [])
  );

  const openModal = (item: any = null) => {
    if (item) {
      setIsEditing(true); 
      setCurrentId(item._id);
      setFormData({ 
          name: item.name || '', 
          email: item.email || '', 
          phone: item.phone || '', 
          address: item.address || '',
          role: item.role || 'patient' 
      });
    } else {
      setIsEditing(false); 
      setFormData({ name: '', email: '', phone: '', address: '', role: 'patient' });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      if (Platform.OS === 'web') window.alert("Name and Email are required!");
      else Alert.alert("Error", "Name and Email are required!");
      return;
    }

    const config = { headers: { Authorization: `Bearer ${authToken}` } }; // Attach token

    try {
      if (isEditing) {
        const response = await axios.post(`${BASE_URL}/user/update/${currentId}`, formData, config);
        setUsers(prev => prev.map(u => u._id === currentId ? response.data.user || { ...u, ...formData } : u));
      } else {
        const payload = { ...formData, password: 'DefaultPassword123!' }; 
        await axios.post(`${BASE_URL}/auth/register`, payload, config);
        
        // Refresh the list using the token
        const refreshed = await axios.get(`${BASE_URL}/user/all`, config);
        setUsers(refreshed.data);
      }
      setModalVisible(false);
      
      if (Platform.OS === 'web') window.alert("User saved successfully!");
      else Alert.alert("Success", "User saved successfully!");
    } catch (error: any) { 
      console.log("Save Error:", error.response?.data || error.message);
      const msg = error.response?.data?.message || "Failed to save user";
      if (Platform.OS === 'web') window.alert(msg); else Alert.alert("Error", msg);
    }
  };

  const handleDelete = async (id: string) => {
    if (Platform.OS === 'web') {
        if (!window.confirm("Are you sure you want to completely delete this user?")) return;
    } else {
        Alert.alert("Confirm", "Delete this user?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => performDelete(id) }
        ]);
        return;
    }
    performDelete(id);
  };

  const performDelete = async (id: string) => {
      try {
        const config = { headers: { Authorization: `Bearer ${authToken}` } }; // Attach token
        await axios.delete(`${BASE_URL}/user/${id}`, config);
        setUsers(prev => prev.filter(u => u._id !== id));
      } catch (error: any) { 
        console.log("Delete Error:", error.response?.data || error.message); 
      }
  };

  if (!loading && !isAdmin) {
      return (
          <SafeAreaView style={styles.safeArea}>
              <View style={styles.accessDenied}>
                  <Text style={styles.accessDeniedText}>🔒 Access Denied</Text>
                  <Text style={styles.accessDeniedSub}>Only administrators can view this page.</Text>
              </View>
          </SafeAreaView>
      )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.navHeader}>
        <Text style={styles.navTitle}>User Management</Text>
        <Text style={{color: '#4F46E5', fontWeight: '700', marginTop: 4, fontSize: 12}}>ADMIN ONLY</Text>
      </View>

      <ScrollView style={styles.container}>
        {loading ? <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} /> : 
          users.map((item) => (
            <View key={item._id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.name || "Unnamed User"}</Text>
                <Text style={styles.subtitle}>{item.email}</Text>
                {item.phone ? <Text style={styles.details}>📞 {item.phone}</Text> : null}
                
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.roleBadge, 
                    item.role === 'admin' ? styles.roleAdmin : 
                    item.role === 'doctor' ? styles.roleDoctor : styles.rolePatient]}>
                    {item.role ? item.role.toUpperCase() : 'PATIENT'}
                  </Text>
                </View>
              </View>
              
              <View style={{ gap: 10 }}>
                <TouchableOpacity onPress={() => openModal(item)} style={styles.editBtn}><Text style={styles.editBtnText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.deleteBtn}><Text style={styles.deleteBtnText}>X</Text></TouchableOpacity>
              </View>
            </View>
          ))
        }

        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Text style={styles.addButtonText}>+ Add New User</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{isEditing ? "Edit User" : "Add User"}</Text>
            
            <TextInput style={styles.input} value={formData.name} onChangeText={t => setFormData({...formData, name: t})} placeholder="Full Name" />
            <TextInput style={styles.input} value={formData.email} onChangeText={t => setFormData({...formData, email: t})} placeholder="Email Address" autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.input} value={formData.phone} onChangeText={t => setFormData({...formData, phone: t})} placeholder="Phone Number" keyboardType="phone-pad" />
            <TextInput style={styles.input} value={formData.address} onChangeText={t => setFormData({...formData, address: t})} placeholder="Address" />
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Account Role:</Text>
              <Picker
                selectedValue={formData.role}
                onValueChange={(itemValue) => setFormData({...formData, role: itemValue})}
                style={styles.picker}
              >
                <Picker.Item label="Patient" value="patient" />
                <Picker.Item label="Doctor" value="doctor" />
                <Picker.Item label="Admin" value="admin" />
              </Picker>
            </View>

            {!isEditing && <Text style={{fontSize: 12, color: '#64748B', marginBottom: 15, textAlign: 'center'}}>Default password will be set to: DefaultPassword123!</Text>}
            
            <TouchableOpacity style={styles.saveModalButton} onPress={handleSave}><Text style={styles.saveModalText}>Save</Text></TouchableOpacity>
            <TouchableOpacity style={styles.closeModalButton} onPress={() => setModalVisible(false)}><Text style={styles.closeModalText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  navHeader: { paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 16, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, zIndex: 10, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  navTitle: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  container: { flex: 1, padding: 24 },
  accessDenied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  accessDeniedText: { fontSize: 28, fontWeight: '900', color: '#DC2626', marginBottom: 12 },
  accessDeniedSub: { fontSize: 16, color: '#64748B', textAlign: 'center', fontWeight: '500' },
  
  card: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 24, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(226, 232, 240, 0.8)', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 4 },
  title: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#64748B', fontWeight: '600', marginBottom: 8 },
  details: { fontSize: 14, color: '#334155', fontWeight: '500' },
  
  roleBadge: { fontSize: 11, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', overflow: 'hidden', letterSpacing: 0.5 },
  roleAdmin: { backgroundColor: '#FEF2F2', color: '#B91C1C' },
  roleDoctor: { backgroundColor: '#EEF2FF', color: '#4338CA' },
  rolePatient: { backgroundColor: '#ECFDF5', color: '#059669' },
  
  editBtn: { backgroundColor: '#EEF2FF', padding: 12, borderRadius: 12, marginBottom: 10, alignItems: 'center' }, editBtnText: { color: '#4F46E5', fontWeight: '800' },
  deleteBtn: { backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, alignItems: 'center' }, deleteBtnText: { color: '#DC2626', fontWeight: '800' },
  addButton: { backgroundColor: '#4F46E5', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }, addButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: 20 },
  modalView: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 28, width: '100%', maxWidth: 450, alignSelf: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 10 },
  modalTitle: { fontSize: 26, fontWeight: '900', marginBottom: 24, textAlign: 'center', color: '#0F172A' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, marginBottom: 16, fontSize: 16, color: '#1E293B', fontWeight: '500' },
  pickerContainer: { marginBottom: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 12 },
  pickerLabel: { fontSize: 12, color: '#64748B', fontWeight: '800', marginBottom: -5, marginTop: 10, paddingLeft: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  picker: { height: 55, width: '100%' },
  
  saveModalButton: { backgroundColor: '#4F46E5', padding: 18, borderRadius: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }, saveModalText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  closeModalButton: { backgroundColor: '#F1F5F9', padding: 18, borderRadius: 16, alignItems: 'center' }, closeModalText: { color: '#475569', fontWeight: '800', fontSize: 16 },
});