import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Pressable, Linking, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useIsDark } from '@/context/AppContext';

const FAQ = [
  {
    q: "How does the AI Scanner work?",
    a: "Our AI uses the camera to identify food items, categories, and estimate typical shelf life based on global food safety databases."
  },
  {
    q: "Is my donation anonymous?",
    a: "By default, basic profile info is visible to recipients. You can update your display name in settings."
  },
  {
    q: "What can I donate?",
    a: "We accept non-perishables and fresh produce that is still within a safe consumption window. Please avoid opened dairy or meats."
  }
];

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  
  const bg = isDark ? Colors.dark.background : Colors.background;
  const cardBg = isDark ? Colors.dark.card : '#fff';
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: isDark ? Colors.dark.card : Colors.primary }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={[styles.sectionTitle, { color: textPrimary }]}>Frequently Asked Questions</Text>
        
        {FAQ.map((item, i) => (
          <View key={i} style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.question, { color: textPrimary }]}>{item.q}</Text>
            <Text style={[styles.answer, { color: textSecondary }]}>{item.a}</Text>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { color: textPrimary, marginTop: 24 }]}>Contact Us</Text>
        
        <Pressable 
          onPress={() => Linking.openURL('mailto:support@foodbridge.com')}
          style={[styles.contactCard, { backgroundColor: cardBg, borderColor: border }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: Colors.primary + '15' }]}>
            <Ionicons name="mail-outline" size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactLabel, { color: textPrimary }]}>Email Support</Text>
            <Text style={[styles.contactValue, { color: textSecondary }]}>support@foodbridge.com</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
        </Pressable>

        <Pressable 
          onPress={() => Linking.openURL('https://foodbridge.com/help')}
          style={[styles.contactCard, { backgroundColor: cardBg, borderColor: border, marginTop: 12 }]}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#1565C015' }]}>
            <Ionicons name="globe-outline" size={20} color="#1565C0" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.contactLabel, { color: textPrimary }]}>Help Center</Text>
            <Text style={[styles.contactValue, { color: textSecondary }]}>Visit our website</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 18 },
  content: { padding: 20 },
  sectionTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, marginBottom: 16 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  question: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, marginBottom: 6 },
  answer: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 20 },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 14, borderWidth: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  contactValue: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
});
