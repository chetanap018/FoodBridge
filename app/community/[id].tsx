import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, ActivityIndicator, Alert, Modal, FlatList, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

import { Colors } from '@/constants/colors';
import { useApp, useIsDark } from '@/context/AppContext';
import { apiRequest } from '@/lib/query-client';

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { profile } = useApp();

  const [community, setCommunity] = useState<any>(null);
  const [role, setRole] = useState<string>('member');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [peerRequests, setPeerRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsModalVisible, setRequestsModalVisible] = useState(false);

  const bg = isDark ? Colors.dark.background : Colors.background;
  const cardBg = isDark ? Colors.dark.card : Colors.card;
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      const [commsRes, lbRes, reqsRes, peerRes] = await Promise.all([
        apiRequest('GET', `/api/users/${userId}/communities`),
        apiRequest('GET', `/api/community/${id}/leaderboard`),
        apiRequest('GET', `/api/community/${id}/requests`),
        apiRequest('GET', `/api/peer-requests/${id}`)
      ]);

      if (commsRes.ok) {
        const myComms = await commsRes.json();
        const thisComm = myComms.find((c: any) => c.id === id);
        if (thisComm) {
          setCommunity(thisComm);
          setRole(thisComm.role);
        } else {
          // If not in this community, user shouldn't be here
          Alert.alert("Error", "You are not a member of this community.");
          router.back();
          return;
        }
      }

      if (lbRes.ok) setLeaderboard(await lbRes.json());
      if (reqsRes.ok) setRequests(await reqsRes.json());
      if (peerRes.ok) setPeerRequests(await peerRes.json());

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRequestAction = async (reqId: string, status: 'approved' | 'rejected') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const res = await apiRequest('PATCH', `/api/community/requests/${reqId}`, { status });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== reqId));
        if (status === 'approved') {
          // refresh leaderboard as new member joined
          fetchData();
        }
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  if (loading || !community) {
    return (
      <View style={[styles.container, { backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <LinearGradient
        colors={isDark ? ['#0D2E0D', '#1B5E20'] : ['#2E7D32', '#43A047']}
        style={[styles.header, { paddingTop: topPadding + 10 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{community.name}</Text>
        <Text style={styles.headerSubtitle}>{community.type} • {community.address}</Text>
        <Pressable 
          style={({pressed}) => [styles.idBadge, { opacity: pressed ? 0.7 : 1 }]}
          onPress={async () => {
            Haptics.selectionAsync();
            await Clipboard.setStringAsync(community.id);
            Alert.alert("Copied!", "Community ID copied to clipboard.");
          }}
        >
          <Ionicons name="pricetag-outline" size={12} color="#fff" />
          <Text style={styles.idBadgeText}>{community.id}</Text>
          <Ionicons name="copy-outline" size={14} color="#fff" style={{ marginLeft: 4 }} />
        </Pressable>
        
        {role === 'admin' && (
          <Pressable 
            style={({pressed}) => [styles.adminBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => setRequestsModalVisible(true)}
          >
            <Ionicons name="people" size={18} color={Colors.primaryDark} />
            <Text style={styles.adminBtnText}>Manage Requests ({requests.length})</Text>
          </Pressable>
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable 
            onPress={() => router.push({ pathname: '/create-request', params: { communityId: id, communityName: community.name } })}
            style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="hand-left-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Ask for Food</Text>
          </Pressable>
          <Pressable 
            onPress={() => router.push({ pathname: '/create-donation', params: { communityId: id, communityName: community.name } })}
            style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="heart-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Donate Food</Text>
          </Pressable>
        </View>

        {/* Peer Requests */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Community Requests</Text>
          {peerRequests.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: border, padding: 24 }]}>
               <Ionicons name="restaurant-outline" size={32} color={Colors.textLight} />
               <Text style={[styles.emptyText, { color: textSecondary }]}>No active requests here.</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {peerRequests.map(req => (
                <Pressable 
                  key={req.id} 
                  onPress={() => router.push(`/request/${req.id}` as any)}
                  style={({pressed}) => [
                    { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: cardBg, borderWidth: 1, borderColor: border, borderRadius: 12 },
                    pressed && { opacity: 0.8 }
                  ]}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(233, 30, 99, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="basket-outline" size={20} color={Colors.accent} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: textPrimary }} numberOfLines={1}>{req.title || req.itemName}</Text>
                    <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: textSecondary }}>Needs {req.quantity} {req.unit}</Text>
                  </View>
                  <View style={{ backgroundColor: Colors.accent + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: Colors.accent, fontFamily: 'Poppins_600SemiBold', fontSize: 11 }}>{req.urgency || 'Requested'}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Leaderboard Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Top Donors Leaderboard</Text>
          
          {leaderboard.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: border }]}>
              <Ionicons name="trophy-outline" size={40} color={Colors.textLight} />
              <Text style={[styles.emptyText, { color: textSecondary }]}>No donors yet in this community.</Text>
            </View>
          ) : (
            <View style={[styles.leaderboardCard, { backgroundColor: cardBg, borderColor: border }]}>
              {leaderboard.slice(0, 10).map((user, index) => (
                <Pressable 
                  key={user.id} 
                  onPress={() => router.push(`/user/${user.id}` as any)}
                  style={({pressed}) => [
                    styles.lbRow, 
                    index < leaderboard.length - 1 && { borderBottomColor: border, borderBottomWidth: 1 },
                    pressed && { backgroundColor: isDark ? '#333' : '#F5F5F5' }
                  ]}
                >
                  <Text style={[styles.lbRank, { color: index < 3 ? Colors.primary : textSecondary }]}>#{index + 1}</Text>
                  <View style={[styles.avatar, { backgroundColor: isDark ? '#333' : '#EEE', overflow: 'hidden' }]}>
                    {user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:')) ? (
                      <Image source={{ uri: user.avatar }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Text style={styles.avatarText}>{user.name ? user.name.charAt(0).toUpperCase() : '?'}</Text>
                    )}
                  </View>
                  <Text style={[styles.lbName, { color: textPrimary }]} numberOfLines={1}>{user.name || 'Anonymous'}</Text>
                  <View style={styles.lbScoreWrap}>
                    <Ionicons name="heart" size={14} color={Colors.accent} />
                    <Text style={[styles.lbScore, { color: textPrimary }]}>{user.donationsMade}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Admin Requests Modal */}
      <Modal visible={requestsModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRequestsModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: bg }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>Join Requests</Text>
            <Pressable onPress={() => setRequestsModalVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={textPrimary} />
            </Pressable>
          </View>
          
          {requests.length === 0 ? (
             <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: border, margin: 20 }]}>
               <Ionicons name="checkmark-circle-outline" size={40} color={Colors.textLight} />
               <Text style={[styles.emptyText, { color: textSecondary }]}>No pending requests.</Text>
             </View>
          ) : (
            <FlatList
              data={requests}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 20, gap: 12 }}
              renderItem={({ item }) => (
                <View style={[styles.requestCard, { backgroundColor: cardBg, borderColor: border }]}>
                  <Pressable style={{ flex: 1 }} onPress={() => { setRequestsModalVisible(false); router.push(`/user/${item.user.id}` as any); }}>
                    <Text style={[styles.reqName, { color: textPrimary }]}>{item.user.name || 'Anonymous'}</Text>
                    <Text style={[styles.reqEmail, { color: textSecondary }]}>{item.user.email}</Text>
                  </Pressable>
                  <View style={styles.reqActions}>
                    <Pressable 
                      style={[styles.reqBtn, { backgroundColor: '#F44336' }]}
                      onPress={() => handleRequestAction(item.id, 'rejected')}
                    >
                      <Ionicons name="close" size={20} color="#fff" />
                    </Pressable>
                    <Pressable 
                      style={[styles.reqBtn, { backgroundColor: Colors.primary }]}
                      onPress={() => handleRequestAction(item.id, 'approved')}
                    >
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
  backBtn: { alignSelf: 'flex-start', paddingBottom: 8 },
  headerTitle: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 26 },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontFamily: 'Poppins_500Medium', fontSize: 14 },
  idBadge: { backgroundColor: 'rgba(0,0,0,0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  idBadgeText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  adminBtn: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, alignSelf: 'flex-start', marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  adminBtnText: { color: Colors.primaryDark, fontFamily: 'Poppins_700Bold', fontSize: 13 },
  content: { padding: 16, gap: 24 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  section: { gap: 12 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17 },
  leaderboardCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  lbRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  lbRank: { fontFamily: 'Poppins_700Bold', fontSize: 16, width: 24 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#666' },
  lbName: { flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 15 },
  lbScoreWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(233, 30, 99, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  lbScore: { fontFamily: 'Poppins_700Bold', fontSize: 14 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.2)' },
  modalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20 },
  closeBtn: { padding: 4 },
  requestCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  reqName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  reqEmail: { fontFamily: 'Poppins_400Regular', fontSize: 13 },
  reqActions: { flexDirection: 'row', gap: 8 },
  reqBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
