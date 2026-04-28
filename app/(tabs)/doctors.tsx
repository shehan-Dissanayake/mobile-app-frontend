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

