import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useIsDark } from '@/context/AppContext';
import { apiRequest } from '@/lib/query-client';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  
  const bg = isDark ? Colors.dark.background : Colors.background;
  const cardBg = isDark ? Colors.dark.card : '#fff';
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      const res = await apiRequest('GET', `/api/users/${id}`);
      if (res.ok) {
        const json = await res.json();
        setUser(json);
      } else {
        Alert.alert('Error', 'Could not load user profile');
        router.back();
      }
    } catch (err) {
      Alert.alert('Error', 'Network error');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const roleLabel = user.userCategory || user.role || 'Community Member';

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarContainer, { backgroundColor: isDark ? '#333' : '#eee', borderColor: Colors.accent }]}>
            {user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:')) ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{user.name ? user.name.charAt(0).toUpperCase() : '?'}</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 }}>
            <Text style={[styles.userName, { color: textPrimary }]}>{user.name || 'Anonymous'}</Text>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          </View>
          <Text style={[styles.userRole, { color: textSecondary }]}>{roleLabel}</Text>
          {user.buildingName && (
            <Text style={[styles.userLocation, { color: textSecondary }]}><Ionicons name="location" size={14} /> {user.buildingName}</Text>
          )}
        </View>

        {/* Badges */}
        <View style={[styles.badgesContainer, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={styles.badgeItem}>
            <Ionicons name="star" size={24} color="#FFC107" />
            <Text style={[styles.badgeValue, { color: textPrimary }]}>{user.trustScore?.toFixed(1) || '4.8'}</Text>
            <Text style={[styles.badgeLabel, { color: textSecondary }]}>Trust Score</Text>
          </View>
          <View style={styles.badgeDivider} />
          <View style={styles.badgeItem}>
            <Ionicons name="calendar" size={24} color={Colors.accent} />
            <Text style={[styles.badgeValue, { color: textPrimary }]}>{new Date(user.createdAt).getFullYear()}</Text>
            <Text style={[styles.badgeLabel, { color: textSecondary }]}>Joined</Text>
          </View>
          <View style={styles.badgeDivider} />
          <View style={styles.badgeItem}>
            <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
            <Text style={[styles.badgeValue, { color: textPrimary }]}>Verified</Text>
            <Text style={[styles.badgeLabel, { color: textSecondary }]}>Status</Text>
          </View>
        </View>

        {/* Achievements */}
        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Impact & Achievements</Text>
        
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Ionicons name="restaurant-outline" size={32} color={Colors.accent} />
            <Text style={[styles.statValue, { color: textPrimary }]}>{user.mealsProvided || 0}</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Meals Shared</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Ionicons name="heart-outline" size={32} color={Colors.primary} />
            <Text style={[styles.statValue, { color: textPrimary }]}>{user.donationsMade || 0}</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Donations</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Ionicons name="leaf-outline" size={32} color="#4CAF50" />
            <Text style={[styles.statValue, { color: textPrimary }]}>{user.foodSaved || 0}kg</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Food Saved</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Ionicons name="cloud-outline" size={32} color="#03A9F4" />
            <Text style={[styles.statValue, { color: textPrimary }]}>{user.co2Reduced || 0}kg</Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>CO₂ Reduced</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
  content: { padding: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 24 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontFamily: 'Poppins_700Bold', fontSize: 40, color: '#666' },
  userName: { fontFamily: 'Poppins_700Bold', fontSize: 24 },
  userRole: { fontFamily: 'Poppins_500Medium', fontSize: 15, marginTop: 4 },
  userLocation: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 4 },
  badgesContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  badgeItem: { alignItems: 'center', flex: 1 },
  badgeValue: { fontFamily: 'Poppins_700Bold', fontSize: 16, marginTop: 8 },
  badgeLabel: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  badgeDivider: { width: 1, backgroundColor: 'rgba(150,150,150,0.2)' },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  statCard: { flex: 1, minWidth: '45%', padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 8 },
  statValue: { fontFamily: 'Poppins_700Bold', fontSize: 24 },
  statLabel: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
});
