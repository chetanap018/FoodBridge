import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useApp, useIsDark, DonationListing } from '@/context/AppContext';
import { apiRequest } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

type TabType = 'donate' | 'find';

const DONATION_TYPE_ICONS: Record<string, string> = {
  vegetables: 'leaf-outline',
  bread: 'nutrition-outline',
  canned: 'cube-outline',
  dairy: 'water-outline',
  mixed: 'basket-outline',
};

const DONATION_TYPE_COLORS: Record<string, string> = {
  vegetables: '#2E7D32',
  bread: '#FF8F00',
  canned: '#1565C0',
  dairy: '#6A1B9A',
  mixed: '#00838F',
};

function NearbyCard({ listing, isDark }: { listing: DonationListing; isDark: boolean }) {
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const cardBg = isDark ? Colors.dark.card : '#fff';
  const border = isDark ? Colors.dark.border : Colors.border;
  const typeColor = DONATION_TYPE_COLORS[listing.type];

  return (
    <Pressable 
      onPress={() => router.push(`/donation/${listing.id}`)}
      style={({pressed}) => [styles.nearbyCard, { backgroundColor: cardBg, borderColor: border, opacity: pressed ? 0.9 : 1 }]}
    >
      <View style={[styles.nearbyIcon, { backgroundColor: typeColor + '18' }]}>
        <Ionicons name={DONATION_TYPE_ICONS[listing.type] as any} size={22} color={typeColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.nearbyTitle, { color: textPrimary }]}>{listing.title}</Text>
        <Text style={[styles.nearbyDonor, { color: textSecondary }]}>{listing.donorName}</Text>
        <View style={styles.nearbyMeta}>
          <Ionicons name="location-outline" size={13} color={Colors.textLight} />
          <Text style={[styles.nearbyMetaText, { color: Colors.textLight }]}>{listing.distance} away</Text>
          <Text style={[styles.nearbyMetaText, { color: Colors.textLight }]}>· {listing.postedAt}</Text>
        </View>
      </View>
      <Pressable
        onPress={() => router.push(`/donation/${listing.id}`)}
        style={({ pressed }) => [
          styles.requestBtn,
          { backgroundColor: Colors.primary, opacity: pressed ? 0.85 : 1 }
        ]}
      >
        <Text style={[styles.requestBtnText, { color: '#fff' }]}>
          View
        </Text>
      </Pressable>
    </Pressable>
  );
}

