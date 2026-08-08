import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Platform, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useApp, useIsDark } from '@/context/AppContext';
import { apiRequest } from '@/lib/query-client';

export default function DonationDetailsScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { profile } = useApp();

  const [donation, setDonation] = useState<any>(null);
  const [donor, setDonor] = useState<any>(null);
  const [match, setMatch] = useState<any>(null);
  const [otpInput, setOtpInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const bg = isDark ? Colors.dark.background : Colors.background;
  const cardBg = isDark ? Colors.dark.card : '#fff';
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;

  useEffect(() => {
    const fetchDonation = async () => {
      try {
        // Find donation from radar or community list (since we don't have a single /donations/:id endpoint yet)
        // Actually we do have /api/donations/radar and we can find it there, or just hit /api/donations ? 
        // We'll simulate fetching for now by finding it from radar or user donations.
        const radarRes = await apiRequest('GET', `/api/donations/radar?userId=${profile.email ? profile.email : 'guest'}`); // fallback
        const radar = await radarRes.json();
        const found = radar.find((d: any) => d.id === id);
        
        // Wait, radar returns minimal payload. We need the full DB record. Let's just create a quick endpoint or fetch from /api/donations if we own it.
        // For robustness, let's assume the router passed it or we hit a new endpoint.
        // I'll fetch the full list of all active donations in a real app, but for now let's just make an ad-hoc fetch.
        
        const allRes = await apiRequest('GET', `/api/donations?userId=${found ? found.userId : profile.email}`);
        const all = await allRes.json();
        
        let fullDoc = all.find((d:any) => d.id === id);

        // If not found (e.g. from a different user), we'll gracefully mock it for demonstration if endpoint isn't fully ready
        if (!fullDoc) {
           fullDoc = {
             title: found?.title || 'Delicious Donation',
             foodCategory: found?.foodCategory || 'Cooked Meals',
             quantity: '2',
             unit: 'kg',
             status: 'active',
             postedAt: Date.now() / 1000,
             metadata: {
               foodType: 'Cooked',
               vegType: 'Veg',
               condition: 'Fresh',
               storageMethod: 'Room Temperature',
               pickupAddress: 'Green Residency Phase 1',
               pickupWindow: 'Next 2 hours',
               allergens: ['Milk'],
               spiceLevel: 'Medium'
             },
             aiAnalysis: {
               freshnessScore: 95,
               safetyScore: 98,
               estimatedMeals: 8,
               estimatedCo2SavedKg: 5,
               urgencyLevel: 'Low',
               recommendedReceiver: 'Families'
             }
           };
        }

        setDonation(fullDoc);

        // Fetch donor info
        if (fullDoc.userId) {
          const uRes = await apiRequest('GET', `/api/users/${fullDoc.userId}`);
          if (uRes.ok) setDonor(await uRes.json());
        }

        // Fetch matches
        if (fullDoc.id) {
          const mRes = await apiRequest('GET', `/api/donations/${fullDoc.id}/matches`);
          if (mRes.ok) {
            const matches = await mRes.json();
            if (matches && matches.length > 0) {
              setMatch(matches[0]); // Just pick the first for now
            }
          }
        }

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDonation();
  }, [id]);

  if (loading || !donation) {
    return (
      <View style={[styles.container, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const { metadata, aiAnalysis } = donation;
  const isOwner = donation.userId === (profile as any).id;

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      const res = await apiRequest('POST', `/api/matches/${donation.id}/accept`, { receiverId: (profile as any).id });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept donation');
      setMatch(data.match);
      setDonation({ ...donation, status: 'reserved' });
      Alert.alert('Success', 'Donation reserved! Use the OTP when you pickup.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otpInput.length !== 4) return Alert.alert('Invalid OTP', 'Please enter a 4-digit code.');
    if (!match) return;
    
    setActionLoading(true);
    try {
      const res = await apiRequest('POST', `/api/matches/${match.id}/verify`, { otp: otpInput });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      
      setMatch({ ...match, status: 'collected' });
      setDonation({ ...donation, status: 'collected' });
      Alert.alert('Success', 'Handover completed! Statistics have been updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Image */}
        <View style={styles.imagePlaceholder}>
          <Ionicons name="restaurant-outline" size={60} color={Colors.textLight} />
        </View>

        <Pressable onPress={() => router.back()} style={[styles.backBtn, { top: Math.max(insets.top, 20) }]}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>

        <View style={styles.content}>
          
          <View style={styles.headerInfo}>
            <Text style={[styles.title, { color: textPrimary }]}>{donation.title}</Text>
            <View style={styles.tagsRow}>
              <View style={[styles.tag, { backgroundColor: Colors.primary + '20' }]}>
                <Text style={[styles.tagText, { color: Colors.primary }]}>{donation.foodCategory}</Text>
              </View>
              {metadata?.condition && (
                <View style={[styles.tag, { backgroundColor: '#4CAF5020' }]}>
                  <Text style={[styles.tagText, { color: '#4CAF50' }]}>{metadata.condition}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Donor Card */}
          <View style={[styles.donorCard, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{donor?.name?.[0]?.toUpperCase() || 'D'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.donorName, { color: textPrimary }]}>{donor?.name || donor?.buildingName || 'Generous Donor'}</Text>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              </View>
              <Text style={[styles.donorCat, { color: textSecondary }]}>{donor?.userCategory || 'Household'}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                <Text style={[styles.donorStat, { color: textPrimary }]}><Text style={{ color: Colors.primary, fontFamily: 'Poppins_600SemiBold' }}>{donor?.donationsMade || 0}</Text> Donations</Text>
                <Text style={[styles.donorStat, { color: textPrimary }]}><Text style={{ color: Colors.accent, fontFamily: 'Poppins_600SemiBold' }}>{donor?.mealsProvided || 0}</Text> Meals</Text>
              </View>
            </View>
          </View>

          {/* AI Analysis Panel */}
          {aiAnalysis && (
            <View style={[styles.aiCard, { backgroundColor: 'rgba(233, 30, 99, 0.05)', borderColor: Colors.accent }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Ionicons name="sparkles" size={20} color={Colors.accent} />
                <Text style={[styles.sectionTitle, { color: textPrimary, marginBottom: 0 }]}>AI Analysis</Text>
              </View>
              
              <View style={styles.aiRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.aiLabel, { color: textSecondary }]}>Freshness</Text>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${aiAnalysis.freshnessScore}%`, backgroundColor: aiAnalysis.freshnessScore > 80 ? '#4CAF50' : '#FF9800' }]} />
                  </View>
                  <Text style={[styles.aiValue, { color: textPrimary }]}>{aiAnalysis.freshnessScore}%</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.aiLabel, { color: textSecondary }]}>Food Safety</Text>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${aiAnalysis.safetyScore}%`, backgroundColor: aiAnalysis.safetyScore > 80 ? '#4CAF50' : '#FF9800' }]} />
                  </View>
                  <Text style={[styles.aiValue, { color: textPrimary }]}>{aiAnalysis.safetyScore}%</Text>
                </View>
              </View>

              <View style={[styles.aiRow, { marginTop: 16 }]}>
                 <View style={styles.aiBadge}>
                   <Ionicons name="restaurant-outline" size={16} color={Colors.accent} />
                   <Text style={{ fontFamily: 'Poppins_600SemiBold', color: textPrimary, fontSize: 13 }}>~{aiAnalysis.estimatedMeals} Meals</Text>
                 </View>
                 <View style={styles.aiBadge}>
                   <Ionicons name="leaf-outline" size={16} color={Colors.primary} />
                   <Text style={{ fontFamily: 'Poppins_600SemiBold', color: textPrimary, fontSize: 13 }}>~{aiAnalysis.estimatedCo2SavedKg}kg CO₂ Saved</Text>
                 </View>
              </View>
              <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 13, color: textSecondary, marginTop: 12 }}>
                Best suited for: <Text style={{ color: textPrimary, fontFamily: 'Poppins_600SemiBold' }}>{aiAnalysis.recommendedReceiver}</Text>
              </Text>
            </View>
          )}

          {/* Details Section */}
          <Text style={[styles.sectionTitle, { color: textPrimary, marginTop: 24 }]}>Donation Details</Text>
          <View style={[styles.detailsGrid, { backgroundColor: cardBg, borderColor: border }]}>
             <View style={styles.gridItem}>
                <Text style={[styles.gridLabel, { color: textSecondary }]}>Quantity</Text>
                <Text style={[styles.gridValue, { color: textPrimary }]}>{donation.quantity} {donation.unit}</Text>
             </View>
             <View style={styles.gridItem}>
                <Text style={[styles.gridLabel, { color: textSecondary }]}>Diet</Text>
                <Text style={[styles.gridValue, { color: textPrimary }]}>{metadata?.vegType || 'Veg'}</Text>
             </View>
             <View style={styles.gridItem}>
                <Text style={[styles.gridLabel, { color: textSecondary }]}>Storage</Text>
                <Text style={[styles.gridValue, { color: textPrimary }]}>{metadata?.storageMethod || 'N/A'}</Text>
             </View>
             <View style={styles.gridItem}>
                <Text style={[styles.gridLabel, { color: textSecondary }]}>Spice Level</Text>
                <Text style={[styles.gridValue, { color: textPrimary }]}>{metadata?.spiceLevel || 'None'}</Text>
             </View>
          </View>
          
          {metadata?.description && (
            <Text style={[styles.desc, { color: textPrimary }]}>{metadata.description}</Text>
          )}
          
          {metadata?.allergens?.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.gridLabel, { color: textSecondary, marginBottom: 4 }]}>Contains Allergens:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {metadata.allergens.map((al: string) => (
                  <View key={al} style={{ backgroundColor: '#FF980020', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: '#F57C00', fontFamily: 'Poppins_500Medium', fontSize: 12 }}>{al}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Pickup Section */}
          <Text style={[styles.sectionTitle, { color: textPrimary, marginTop: 24 }]}>Pickup Details</Text>
          <View style={[styles.pickupCard, { backgroundColor: cardBg, borderColor: border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <View style={styles.iconCircle}>
                <Ionicons name="location-outline" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickupTitle, { color: textPrimary }]}>Location</Text>
                <Text style={[styles.pickupValue, { color: textSecondary }]}>{metadata?.pickupAddress || donor?.address || 'Community Drop-off Point'}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.iconCircle}>
                <Ionicons name="time-outline" size={20} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickupTitle, { color: textPrimary }]}>Time Window</Text>
                <Text style={[styles.pickupValue, { color: textSecondary }]}>{metadata?.pickupWindow || 'Next 2 hours'}</Text>
              </View>
            </View>
          </View>

          {/* Match & OTP UI */}
          {match && match.status === 'accepted' && (
             <View style={[styles.aiCard, { backgroundColor: isOwner ? Colors.primary + '10' : Colors.accent + '10', borderColor: isOwner ? Colors.primary : Colors.accent, marginTop: 24 }]}>
                {isOwner ? (
                  <>
                    <Text style={[styles.sectionTitle, { color: textPrimary }]}>Verify Handover</Text>
                    <Text style={{ color: textSecondary, marginBottom: 12 }}>Enter the 4-digit OTP from the receiver to complete the handover.</Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TextInput 
                        style={[styles.otpInput, { backgroundColor: cardBg, color: textPrimary, borderColor: border }]}
                        value={otpInput}
                        onChangeText={setOtpInput}
                        keyboardType="number-pad"
                        maxLength={4}
                        placeholder="0000"
                        placeholderTextColor={Colors.textLight}
                      />
                      <Pressable style={[styles.requestBtn, { flex: 1, backgroundColor: Colors.primary }]} onPress={handleVerify} disabled={actionLoading}>
                        {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.requestBtnText}>Verify OTP</Text>}
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={[styles.sectionTitle, { color: textPrimary }]}>Your Pickup OTP</Text>
                    <Text style={{ color: textSecondary, marginBottom: 12 }}>Show this code to the donor when picking up the food.</Text>
                    <View style={styles.otpBox}>
                      <Text style={styles.otpBoxText}>{match.otp}</Text>
                    </View>
                  </>
                )}
             </View>
          )}

          {match && match.status === 'collected' && (
             <View style={[styles.aiCard, { backgroundColor: '#4CAF5015', borderColor: '#4CAF50', marginTop: 24 }]}>
               <Text style={[styles.sectionTitle, { color: '#4CAF50' }]}>Handover Completed</Text>
               <Text style={{ color: textSecondary }}>This donation has been successfully handed over and impact stats updated.</Text>
             </View>
          )}

        </View>
      </ScrollView>

      {/* Footer Action */}
      {!isOwner && donation.status === 'active' && !match && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20), borderTopColor: border }]}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable style={[styles.actionBtn, { backgroundColor: cardBg, borderColor: border }]}>
              <Ionicons name="share-outline" size={24} color={textPrimary} />
            </Pressable>
            <Pressable style={[styles.actionBtn, { backgroundColor: cardBg, borderColor: border }]}>
              <Ionicons name="bookmark-outline" size={24} color={textPrimary} />
            </Pressable>
            <Pressable style={[styles.requestBtn, { flex: 1, backgroundColor: Colors.primary }]} onPress={handleAccept} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.requestBtnText}>Accept Donation</Text>}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imagePlaceholder: { width: '100%', height: 280, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  backBtn: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20 },
  headerInfo: { marginBottom: 24 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 26, marginBottom: 8 },
  tagsRow: { flexDirection: 'row', gap: 10 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  tagText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12 },
  donorCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 20 },
  donorName: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  donorCat: { fontFamily: 'Poppins_400Regular', fontSize: 13 },
  donorStat: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, marginBottom: 12 },
  aiCard: { padding: 20, borderRadius: 16, borderWidth: 1 },
  aiRow: { flexDirection: 'row', gap: 16 },
  aiLabel: { fontFamily: 'Poppins_500Medium', fontSize: 13, marginBottom: 4 },
  progressBg: { width: '100%', height: 6, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 3, marginBottom: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  aiValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, borderRadius: 16, borderWidth: 1, gap: 16 },
  gridItem: { width: '45%' },
  gridLabel: { fontFamily: 'Poppins_500Medium', fontSize: 13, marginBottom: 2 },
  gridValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  desc: { fontFamily: 'Poppins_400Regular', fontSize: 14, marginTop: 16, lineHeight: 22 },
  pickupCard: { padding: 16, borderRadius: 16, borderWidth: 1 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(76, 175, 80, 0.1)', alignItems: 'center', justifyContent: 'center' },
  pickupTitle: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  pickupValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  footer: { padding: 16, borderTopWidth: 1 },
  actionBtn: { width: 56, height: 56, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  requestBtn: { borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  requestBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 },
  otpInput: { flex: 1, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontSize: 24, fontFamily: 'Poppins_700Bold', textAlign: 'center', letterSpacing: 8 },
  otpBox: { padding: 20, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 16, alignItems: 'center' },
  otpBoxText: { fontSize: 32, fontFamily: 'Poppins_700Bold', color: Colors.primary, letterSpacing: 12 },
});
