import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useApp, useIsDark } from '@/context/AppContext';
import { apiRequest } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';

export default function CreateRequestScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { profile } = useApp();
  
  const { communityId, communityName } = useLocalSearchParams<{ communityId?: string, communityName?: string }>();

  const bg = isDark ? Colors.dark.background : Colors.background;
  const cardBg = isDark ? Colors.dark.card : '#fff';
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const [foodCategory, setFoodCategory] = useState('Cooked Meals');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('Meals');

  const [urgency, setUrgency] = useState('Within 24 Hours');
  const [visibility, setVisibility] = useState<'community' | 'public' | 'community_first'>('community_first');

  const [pickupLocation, setPickupLocation] = useState(profile.buildingName || '');
  const [pickupTime, setPickupTime] = useState('Anytime');
  const [contactPerson, setContactPerson] = useState(profile.name || '');

  const [peopleCount, setPeopleCount] = useState('2-4 People');
  const [additionalNote, setAdditionalNote] = useState('');

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(s => s + 1);
  };
  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    if (!title || !itemName || !quantity) {
      Alert.alert('Missing Details', 'Please fill in the title, food name, and quantity.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const metadata = {
        description,
        pickupLocation,
        pickupTime,
        contactPerson,
        peopleCount,
        additionalNote
      };

      const payload = {
        userId: session.user.id,
        communityId: visibility === 'public' ? null : (communityId || null),
        title,
        foodCategory,
        itemName,
        quantity,
        unit,
        urgency,
        visibility,
        metadata,
      };

      const res = await apiRequest('POST', '/api/peer-requests', payload);
      
      if (res.ok) {
        Alert.alert('Request Posted!', 'Your request is now live.');
        router.back();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to post request');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: bg, paddingTop: topPadding }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={() => { step === 1 ? router.back() : handlePrev() }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Step {step} of 4</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: textPrimary }]}>Request Information</Text>
            
            <Text style={[styles.label, { color: textPrimary }]}>Request Title</Text>
            <TextInput style={[styles.input, { color: textPrimary, borderColor: border, backgroundColor: cardBg }]} placeholder="E.g., Need Fresh Vegetables" placeholderTextColor={Colors.textLight} value={title} onChangeText={setTitle} />

            <Text style={[styles.label, { color: textPrimary }]}>Description (Optional)</Text>
            <TextInput style={[styles.input, { color: textPrimary, borderColor: border, backgroundColor: cardBg, minHeight: 80 }]} multiline textAlignVertical="top" placeholder="Looking for vegetables for today's dinner..." placeholderTextColor={Colors.textLight} value={description} onChangeText={setDescription} />

            <View style={{ height: 16 }} />
            <Text style={[styles.stepTitle, { color: textPrimary, fontSize: 20 }]}>Food Required</Text>
            
            <Text style={[styles.label, { color: textPrimary }]}>Food Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillScroll}>
              {['Fruits', 'Vegetables', 'Grains', 'Dairy', 'Bakery', 'Cooked Meals', 'Packaged Food', 'Beverages', 'Other'].map(cat => (
                <Pressable key={cat} onPress={() => setFoodCategory(cat)} style={[styles.pill, { backgroundColor: foodCategory === cat ? Colors.accent : cardBg, borderColor: border }]}>
                  <Text style={{ color: foodCategory === cat ? '#fff' : textPrimary, fontFamily: 'Poppins_500Medium' }}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: textPrimary }]}>Specific Food Name</Text>
            <TextInput style={[styles.input, { color: textPrimary, borderColor: border, backgroundColor: cardBg }]} placeholder="E.g., Tomatoes, Rice" placeholderTextColor={Colors.textLight} value={itemName} onChangeText={setItemName} />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: textPrimary }]}>Quantity</Text>
                <TextInput style={[styles.input, { color: textPrimary, borderColor: border, backgroundColor: cardBg }]} placeholder="E.g., 2" keyboardType="numeric" placeholderTextColor={Colors.textLight} value={quantity} onChangeText={setQuantity} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: textPrimary }]}>Unit</Text>
                <TextInput style={[styles.input, { color: textPrimary, borderColor: border, backgroundColor: cardBg }]} placeholder="kg, Pieces..." placeholderTextColor={Colors.textLight} value={unit} onChangeText={setUnit} />
              </View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: textPrimary }]}>Urgency & Visibility</Text>
            
            <Text style={[styles.label, { color: textPrimary }]}>Urgency</Text>
            <View style={{ gap: 10, marginBottom: 24 }}>
              {['Urgent (Today)', 'Within 24 Hours', 'Flexible'].map(opt => (
                <Pressable key={opt} onPress={() => setUrgency(opt)} style={[styles.radioCard, { borderColor: urgency === opt ? Colors.accent : border, backgroundColor: cardBg }]}>
                  <Text style={[styles.visTitle, { color: textPrimary }]}>{opt}</Text>
                  <View style={[styles.radio, { borderColor: urgency === opt ? Colors.accent : border }]}>
                    {urgency === opt && <View style={[styles.radioInner, { backgroundColor: Colors.accent }]} />}
                  </View>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: textPrimary }]}>Visibility</Text>
            <View style={{ gap: 10 }}>
              {[
                { id: 'community_first', label: 'Community First → Public Later', desc: 'Ask your neighbors first.' },
                { id: 'community', label: 'Community Only', desc: 'Only visible to community members.' },
                { id: 'public', label: 'Public Only', desc: 'Visible to everyone immediately.' }
              ].map(opt => (
                <Pressable key={opt.id} onPress={() => setVisibility(opt.id as any)} style={[styles.radioCard, { borderColor: visibility === opt.id ? Colors.accent : border, backgroundColor: cardBg }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.visTitle, { color: textPrimary }]}>{opt.label}</Text>
                    <Text style={[styles.visDesc, { color: textSecondary }]}>{opt.desc}</Text>
                  </View>
                  <View style={[styles.radio, { borderColor: visibility === opt.id ? Colors.accent : border }]}>
                    {visibility === opt.id && <View style={[styles.radioInner, { backgroundColor: Colors.accent }]} />}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: textPrimary }]}>Pickup Details</Text>
            
            <Text style={[styles.label, { color: textPrimary }]}>Pickup Location</Text>
            <TextInput style={[styles.input, { color: textPrimary, borderColor: border, backgroundColor: cardBg }]} value={pickupLocation} onChangeText={setPickupLocation} placeholder="E.g., Lobby, Gate 1..." placeholderTextColor={Colors.textLight} />

            <Text style={[styles.label, { color: textPrimary }]}>Preferred Pickup Time</Text>
            <TextInput style={[styles.input, { color: textPrimary, borderColor: border, backgroundColor: cardBg }]} value={pickupTime} onChangeText={setPickupTime} placeholder="E.g., Between 6 PM - 8 PM" placeholderTextColor={Colors.textLight} />

            <Text style={[styles.label, { color: textPrimary }]}>Contact Person</Text>
            <TextInput style={[styles.input, { color: textPrimary, borderColor: border, backgroundColor: cardBg }]} value={contactPerson} onChangeText={setContactPerson} placeholder="Name of person receiving" placeholderTextColor={Colors.textLight} />
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: textPrimary }]}>Optional Info</Text>
            
            <Text style={[styles.label, { color: textPrimary }]}>Number of People</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {['1 Person', '2-4 People', '5+ People'].map(count => (
                <Pressable key={count} onPress={() => setPeopleCount(count)} style={[styles.pill, { backgroundColor: peopleCount === count ? Colors.accent : cardBg, borderColor: border }]}>
                  <Text style={{ color: peopleCount === count ? '#fff' : textPrimary, fontFamily: 'Poppins_500Medium' }}>{count}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: textPrimary }]}>Additional Note</Text>
            <TextInput style={[styles.input, { color: textPrimary, borderColor: border, backgroundColor: cardBg, minHeight: 80 }]} multiline textAlignVertical="top" placeholder="E.g., Any vegetables are fine." placeholderTextColor={Colors.textLight} value={additionalNote} onChangeText={setAdditionalNote} />
          </View>
        )}

      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20), borderTopColor: border }]}>
        {step < 4 ? (
          <Pressable style={({pressed}) => [styles.submitBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={handleNext}>
            <Text style={styles.submitBtnText}>Next Step</Text>
          </Pressable>
        ) : (
          <Pressable style={({pressed}) => [styles.submitBtn, { opacity: pressed || loading ? 0.7 : 1 }]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
  content: { padding: 20 },
  stepContainer: { gap: 16 },
  stepTitle: { fontFamily: 'Poppins_700Bold', fontSize: 24, marginBottom: 8 },
  label: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, marginBottom: -8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontFamily: 'Poppins_400Regular', fontSize: 15 },
  row: { flexDirection: 'row', gap: 16 },
  pillScroll: { gap: 10, paddingVertical: 4 },
  pill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  radioCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, justifyContent: 'space-between' },
  visTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  visDesc: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 4 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  footer: { padding: 20, borderTopWidth: 1 },
  submitBtn: { backgroundColor: Colors.accent, borderRadius: 16, padding: 18, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 },
});
