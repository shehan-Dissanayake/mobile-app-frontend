import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:5000/api' 
  : 'http://10.233.96.81:5000/api';



export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('userInfo');
      if (!storedUser) return;

      const parsedUser = JSON.parse(storedUser);
      const userId = parsedUser.user?.id || parsedUser.user?._id || parsedUser.id || parsedUser._id;

      // Fetch real notifications for this specific user
      const response = await axios.get(`${BASE_URL}/notifications/user/${userId}`);
      setNotifications(response.data);
    } catch (error) {
      console.log("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string, isRead: boolean) => {
    if (isRead) return; // Don't do anything if it's already read

    try {
      // Update the database
      await axios.put(`${BASE_URL}/notifications/read/${notificationId}`);
      
      // Update the UI instantly without reloading
      setNotifications(prev => 
        prev.map(noti => noti._id === notificationId ? { ...noti, isRead: true } : noti)
      );
    } catch (error) {
      console.log("Error marking as read", error);
    }
  };

  // Format the MongoDB timestamp into a readable format
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {notifications.length === 0 ? (
            <View style={styles.centerContent}>
              <Ionicons name="notifications-off-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>You have no new notifications.</Text>
            </View>
          ) : (
            notifications.map((noti) => (
              <TouchableOpacity 
                key={noti._id} 
                style={[styles.notificationCard, noti.isRead ? styles.readCard : styles.unreadCard]}
                onPress={() => markAsRead(noti._id, noti.isRead)}
              >
                {!noti.isRead && <View style={styles.unreadDot} />}
                <View style={styles.textContainer}>
                  <Text style={[styles.notiTitle, noti.isRead && styles.readText]}>{noti.title}</Text>
                  <Text style={styles.notiMessage}>{noti.message}</Text>
                  <Text style={styles.timeText}>{formatTime(noti.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backButton: { marginRight: 16, padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  content: { padding: 20 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#64748B', fontWeight: '500' },
  notificationCard: { padding: 16, borderRadius: 12, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  unreadCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E7FF' },
  readCard: { backgroundColor: '#F1F5F9' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4F46E5', marginTop: 6, marginRight: 12 },
  textContainer: { flex: 1 },
  notiTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  readText: { color: '#64748B' },
  notiMessage: { fontSize: 14, color: '#475569', marginBottom: 8, lineHeight: 20 },
  timeText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' }
});