import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Pressable, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useIsDark } from '@/context/AppContext';

export default function AboutScreen() {
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
        <Text style={styles.headerTitle}>About FoodBridge</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.heroSection}>
          <View style={[styles.logoWrap, { backgroundColor: Colors.primary + '15' }]}>
            <Ionicons name="leaf" size={64} color={Colors.primary} />
          </View>
          <Text style={[styles.appName, { color: textPrimary }]}>FoodBridge</Text>
          <Text style={[styles.version, { color: textSecondary }]}>Version 1.0.0 (Beta)</Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>Our Mission</Text>
          <Text style={[styles.cardText, { color: textSecondary }]}>
            FoodBridge is a community-driven platform dedicated to reducing food waste and fighting hunger. We connect individuals and businesses with surplus food to those in need within their immediate neighborhood.
          </Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor: border, marginTop: 16 }]}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>How it works</Text>
          <View style={styles.step}>
            <Text style={[styles.stepNum, { backgroundColor: Colors.primary }]}>1</Text>
            <Text style={[styles.stepText, { color: textSecondary }]}>Scan your pantry items with AI to track expiry dates.</Text>
          </View>
          <View style={styles.step}>
            <Text style={[styles.stepNum, { backgroundColor: Colors.primary }]}>2</Text>
            <Text style={[styles.stepText, { color: textSecondary }]}>Discover recipes tailored to what you already have.</Text>
          </View>
          <View style={styles.step}>
            <Text style={[styles.stepNum, { backgroundColor: Colors.primary }]}>3</Text>
            <Text style={[styles.stepText, { color: textSecondary }]}>Donate items you won't use before they go to waste.</Text>
          </View>
        </View>

        <View style={styles.footer}>
           <Text style={[styles.footerText, { color: textSecondary }]}>Built with ❤️ for a better planet.</Text>
           <Text style={[styles.footerText, { color: textSecondary, fontSize: 11 }]}>© 2026 FoodBridge Team</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 18 },
  heroSection: { alignItems: 'center', paddingVertical: 40 },
  logoWrap: { width: 120, height: 120, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  appName: { fontFamily: 'Poppins_700Bold', fontSize: 24 },
  version: { fontFamily: 'Poppins_400Regular', fontSize: 14, marginTop: 4 },
  content: { paddingHorizontal: 20 },
  infoCard: { borderRadius: 20, padding: 20, borderWidth: 1 },
  cardTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18, marginBottom: 12 },
  cardText: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 22 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 12, marginTop: 2 },
  stepText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 20 },
  footer: { alignItems: 'center', paddingVertical: 40 },
  footerText: { fontFamily: 'Poppins_500Medium', fontSize: 13, marginBottom: 4 },
});
