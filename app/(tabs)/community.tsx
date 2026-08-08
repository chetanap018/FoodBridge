import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Platform, ActivityIndicator, Alert, RefreshControl, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

import { Colors } from '@/constants/colors';
import { useApp, useIsDark } from '@/context/AppContext';
import { apiRequest } from '@/lib/query-client';

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { profile } = useApp();
  
  const [myCommunities, setMyCommunities] = useState<any[]>([]);
  const [discoverCommunities, setDiscoverCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const bg = isDark ? Colors.dark.background : Colors.background;
  const cardBg = isDark ? Colors.dark.card : Colors.card;
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      const [myCommsRes, allCommsRes] = await Promise.all([
        apiRequest('GET', `/api/users/${userId}/communities`),
        apiRequest('GET', `/api/communities`)
      ]);

      const myComms = myCommsRes.ok ? await myCommsRes.json() : [];
      const allComms = allCommsRes.ok ? await allCommsRes.json() : [];

      setMyCommunities(myComms);
      
      const myCommIds = new Set(myComms.map((c: any) => c.id));
      setDiscoverCommunities(allComms.filter((c: any) => !myCommIds.has(c.id)));
    } catch (err) {
      console.error("Failed to load community data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleJoin = async (community: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setJoiningId(community.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const res = await apiRequest('POST', `/api/community/${community.id}/join`, {
        userId: session.user.id
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.status === 'joined') {
          Alert.alert("Success", `You have successfully joined ${community.name}!`);
          fetchData();
        } else {
          Alert.alert("Request Sent", `Your request to join ${community.name} has been sent to the admin.`);
        }
      } else {
        throw new Error(data.error || "Failed to join");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setJoiningId(null);
    }
  };

  const filteredMyCommunities = useMemo(() => {
    if (!searchQuery) return myCommunities;
    const q = searchQuery.toLowerCase();
    return myCommunities.filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [myCommunities, searchQuery]);

  const filteredDiscoverCommunities = useMemo(() => {
    if (!searchQuery) return discoverCommunities;
    const q = searchQuery.toLowerCase();
    return discoverCommunities.filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [discoverCommunities, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <LinearGradient
        colors={isDark ? ['#0D2E0D', '#1B5E20'] : ['#2E7D32', '#43A047']}
        style={[styles.header, { paddingTop: topPadding + 20 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Communities</Text>
            <Text style={styles.headerSubtitle}>Connect with neighbors and share</Text>
          </View>
          <Pressable 
            style={({pressed}) => [styles.createBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={() => router.push('/create-community')}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.createBtnText}>Create</Text>
          </Pressable>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or unique ID..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* My Communities */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>My Communities</Text>
              {filteredMyCommunities.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: border }]}>
                  <Ionicons name="people-outline" size={40} color={Colors.textLight} />
                  <Text style={[styles.emptyText, { color: textSecondary }]}>No communities found.</Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {filteredMyCommunities.map(comm => (
                    <Pressable 
                      key={comm.id} 
                      style={({pressed}) => [styles.communityCard, { backgroundColor: cardBg, borderColor: border, opacity: pressed ? 0.9 : 1 }]}
                      onPress={() => router.push(`/community/${comm.id}` as any)}
                    >
                      <View style={[styles.commIcon, { backgroundColor: Colors.primary + '20' }]}>
                        <Ionicons name="business" size={24} color={Colors.primary} />
                      </View>
                      <View style={styles.commInfo}>
                        <Text style={[styles.commName, { color: textPrimary }]}>{comm.name}</Text>
                        <Text style={[styles.commType, { color: textSecondary }]}>{comm.type} • {comm.role === 'admin' ? 'Admin' : 'Member'}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Discover Communities */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Discover Communities</Text>
              {filteredDiscoverCommunities.length === 0 ? (
                 <Text style={{ color: textSecondary, fontSize: 14 }}>No new communities to discover.</Text>
              ) : (
                <View style={styles.list}>
                  {filteredDiscoverCommunities.map(comm => (
                    <View key={comm.id} style={[styles.communityCard, { backgroundColor: cardBg, borderColor: border }]}>
                      <View style={[styles.commIcon, { backgroundColor: isDark ? '#333' : '#F5F5F5' }]}>
                        <Ionicons name="compass-outline" size={24} color={textSecondary} />
                      </View>
                      <View style={styles.commInfo}>
                        <Text style={[styles.commName, { color: textPrimary }]}>{comm.name}</Text>
                        <Text style={[styles.commType, { color: textSecondary }]}>
                          {comm.type} • {comm.memberCount} members
                        </Text>
                        {comm.joinType === 'request' && (
                          <Text style={[styles.joinBadge, { color: '#F57C00' }]}>Requires Approval</Text>
                        )}
                      </View>
                      <Pressable 
                        style={({pressed}) => [styles.joinBtn, { opacity: pressed || joiningId === comm.id ? 0.7 : 1 }]}
                        onPress={() => handleJoin(comm)}
                        disabled={joiningId === comm.id}
                      >
                        {joiningId === comm.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.joinBtnText}>Join</Text>
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 26 },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 4 },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 4 },
  createBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, marginTop: 16, height: 44, gap: 8 },
  searchInput: { flex: 1, color: '#fff', fontFamily: 'Poppins_400Regular', fontSize: 14, height: '100%' },
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 28 },
  section: { gap: 12 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  list: { gap: 12 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center' },
  communityCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 },
  commIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  commInfo: { flex: 1, gap: 2 },
  commName: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  commType: { fontFamily: 'Poppins_400Regular', fontSize: 13 },
  joinBadge: { fontFamily: 'Poppins_500Medium', fontSize: 11, marginTop: 2 },
  joinBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  joinBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
});