export default function DonateScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { profile, pantryItems, getExpiryStatus, getDaysRemaining, postDonation, removeFoodItem } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('donate');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  
  // Community selection state
  const [communityModalVisible, setCommunityModalVisible] = useState(false);
  const [myCommunities, setMyCommunities] = useState<any[]>([]);

  // Radar donations state
  const [radarDonations, setRadarDonations] = useState<any[]>([]);

  // Donation Notes
  const [donationNotes, setDonationNotes] = useState('');

  // Restrict tabs based on role
  useFocusEffect(
    React.useCallback(() => {
      if (profile.role === 'Receiver' && activeTab !== 'find') {
        setActiveTab('find');
      } else if (profile.role === 'Donor' && activeTab !== 'donate') {
        setActiveTab('donate');
      }
    }, [profile.role, activeTab])
  );

  useFocusEffect(
    React.useCallback(() => {
      const fetchData = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          
          const commsRes = await apiRequest('GET', `/api/users/${session.user.id}/communities`);
          if (commsRes.ok) {
            setMyCommunities(await commsRes.json());
          }

          const radarRes = await apiRequest('GET', `/api/donations/radar?userId=${session.user.id}`);
          if (radarRes.ok) {
            setRadarDonations(await radarRes.json());
          }
        } catch {
          // Silently handle network errors — radar data is non-critical
        }
      };
      fetchData();
    }, [])
  );

  const donationItems = [...pantryItems]
    .filter(item => getDaysRemaining(item.expiryDate) >= 0)
    .sort((a, b) => {
      const daysA = getDaysRemaining(a.expiryDate);
      const daysB = getDaysRemaining(b.expiryDate);
      
      const isExpiringA = daysA <= 6;
      const isExpiringB = daysB <= 6;

      if (isExpiringA && !isExpiringB) return -1;
      if (!isExpiringA && isExpiringB) return 1;
      
      if (isExpiringA && isExpiringB) {
        return daysA - daysB;
      }
      
      const qtyA = parseFloat(a.quantity) || 0;
      const qtyB = parseFloat(b.quantity) || 0;
      return qtyB - qtyA;
    });

  const bg = isDark ? Colors.dark.background : Colors.background;
  const cardBg = isDark ? Colors.dark.card : '#fff';
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const EXPIRY_COLORS: Record<string, string> = {
    fresh: Colors.expiry.fresh,
    good: Colors.expiry.good,
    warning: Colors.expiry.warning,
    danger: Colors.expiry.danger,
    expired: Colors.expiry.expired,
  };

  const toggleItem = (id: string) => {
    Haptics.selectionAsync();
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePostInitiate = () => {
    if (selectedItems.size === 0) {
      Alert.alert('Select Items', 'Please select at least one item to donate.');
      return;
    }
    setCommunityModalVisible(true);
  };

  const confirmPost = (communityId?: string) => {
    setCommunityModalVisible(false);
    const items = pantryItems.filter(i => selectedItems.has(i.id)).map(i => i.name);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Post the donation with notes
    postDonation(Array.from(selectedItems), donationNotes, communityId);
    
    // Sync logic
    selectedItems.forEach(id => removeFoodItem(id));
    
    setSelectedItems(new Set());
    setDonationNotes('');
    Alert.alert('Donation Posted!', `Your donation of ${items.join(', ')} has been posted.`);
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: isDark ? Colors.dark.card : Colors.accent }]}>
        <Text style={styles.headerTitle}>Community Food</Text>
        <Text style={styles.headerSubtitle}>Share surplus food with those who need it</Text>

        {/* Tabs */}
        {(profile.role === 'Volunteer' || profile.userCategory === 'Household') && (
          <View style={[styles.tabBar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            {[{ key: 'donate', label: 'Donate Food', icon: 'heart-outline' }, { key: 'find', label: 'Find Food', icon: 'search-outline' }].map(tab => {
              if (profile.role === 'Donor' && tab.key === 'find') return null;
              if (profile.role === 'Receiver' && tab.key === 'donate') return null;

              return (
                <Pressable
                  key={tab.key}
                  onPress={() => { Haptics.selectionAsync(); setActiveTab(tab.key as TabType); }}
                  style={[styles.tabItem, { backgroundColor: activeTab === tab.key ? '#fff' : 'transparent' }]}
                >
                  <Ionicons name={tab.icon as any} size={15} color={activeTab === tab.key ? Colors.accent : 'rgba(255,255,255,0.8)'} />
                  <Text style={[styles.tabLabel, { color: activeTab === tab.key ? Colors.accent : 'rgba(255,255,255,0.9)' }]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === 'web' ? 120 : 100 }]}
      >
        {activeTab === 'donate' ? (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <View>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>Your Pantry Items</Text>
                <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>Select items to donate (expiring soon prioritized)</Text>
              </View>
              {profile.userCategory === 'Pure Donor' && (
                <Pressable onPress={() => router.push('/bulk-donate')} style={[styles.bulkBtn, { backgroundColor: Colors.primary }]}>
                  <Ionicons name="cube" size={16} color="#fff" />
                  <Text style={styles.bulkBtnText}>Bulk Donate</Text>
                </Pressable>
              )}
            </View>

            {donationItems.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: border }]}>
                <Ionicons name="checkmark-circle-outline" size={40} color={Colors.primary} />
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>Pantry is empty</Text>
                <Text style={[styles.emptyText, { color: textSecondary }]}>Add food items to donate them.</Text>
              </View>
            ) : (
              donationItems.map(item => {
                const status = getExpiryStatus(item.expiryDate);
                const days = getDaysRemaining(item.expiryDate);
                const isSelected = selectedItems.has(item.id);
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => toggleItem(item.id)}
                    style={[
                      styles.donateItem,
                      {
                        backgroundColor: isSelected ? '#E8F5E9' : cardBg,
                        borderColor: isSelected ? Colors.primary : border,
                        borderWidth: isSelected ? 2 : 1,
                      }
                    ]}
                  >
                    <View style={[styles.checkbox, { borderColor: isSelected ? Colors.primary : Colors.textLight, backgroundColor: isSelected ? Colors.primary : 'transparent' }]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, { color: textPrimary }]}>{item.name}</Text>
                      <Text style={[styles.itemMeta, { color: textSecondary }]}>{item.quantity}{item.unit} · {item.storageLocation}</Text>
                    </View>
                    <View style={[styles.expiryTag, { backgroundColor: EXPIRY_COLORS[status] }]}>
                      <Text style={styles.expiryTagText}>
                        {days === 0 ? 'Today' : `${days}d left`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}

            {selectedItems.size > 0 && (
              <Pressable
                onPress={handlePostInitiate}
                style={({ pressed }) => [styles.postBtn, { opacity: pressed ? 0.9 : 1 }]}
              >
                <Ionicons name="heart" size={18} color="#fff" />
                <Text style={styles.postBtnText}>Post Donation ({selectedItems.size} items)</Text>
              </Pressable>
            )}

            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
              <Text style={[styles.infoText, { color: textSecondary }]}>
                Donations are picked up or available for drop-off at your nearest community point.
              </Text>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Available Nearby</Text>
            <Text style={[styles.sectionSubtitle, { color: textSecondary }]}>Free food available in your community and NGOs</Text>
            {radarDonations.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: border, marginTop: 20 }]}>
                <Ionicons name="search-outline" size={40} color={Colors.primary} />
                <Text style={[styles.emptyTitle, { color: textPrimary }]}>No donations found</Text>
                <Text style={[styles.emptyText, { color: textSecondary }]}>Check back later or change your location.</Text>
              </View>
            ) : (
              radarDonations.map(listing => (
                <NearbyCard key={listing.id} listing={listing} isDark={isDark} />
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Community Selection Modal */}
      <Modal visible={communityModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>Donation Details</Text>
            
            <View style={styles.notesContainer}>
              <Text style={[styles.modalSub, { color: textSecondary, alignSelf: 'flex-start' }]}>Additional Notes / Pickup Instructions:</Text>
              <TextInput 
                style={[styles.notesInput, { color: textPrimary, borderColor: border }]}
                placeholder="E.g., Pickup after 5 PM, call when at gate..."
                placeholderTextColor={Colors.textLight}
                value={donationNotes}
                onChangeText={setDonationNotes}
                multiline
              />
            </View>

            <Text style={[styles.modalSub, { color: textSecondary, marginTop: 16 }]}>Select an audience for this donation:</Text>

            <ScrollView style={{ maxHeight: 250, width: '100%', marginVertical: 12 }}>
              {myCommunities.map(comm => (
                <Pressable
                  key={comm.id}
                  style={[styles.commOption, { borderColor: border }]}
                  onPress={() => confirmPost(comm.id)}
                >
                  <Ionicons name="business" size={20} color={Colors.primary} />
                  <View>
                    <Text style={[styles.commName, { color: textPrimary }]}>{comm.name}</Text>
                    <Text style={{ color: textSecondary, fontSize: 12 }}>Only members can see this.</Text>
                  </View>
                </Pressable>
              ))}

              <Pressable
                style={[styles.commOption, { borderColor: border }]}
                onPress={() => confirmPost(undefined)}
              >
                <Ionicons name="globe-outline" size={20} color={Colors.accent} />
                <View>
                  <Text style={[styles.commName, { color: textPrimary }]}>Global / NGOs (Public)</Text>
                  <Text style={{ color: textSecondary, fontSize: 12 }}>Visible to charities & public nearby.</Text>
                </View>
              </Pressable>
            </ScrollView>

            <Pressable onPress={() => setCommunityModalVisible(false)} style={styles.cancelBtn}>
              <Text style={{ color: textSecondary, fontFamily: 'Poppins_600SemiBold' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 22 },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontFamily: 'Poppins_400Regular', fontSize: 13, marginBottom: 14 },
  tabBar: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 10 },
  tabLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  listContent: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, marginBottom: 4 },
  sectionSubtitle: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginBottom: 12 },
  donateItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  itemMeta: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 2 },
  expiryTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  expiryTagText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 11 },
  postBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, marginTop: 8 },
  postBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginTop: 8 },
  infoText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 20 },
  nearbyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, borderWidth: 1 },
  nearbyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  nearbyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  nearbyDonor: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 2 },
  nearbyMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  nearbyMetaText: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
  requestBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  requestBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  emptyCard: { alignItems: 'center', gap: 8, borderRadius: 16, padding: 32, borderWidth: 1 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 13, textAlign: 'center' },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  bulkBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, alignItems: 'center' },
  modalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20 },
  modalSub: { fontFamily: 'Poppins_400Regular', fontSize: 14, marginTop: 4 },
  notesContainer: { width: '100%', marginTop: 16 },
  notesInput: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 8, fontFamily: 'Poppins_400Regular', fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  commOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1, borderRadius: 12, marginBottom: 8 },
  commName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  cancelBtn: { padding: 16, width: '100%', alignItems: 'center' },
});
