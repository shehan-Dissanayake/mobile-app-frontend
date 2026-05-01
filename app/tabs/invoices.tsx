import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
// ADDED useLocalSearchParams and useRouter for Web Stripe
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStripeHelper } from '../../hooks/useStripeHelper';

const BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:5000/api' 
  : 'http://10.233.96.81:5000/api'; // Added :5000 here to match your backend port

export default function InvoicesScreen() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState('');
  const [formData, setFormData] = useState({ description: '', amount: '', status: 'Pending', userId: '' });

  const { initPaymentSheet, presentPaymentSheet } = useStripeHelper();
  
  // URL hooks for Web Stripe Redirects
  const { success, canceled, invoiceId: paidInvoiceId, amount: paidAmount } = useLocalSearchParams();
  const router = useRouter();

  // --- NEW: WEB PAYMENT SUCCESS HANDLER ---
  useEffect(() => {
    if (Platform.OS === 'web' && success === 'true' && paidInvoiceId && userId) {
      const markWebInvoiceAsPaid = async () => {
        try {
          const today = new Date().toISOString().split('T')[0];
          const paymentData = { invoiceId: paidInvoiceId, userId, amount: Number(paidAmount), method: 'Card (Web)', date: today };
          
          await axios.post(`${BASE_URL}/payments/pay`, paymentData);
          setInvoices(prev => prev.map(i => i._id === paidInvoiceId ? { ...i, status: 'Paid' } : i));
          
          window.alert("Payment Successful! Receipt generated.");
          router.replace('/invoices' as any); // Clear URL params
        } catch (err) {
          console.log("Error marking web payment as complete:", err);
        }
      };
      markWebInvoiceAsPaid();
    } else if (Platform.OS === 'web' && canceled === 'true') {
       window.alert("Payment was canceled.");
       router.replace('/invoices' as any);
    }
  }, [success, canceled, paidInvoiceId, userId]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchInvoices = async () => {
        setLoading(true);
        try {
          const storedUser = await AsyncStorage.getItem('userInfo');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            const uid = parsedUser.user?.id || parsedUser.user?._id || parsedUser.id || parsedUser._id;
            const role = parsedUser.user?.role || parsedUser.role || 'patient';
            const userIsAdmin = role === 'admin';
            
            if (isActive) { setUserId(uid); setIsAdmin(userIsAdmin); }

            const backendUrl = userIsAdmin ? `${BASE_URL}/invoices` : `${BASE_URL}/invoices/user/${uid}`;
            const response = await axios.get(backendUrl);
            if (isActive) setInvoices(response.data);

            if (userIsAdmin) {
               const patientsResponse = await axios.get(`${BASE_URL}/user/patients`);
               if (isActive) setPatients(patientsResponse.data);
            }
          }
        } catch (error) { console.log("Fetch error:", error); } 
        finally { if (isActive) setLoading(false); }
      };
      fetchInvoices();
      return () => { isActive = false; };
    }, [])
  );

  const handleProcessPayment = async (invoiceId: string, amount: string) => {
    try {
      // --- NEW WEB LOGIC ---
      if (Platform.OS === 'web') {
        console.log(`1. Requesting web checkout session for $${amount}...`);
        const checkoutRes = await axios.post(`${BASE_URL}/payments/create-checkout-session`, {
          invoiceId, amount, userId
        });
        
        if (checkoutRes.data.url) {
          window.location.href = checkoutRes.data.url; // Redirect to Stripe
        } else {
          window.alert("Could not generate Stripe payment link.");
        }
      } 
      // --- EXISTING MOBILE LOGIC ---
      else {
        console.log(`1. Requesting mobile payment intent for $${amount}...`);
        const intentRes = await axios.post(`${BASE_URL}/payments/create-payment-intent`, { amount });
        const { clientSecret } = intentRes.data;
        
        console.log("2. Client Secret received. Initializing Stripe sheet...");
        const { error: initError } = await initPaymentSheet({
          merchantDisplayName: 'Clinic Connect',
          paymentIntentClientSecret: clientSecret,
        });

        if (initError) { 
          console.error("Stripe Init Error:", initError);
          Alert.alert("Notice", initError.message); 
          return; 
        }

        console.log("3. Presenting payment sheet to user...");
        const { error: paymentError } = await presentPaymentSheet();
        
        if (paymentError) { 
          console.log("Payment Cancelled or Failed:", paymentError);
          Alert.alert("Payment Cancelled", paymentError.message); 
          return; 
        }

        console.log("4. Payment successful! Updating database...");
        const today = new Date().toISOString().split('T')[0];
        const paymentData = { invoiceId, userId, amount: Number(amount), method: 'Card', date: today };

        await axios.post(`${BASE_URL}/payments/pay`, paymentData);
        setInvoices(prev => prev.map(i => i._id === invoiceId ? { ...i, status: 'Paid' } : i));

        Alert.alert("Success", "Payment Successful! Receipt generated.");
      }
    } catch (error) {
      console.log("Payment flow error:", error);
      Alert.alert("Connection Error", "Could not connect to the payment server.");
    }
  };

  const handleDownloadPDF = (invoiceId: string) => {
    const pdfUrl = `${BASE_URL}/invoices/${invoiceId}/pdf`;
    
    // Automatically opens the browser or file downloader
    Linking.openURL(pdfUrl).catch(err => {
      console.error("Error opening link:", err);
      Alert.alert("Download Error", "Could not download the invoice PDF.");
    });
  };

  const openModal = (item: any = null) => {
    if (item) {
      setIsEditing(true); setCurrentId(item._id);
      setFormData({ description: item.description, amount: item.amount.toString(), status: item.status, userId: item.userId });
    } else {
      setIsEditing(false); setFormData({ description: '', amount: '', status: 'Pending', userId: '' });
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (isAdmin && !formData.userId) return Alert.alert("Error", "Please select a patient.");
    try {
      if (isEditing) {
        await axios.put(`${BASE_URL}/invoices/${currentId}`, formData);
        setInvoices(prev => prev.map(i => i._id === currentId ? { ...i, ...formData } : i));
      } else {
        const response = await axios.post(`${BASE_URL}/invoices`, formData);
        setInvoices(prev => [...prev, response.data]);
      }
      setModalVisible(false);
    } catch (error) { console.log(error); }
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Delete Invoice", "Are you sure you want to void this invoice?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          await axios.delete(`${BASE_URL}/invoices/${id}`);
          setInvoices(prev => prev.filter(i => i._id !== id));
      }}
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
            <Text style={styles.headerSubtitle}>{isAdmin ? 'Clinic Management' : 'Your Account'}</Text>
            <Text style={styles.headerTitle}>{isAdmin ? 'All Invoices' : 'My Bills'}</Text>
        </View>
        <Ionicons name="document-text" size={36} color="#4F46E5" style={{ opacity: 0.2 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {loading ? <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} /> : 
          invoices.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>No invoices found.</Text>
            </View>
          ) : (
          invoices.map((item) => (
            <View key={item._id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardIconBox}>
                  <Ionicons name="medkit" size={20} color="#4F46E5" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.title}>{item.description}</Text>
                  {isAdmin && <Text style={styles.patientId}>Patient ID: {item.userId?.substring(0,8)}...</Text>}
                </View>
                <Text style={styles.amount}>${Number(item.amount).toFixed(2)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.cardBottom}>
                <View style={[styles.statusBadge, item.status === 'Paid' ? styles.statusPaid : styles.statusPending]}>
                  <Ionicons name={item.status === 'Paid' ? "checkmark-circle" : "time"} size={14} color={item.status === 'Paid' ? "#059669" : "#D97706"} />
                  <Text style={[styles.statusText, item.status === 'Paid' ? styles.statusTextPaid : styles.statusTextPending]}>
                    {item.status}
                  </Text>
                </View>
                
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.downloadBtn} onPress={() => handleDownloadPDF(item._id)}>
                     <Ionicons name="download-outline" size={18} color="#2563EB" />
                  </TouchableOpacity>

                  {!isAdmin && item.status === 'Pending' && (
                    <TouchableOpacity style={styles.payBtn} onPress={() => handleProcessPayment(item._id, item.amount)}>
                      <Text style={styles.payBtnText}>Pay Now</Text>
                      <Ionicons name="arrow-forward" size={14} color="#FFF" />
                    </TouchableOpacity>
                  )}

                  {isAdmin && (
                    <>
                      <TouchableOpacity onPress={() => openModal(item)} style={styles.iconBtn}><Ionicons name="pencil" size={18} color="#64748B" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.iconBtn}><Ionicons name="trash" size={18} color="#EF4444" /></TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
          )))}

        {isAdmin && (
          <TouchableOpacity style={styles.fab} onPress={() => openModal()}>
            <Ionicons name="add" size={24} color="#FFF" />
            <Text style={styles.fabText}>Create Invoice</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* CREATE/EDIT MODAL */}
      <Modal animationType="slide" transparent={true} visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditing ? "Edit Invoice" : "New Invoice"}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#64748B" /></TouchableOpacity>
            </View>
            
            {isAdmin && (
              <View style={styles.pickerContainer}>
                <Text style={styles.inputLabel}>Assign to Patient</Text>
                <Picker selectedValue={formData.userId} onValueChange={(v) => setFormData({...formData, userId: v})} style={styles.picker}>
                  <Picker.Item label="-- Select a Patient --" value="" color="#94A3B8" />
                  {patients.map((p) => <Picker.Item key={p._id} label={p.name ? `${p.name} (${p.email})` : p.email} value={p._id} />)}
                </Picker>
              </View>
            )}

            <Text style={styles.inputLabel}>Service Description</Text>
            <TextInput style={styles.input} value={formData.description} onChangeText={t => setFormData({...formData, description: t})} placeholder="e.g. Consultation Fee" />
            
            <Text style={styles.inputLabel}>Amount ($)</Text>
            <TextInput style={styles.input} value={formData.amount} onChangeText={t => setFormData({...formData, amount: t})} placeholder="150.00" keyboardType="numeric" />
            
            <TouchableOpacity style={styles.saveModalButton} onPress={handleSave}>
                <Text style={styles.saveModalText}>Save Invoice</Text>
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
  cardIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  title: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  patientId: { fontSize: 13, color: '#94A3B8', marginTop: 4, fontWeight: '600', textTransform: 'uppercase' },
  amount: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 20 },
  
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  statusPending: { backgroundColor: '#FEF3C7' }, statusPaid: { backgroundColor: '#D1FAE5' },
  statusText: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusTextPending: { color: '#D97706' }, statusTextPaid: { color: '#059669' },
  actions: { flexDirection: 'row', gap: 10 },
  payBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4F46E5', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 14, gap: 8, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  payBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  iconBtn: { padding: 10, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  downloadBtn: { padding: 10, backgroundColor: '#EFF6FF', borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE' }, 
  
  fab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', position: 'absolute', bottom: 30, right: 24, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 32, shadowColor: '#10B981', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  fabText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, marginLeft: 10 },
  
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  modalView: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, minHeight: 450, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  modalTitle: { fontSize: 26, fontWeight: '900', color: '#0F172A' },
  inputLabel: { fontSize: 13, fontWeight: '800', color: '#64748B', marginBottom: 10, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 18, fontSize: 16, marginBottom: 24, color: '#1E293B', fontWeight: '500' },
  pickerContainer: { marginBottom: 24, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 10 }, picker: { backgroundColor: 'transparent', height: 55 },
  saveModalButton: { backgroundColor: '#4F46E5', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  saveModalText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});