import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Platform, Alert, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/colors';
import { useApp, useIsDark } from '@/context/AppContext';

export default function BulkDonateScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { postDonation } = useApp();

  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const bg = isDark ? Colors.dark.background : Colors.background;
  const cardBg = isDark ? Colors.dark.card : Colors.card;
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;

  const handlePost = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description of what you are donating.');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Bulk donations are posted with no communityId (Global) and flagged as bulk
      await postDonation([], undefined, undefined, true, [description.trim()]);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Donation Posted', 'Your bulk donation has been broadcasted to nearby NGOs and public receivers!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
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
          <Ionicons name="close" size={28} color={textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Bulk Donation</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.iconContainer}>
          <Ionicons name="cube" size={60} color={Colors.primary} />
        </View>

        <Text style={[styles.title, { color: textPrimary }]}>Broadcast Surplus Food</Text>
        <Text style={[styles.subtitle, { color: textSecondary }]}>
          Instantly notify NGOs, orphanages, and pure receivers in your area. This skips community restrictions for maximum reach.
        </Text>

        <View style={[styles.inputContainer, { backgroundColor: cardBg, borderColor: border }]}>
          <TextInput
            style={[styles.input, { color: textPrimary }]}
            placeholder="e.g. 50 kg of cooked rice and dal from wedding event"
            placeholderTextColor={textSecondary}
            multiline
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="flash" size={20} color={Colors.accent} />
          <Text style={[styles.infoText, { color: textSecondary }]}>
            Bulk donations are marked as highly urgent and are immediately matched with receivers based on distance.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20), borderTopColor: border }]}>
        <Pressable 
          style={({pressed}) => [styles.submitBtn, { opacity: pressed || loading ? 0.7 : 1 }]}
          onPress={handlePost}
          disabled={loading}
        >
          <Text style={styles.submitBtnText}>{loading ? 'Broadcasting...' : 'Broadcast Donation'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
  content: { padding: 24, alignItems: 'center' },
  iconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(76, 175, 80, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 22, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  inputContainer: { width: '100%', borderWidth: 1, borderRadius: 16, padding: 4 },
  input: { height: 120, padding: 16, fontFamily: 'Poppins_400Regular', fontSize: 16 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(233, 30, 99, 0.05)', padding: 16, borderRadius: 16, marginTop: 24 },
  infoText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 20 },
  footer: { padding: 20, borderTopWidth: 1 },
  submitBtn: { backgroundColor: Colors.primary, padding: 18, borderRadius: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 },
});
