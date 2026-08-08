import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useIsDark } from '@/context/AppContext';
import { apiRequest } from '@/lib/query-client';

export default function RequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  
  const bg = isDark ? Colors.dark.background : Colors.background;
  const cardBg = isDark ? Colors.dark.card : '#fff';
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      const res = await apiRequest('GET', `/api/peer-request/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        Alert.alert('Error', 'Could not load request details');
        router.back();
      }
    } catch (err) {
      Alert.alert('Error', 'Network error');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const { peerRequest: req, donor: user, community } = data;
  const meta = req.metadata || {};

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Request Details</Text>
        <Pressable onPress={() => {}} style={styles.backBtn}>
          <Ionicons name="share-outline" size={24} color={textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Requester Profile Summary */}
        <Pressable 
          onPress={() => router.push(`/user/${user?.id}` as any)}
          style={({pressed}) => [
            styles.card, 
            { backgroundColor: cardBg, borderColor: border },
            pressed && { opacity: 0.8 }
          ]}
        >
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.donorName, { color: textPrimary }]}>{user?.name || 'Community Member'}</Text>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              </View>
              {community && <Text style={[styles.donorCat, { color: textSecondary }]}>{community.name}</Text>}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="star" size={14} color="#FFC107" />
                  <Text style={{ fontSize: 13, color: textSecondary, fontFamily: 'Poppins_500Medium' }}>4.8</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="gift-outline" size={14} color={Colors.accent} />
                  <Text style={{ fontSize: 13, color: textSecondary, fontFamily: 'Poppins_500Medium' }}>15 Provided</Text>
                </View>
              </View>
            </View>
          </View>
        </Pressable>

        {/* Request Title & Overview */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border, gap: 12 }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.itemTitle, { color: textPrimary }]}>{req.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: req.urgency.includes('Urgent') ? '#FF525220' : Colors.accent + '20' }]}>
              <Text style={[styles.statusText, { color: req.urgency.includes('Urgent') ? '#FF5252' : Colors.accent }]}>{req.urgency}</Text>
            </View>
          </View>
          
          {meta.description ? (
            <Text style={[styles.description, { color: textSecondary }]}>{meta.description}</Text>
          ) : null}

          <View style={styles.tagsRow}>
            <View style={[styles.tag, { backgroundColor: Colors.accent + '20' }]}>
              <Text style={[styles.tagText, { color: Colors.accent }]}>{req.foodCategory}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: Colors.textLight + '30' }]}>
              <Text style={[styles.tagText, { color: textPrimary }]}>{req.visibility}</Text>
            </View>
          </View>
        </View>

        {/* Food & Quantity Details */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Food Required</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="fast-food-outline" size={20} color={Colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailLabel, { color: textSecondary }]}>Specific Food Name</Text>
              <Text style={[styles.detailValue, { color: textPrimary }]}>{req.itemName}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="scale-outline" size={20} color={Colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailLabel, { color: textSecondary }]}>Quantity Needed</Text>
              <Text style={[styles.detailValue, { color: textPrimary }]}>{req.quantity} {req.unit}</Text>
            </View>
          </View>
          
          {meta.peopleCount && (
            <View style={styles.detailRow}>
              <Ionicons name="people-outline" size={20} color={Colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailLabel, { color: textSecondary }]}>For How Many?</Text>
                <Text style={[styles.detailValue, { color: textPrimary }]}>{meta.peopleCount}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Pickup Details */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Pickup Logistics</Text>
          
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={20} color={Colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailLabel, { color: textSecondary }]}>Location</Text>
              <Text style={[styles.detailValue, { color: textPrimary }]}>{meta.pickupLocation || 'Unspecified'}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={20} color={Colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailLabel, { color: textSecondary }]}>Preferred Time</Text>
              <Text style={[styles.detailValue, { color: textPrimary }]}>{meta.pickupTime || 'Anytime'}</Text>
            </View>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={20} color={Colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.detailLabel, { color: textSecondary }]}>Contact Person</Text>
              <Text style={[styles.detailValue, { color: textPrimary }]}>{meta.contactPerson || user?.name || 'Unknown'}</Text>
            </View>
          </View>
        </View>

        {/* Timeline & Meta */}
        <View style={styles.timelineRow}>
          <Ionicons name="calendar-outline" size={16} color={textSecondary} />
          <Text style={[styles.timelineText, { color: textSecondary }]}>Posted {new Date(req.createdAt).toLocaleString()}</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Bar */}
      <View style={[styles.actionContainer, { paddingBottom: Math.max(insets.bottom, 20), borderTopColor: border, backgroundColor: bg }]}>
        <Pressable style={({pressed}) => [styles.iconBtn, { borderColor: border, backgroundColor: cardBg, opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="chatbubble-outline" size={24} color={Colors.accent} />
        </Pressable>
        <Pressable style={({pressed}) => [styles.offerBtn, { opacity: pressed ? 0.8 : 1 }]} onPress={() => Alert.alert('Offer Initiated', 'You are now offering food for this request!')}>
          <Ionicons name="heart" size={20} color="#fff" />
          <Text style={styles.offerBtnText}>Offer Food</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
  content: { padding: 16, gap: 16 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 20 },
  donorName: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  donorCat: { fontFamily: 'Poppins_400Regular', fontSize: 13 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  itemTitle: { flex: 1, fontFamily: 'Poppins_700Bold', fontSize: 20, lineHeight: 28 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  description: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tagText: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, marginBottom: 16 },
  detailRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  detailLabel: { fontFamily: 'Poppins_400Regular', fontSize: 13 },
  detailValue: { fontFamily: 'Poppins_500Medium', fontSize: 15, marginTop: 2 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16 },
  timelineText: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  actionContainer: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, position: 'absolute', bottom: 0, left: 0, right: 0 },
  iconBtn: { width: 56, height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  offerBtn: { flex: 1, backgroundColor: Colors.accent, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  offerBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 },
});
