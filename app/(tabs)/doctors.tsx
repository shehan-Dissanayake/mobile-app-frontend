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

