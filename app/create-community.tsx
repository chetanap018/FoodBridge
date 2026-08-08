import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ScrollView, Platform, KeyboardAvoidingView, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/colors';
import { useApp, useIsDark } from '@/context/AppContext';
import { apiRequest } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

const COMMUNITY_TYPES = [
  'Housing Society', 'Apartment Complex', 'NGO', 'Corporate', 'Public'
];

export default function CreateCommunityScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { profile } = useApp();

  const [name, setName] = useState('');
  const [type, setType] = useState('Housing Society');
  const [maxMembers, setMaxMembers] = useState('100');
  const [address, setAddress] = useState('');
  const [joinType, setJoinType] = useState<'request' | 'open'>('request');
  const [loading, setLoading] = useState(false);

  const bg = isDark ? Colors.dark.background : Colors.background;
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const cardBg = isDark ? Colors.dark.card : Colors.card;
  const border = isDark ? Colors.dark.border : Colors.border;

  const handleCreate = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Community name is required');
    if (!address.trim()) return Alert.alert('Error', 'Address is required');
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in first");

      const res = await apiRequest('POST', '/api/community', {
        name: name.trim(),
        type,
        maxMembers: parseInt(maxMembers) || 100,
        address: address.trim(),
        joinType,
        adminId: session.user.id
      });
      
      const data = await res.json();
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } else {
        throw new Error(data.error || 'Failed to create community');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Create Community</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: textPrimary }]}>Community Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: cardBg, color: textPrimary, borderColor: border }]}
          placeholder="e.g. Green Valley Apartments"
          placeholderTextColor={textSecondary}
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.label, { color: textPrimary }]}>Community Type</Text>
        <View style={styles.chipsContainer}>
          {COMMUNITY_TYPES.map(t => {
            const selected = type === t;
            return (
              <Pressable 
                key={t}
                onPress={() => { Haptics.selectionAsync(); setType(t); }}
                style={[
                  styles.chip, 
                  { backgroundColor: selected ? Colors.primary : cardBg, borderColor: selected ? Colors.primary : border }
                ]}
              >
                <Text style={[styles.chipText, { color: selected ? '#fff' : textPrimary }]}>{t}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: textPrimary }]}>Maximum Members</Text>
        <TextInput
          style={[styles.input, { backgroundColor: cardBg, color: textPrimary, borderColor: border }]}
          placeholder="100"
          placeholderTextColor={textSecondary}
          keyboardType="numeric"
          value={maxMembers}
          onChangeText={setMaxMembers}
        />

        <Text style={[styles.label, { color: textPrimary }]}>Address / Area</Text>
        <TextInput
          style={[styles.input, { backgroundColor: cardBg, color: textPrimary, borderColor: border, height: 80 }]}
          placeholder="Enter detailed address or area name"
          placeholderTextColor={textSecondary}
          multiline
          textAlignVertical="top"
          value={address}
          onChangeText={setAddress}
        />

        <Text style={[styles.label, { color: textPrimary }]}>Join Policy</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable 
            onPress={() => { Haptics.selectionAsync(); setJoinType('request'); }}
            style={[styles.policyCard, { backgroundColor: cardBg, borderColor: joinType === 'request' ? Colors.primary : border }]}
          >
            <Ionicons name="shield-checkmark" size={24} color={joinType === 'request' ? Colors.primary : textSecondary} />
            <Text style={[styles.policyTitle, { color: joinType === 'request' ? Colors.primary : textPrimary }]}>Request to Join</Text>
            <Text style={[styles.policyDesc, { color: textSecondary }]}>Admins must approve new members.</Text>
          </Pressable>
          <Pressable 
            onPress={() => { Haptics.selectionAsync(); setJoinType('open'); }}
            style={[styles.policyCard, { backgroundColor: cardBg, borderColor: joinType === 'open' ? Colors.primary : border }]}
          >
            <Ionicons name="globe-outline" size={24} color={joinType === 'open' ? Colors.primary : textSecondary} />
            <Text style={[styles.policyTitle, { color: joinType === 'open' ? Colors.primary : textPrimary }]}>Open to All</Text>
            <Text style={[styles.policyDesc, { color: textSecondary }]}>Anyone can join instantly.</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20), borderTopColor: border }]}>
        <Pressable 
          style={({pressed}) => [styles.submitBtn, { opacity: pressed || loading ? 0.7 : 1 }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create Community</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  content: { padding: 20, gap: 16 },
  label: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontFamily: 'Poppins_400Regular', fontSize: 15 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  chipText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  policyCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 16, gap: 8 },
  policyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  policyDesc: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  footer: { padding: 20, borderTopWidth: 1 },
  submitBtn: { backgroundColor: Colors.primary, padding: 18, borderRadius: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 }
});
