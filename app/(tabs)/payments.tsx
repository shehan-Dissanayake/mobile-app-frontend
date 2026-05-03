import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

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
    <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2000&auto=format&fit=crop' }} style={styles.backgroundImage}>
      <View style={styles.darkOverlay} />
      <SafeAreaView style={styles.safeArea}>

        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.header}>
          <View>
            <Text style={styles.headerSubtitle}>FINANCE HISTORY</Text>
            <Text style={styles.headerTitle}>TRANSACTIONS</Text>
          </View>
          <Ionicons name="wallet" size={40} color="#34D399" style={{ opacity: 0.8 }} />
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {loading ? <ActivityIndicator size="large" color="#34D399" style={{ marginTop: 50 }} /> :
            payments.length === 0 ? (
              <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="cash-outline" size={48} color="#34D399" />
                </View>
                <Text style={styles.emptyText}>No transactions found.</Text>
              </Animated.View>
            ) : (
              payments.map((item, index) => (
                <Animated.View entering={FadeInDown.duration(500).delay(200 + (index * 100))} key={item._id} style={styles.glassCard}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardIconBox}>
                      <Ionicons name={item.method === 'Cash' ? "cash" : "card"} size={24} color="#34D399" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.title}>Payment Received</Text>
                      <Text style={styles.dateText}>{item.date || new Date(item.createdAt).toISOString().split('T')[0]}</Text>
                    </View>
                    <Text style={styles.amount}>${Number(item.amount).toFixed(2)}</Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.cardBottom}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.methodText}>METHOD: {item.method}</Text>
                      {item.notes ? <Text style={styles.notesText}>NOTE: {item.notes}</Text> : null}
                      {isAdmin && <Text style={styles.invoiceRef}>INV REF: {item.invoiceId?.substring(0, 8)}...</Text>}
                    </View>

                    {isAdmin && (
                      <View style={styles.actions}>
                        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
                          <Ionicons name="pencil" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.iconBtnText}>EDIT</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleRefund(item._id)} style={styles.refundBtn}>
                          <Ionicons name="arrow-undo" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                          <Text style={styles.refundBtnText}>REFUND</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </Animated.View>
              )))}
        </ScrollView>

        {/* EDIT MODAL */}
        <Modal animationType="fade" transparent={true} visible={modalVisible}>
          <View style={styles.modalOverlay}>
            <Animated.View entering={FadeInDown.duration(400)} style={styles.modalView}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>EDIT TRANSACTION</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}><Ionicons name="close" size={24} color="#FFFFFF" /></TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Payment Method</Text>
              <TextInput style={styles.input} placeholderTextColor="#71717A" value={formData.method} onChangeText={t => setFormData({ ...formData, method: t })} placeholder="e.g. Card, Cash, Insurance" />

              <Text style={styles.inputLabel}>Admin Notes</Text>
              <TextInput style={[styles.input, { height: 80 }]} placeholderTextColor="#71717A" value={formData.notes} onChangeText={t => setFormData({ ...formData, notes: t })} placeholder="Add a note about this transaction..." multiline={true} />

              <TouchableOpacity style={styles.saveModalButton} onPress={handleUpdate}>
                <Text style={styles.saveModalText}>UPDATE RECORD</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(9, 9, 11, 0.85)' },
  safeArea: { flex: 1 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 20, backgroundColor: 'rgba(24, 24, 27, 0.5)', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)', zIndex: 10 },
  headerSubtitle: { fontSize: 13, color: '#34D399', fontWeight: '800', letterSpacing: 2 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', marginTop: 4, letterSpacing: -0.5 },

  scrollContainer: { padding: 24, paddingBottom: 100 },

  emptyState: { alignItems: 'center', marginTop: 40, backgroundColor: 'rgba(255, 255, 255, 0.03)', paddingVertical: 50, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(52, 211, 153, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(52, 211, 153, 0.3)' },
  emptyText: { fontSize: 16, color: '#A1A1AA', fontWeight: '600' },

  glassCard: { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 24, marginBottom: 20, padding: 24, shadowColor: '#34D399', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 4, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardIconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(52, 211, 153, 0.15)', justifyContent: 'center', alignItems: 'center', shadowColor: '#34D399', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, borderWidth: 1, borderColor: '#34D399' },
  title: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
  dateText: { fontSize: 13, color: '#A1A1AA', marginTop: 4, fontWeight: '600' },
  amount: { fontSize: 26, fontWeight: '900', color: '#34D399' },
  divider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', marginVertical: 20 },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  methodText: { fontSize: 12, color: '#E4E4E7', fontWeight: '800', letterSpacing: 1 },
  notesText: { fontSize: 13, color: '#A1A1AA', marginTop: 6, fontStyle: 'italic', fontWeight: '500' },
  invoiceRef: { fontSize: 11, color: '#34D399', marginTop: 8, letterSpacing: 1, fontWeight: '900' },

  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  iconBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  refundBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: 16, borderWidth: 1, borderColor: '#EF4444' },
  refundBtnText: { color: '#EF4444', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(9, 9, 11, 0.9)', padding: 24 },
  modalView: { backgroundColor: 'rgba(24, 24, 27, 0.95)', borderRadius: 32, padding: 32, width: '100%', shadowColor: '#34D399', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#34D399', letterSpacing: 1 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.08)', justifyContent: 'center', alignItems: 'center' },
  inputLabel: { fontSize: 11, fontWeight: '800', color: '#A1A1AA', marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },
  input: { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 18, fontSize: 15, marginBottom: 24, color: '#FFFFFF', fontWeight: '500' },
  saveModalButton: { backgroundColor: '#34D399', padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 10, shadowColor: '#34D399', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 5 },
  saveModalText: { color: '#09090B', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});