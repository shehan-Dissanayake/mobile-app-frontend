import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// FIXED: Added :5000 to the mobile IP address
const BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:5000/api' 
  : 'http://10.233.96.81:5000/api';

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [currentId, setCurrentId] = useState('');
  const [formData, setFormData] = useState({ method: '', notes: '' });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchPayments = async () => {
        setLoading(true);
        try {
          const storedUser = await AsyncStorage.getItem('userInfo');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            const uid = parsedUser.user?.id || parsedUser.user?._id || parsedUser.id || parsedUser._id;
            const role = parsedUser.user?.role || parsedUser.role || 'patient';
            const userIsAdmin = role === 'admin';
            
            if (isActive) setIsAdmin(userIsAdmin);

            const backendUrl = userIsAdmin ? `${BASE_URL}/payments` : `${BASE_URL}/payments/user/${uid}`;
            const response = await axios.get(backendUrl);
            if (isActive) setPayments(response.data);
          }
        } catch (error) { console.log("Fetch error:", error); } 
        finally { if (isActive) setLoading(false); }
      };
      fetchPayments();
      return () => { isActive = false; };
    }, [])
  );

  const openEditModal = (item: any) => {
    setCurrentId(item._id);
    setFormData({ method: item.method || 'Card', notes: item.notes || '' });
    setModalVisible(true);
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`${BASE_URL}/payments/${currentId}`, formData);
      setPayments(prev => prev.map(p => p._id === currentId ? { ...p, ...formData } : p));
      setModalVisible(false);
      
      if (Platform.OS === 'web') window.alert("Payment record updated.");
      else Alert.alert("Success", "Payment record updated.");
    } catch (error) {
      if (Platform.OS === 'web') window.alert("Could not update payment record.");
      else Alert.alert("Error", "Could not update payment record.");
    }
  };

  const handleRefund = async (id: string) => {
    const confirmMessage = "Are you sure you want to refund this payment? The money will be returned and the Invoice will be reset to 'Pending'.";
    
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        processRefundCall(id);
      }
    } else {
      Alert.alert("Process Refund", confirmMessage, [
        { text: "Cancel", style: "cancel" },
        { text: "Refund Payment", style: "destructive", onPress: () => processRefundCall(id) }
      ]);
    }
  };

  const processRefundCall = async (id: string) => {
    try {
      await axios.delete(`${BASE_URL}/payments/${id}`);
      setPayments(prev => prev.filter(p => p._id !== id));
      
      if (Platform.OS === 'web') window.alert("Refund successful. Invoice reset to Pending.");
      else Alert.alert("Refunded", "Refund processed and Invoice reset to Pending.");
    } catch (error) {
      if (Platform.OS === 'web') window.alert("Error: Could not process refund.");
      else Alert.alert("Error", "Could not process refund.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
            <Text style={styles.headerSubtitle}>Finance History</Text>
            <Text style={styles.headerTitle}>Transactions</Text>
        </View>
        <Ionicons name="receipt" size={36} color="#10B981" style={{ opacity: 0.2 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {loading ? <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 50 }} /> : 
          payments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>No transactions found.</Text>
            </View>
          ) : (
          payments.map((item) => (
            <View key={item._id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardIconBox}>
                  <Ionicons name={item.method === 'Cash' ? "cash" : "card"} size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.title}>Payment Received</Text>
                  <Text style={styles.dateText}>{item.date || new Date(item.createdAt).toISOString().split('T')[0]}</Text>
                </View>
                <Text style={styles.amount}>${Number(item.amount).toFixed(2)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.cardBottom}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodText}>Method: {item.method}</Text>
                  {item.notes ? <Text style={styles.notesText}>Note: {item.notes}</Text> : null}
                  {isAdmin && <Text style={styles.invoiceRef}>Inv Ref: {item.invoiceId?.substring(0,8)}...</Text>}
                </View>
                
                {isAdmin && (
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
                      <Ionicons name="pencil" size={18} color="#64748B" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRefund(item._id)} style={styles.refundBtn}>
                      <Ionicons name="arrow-undo" size={14} color="#EF4444" />
                      <Text style={styles.refundBtnText}>Refund</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )))}
      </ScrollView>

      {/* EDIT MODAL */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Transaction</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#64748B" /></TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Payment Method</Text>
            <TextInput style={styles.input} value={formData.method} onChangeText={t => setFormData({...formData, method: t})} placeholder="e.g. Card, Cash, Insurance" />
            
            <Text style={styles.inputLabel}>Admin Notes</Text>
            <TextInput style={styles.input} value={formData.notes} onChangeText={t => setFormData({...formData, notes: t})} placeholder="Add a note about this transaction..." multiline={true} />
            
            <TouchableOpacity style={styles.saveModalButton} onPress={handleUpdate}>
                <Text style={styles.saveModalText}>Update Record</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, zIndex: 10 },
  headerSubtitle: { fontSize: 14, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#0F172A', marginTop: 4, letterSpacing: -0.5 },
  scrollContainer: { padding: 24, paddingBottom: 100 },
  emptyState: { alignItems: 'center', marginTop: 60, backgroundColor: '#FFFFFF', padding: 40, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 2 },
  emptyText: { marginTop: 16, fontSize: 18, color: '#64748B', fontWeight: '700' },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, marginBottom: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 4, borderWidth: 1, borderColor: 'rgba(226, 232, 240, 0.8)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  title: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  dateText: { fontSize: 13, color: '#94A3B8', marginTop: 4, fontWeight: '600' },
  amount: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  methodText: { fontSize: 14, color: '#475569', fontWeight: '700' },
  notesText: { fontSize: 14, color: '#64748B', marginTop: 6, fontStyle: 'italic', fontWeight: '500' },
  invoiceRef: { fontSize: 12, color: '#94A3B8', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' },
  
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBtn: { padding: 10, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  refundBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#FEF2F2', borderRadius: 12, gap: 6, borderWidth: 1, borderColor: '#FECACA' },
  refundBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '800' },
  
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  modalView: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, minHeight: 350, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  modalTitle: { fontSize: 26, fontWeight: '900', color: '#0F172A' },
  inputLabel: { fontSize: 13, fontWeight: '800', color: '#64748B', marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 18, fontSize: 16, marginBottom: 24, color: '#1E293B', fontWeight: '500' },
  saveModalButton: { backgroundColor: '#10B981', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveModalText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});