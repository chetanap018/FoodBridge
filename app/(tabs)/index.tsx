import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  useColorScheme,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import type { ExpiryStatus } from '@/context/AppContext';

const EXPIRY_LABELS: Record<ExpiryStatus, string> = {
  fresh: 'Fresh',
  good: 'Good',
  warning: 'Expiring Soon',
  danger: 'Expiring!',
  expired: 'Expired',
};

const EXPIRY_COLORS: Record<ExpiryStatus, string> = {
  fresh: Colors.expiry.fresh,
  good: Colors.expiry.good,
  warning: Colors.expiry.warning,
  danger: Colors.expiry.danger,
  expired: Colors.expiry.expired,
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { profile, pantryItems, notifications, getExpiryStatus, getDaysRemaining, getExpiringItems } = useApp();
  const expiringItems = getExpiringItems();
  const unreadCount = notifications.filter(n => !n.read).length;

  const bg = isDark ? Colors.dark.background : Colors.background;
  const cardBg = isDark ? Colors.dark.card : Colors.card;
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : 0;

  const handleQuickAction = useCallback((action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (action === 'scan') router.push('/scanner');
    else if (action === 'add') router.push('/add-food');
    else if (action === 'donate') router.push('/donate');
    else if (action === 'find') router.push('/donate');
  }, []);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#0D2E0D', '#1B5E20'] : ['#2E7D32', '#43A047']}
        style={[styles.header, { paddingTop: topPadding + 20 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{profile.name.split(' ')[0]}</Text>
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/notifications'); }}
            style={styles.notifBtn}
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.foodSaved}kg</Text>
            <Text style={styles.statLabel}>Food Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.donationsMade}</Text>
            <Text style={styles.statLabel}>Donated</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.co2Reduced}kg</Text>
            <Text style={styles.statLabel}>CO₂ Saved</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.content, { paddingBottom: bottomPadding + 100 }]}>
        {/* Expiry Alerts */}
        {expiringItems.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Expiry Alerts</Text>
            {expiringItems.map(item => {
              const status = getExpiryStatus(item.expiryDate);
              const days = getDaysRemaining(item.expiryDate);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/pantry'); }}
                  style={[styles.alertCard, { backgroundColor: cardBg, borderLeftColor: EXPIRY_COLORS[status] }]}
                >
                  <View style={[styles.alertDot, { backgroundColor: EXPIRY_COLORS[status] }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.alertName, { color: textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.alertDays, { color: EXPIRY_COLORS[status] }]}>
                      {days === 0 ? 'Expires today' : days < 0 ? 'Expired' : `${days} day${days === 1 ? '' : 's'} left`}
                    </Text>
                  </View>
                  <Text style={[styles.alertBadge, { color: EXPIRY_COLORS[status], borderColor: EXPIRY_COLORS[status] }]}>
                    {EXPIRY_LABELS[status]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {[
              { key: 'scan', icon: 'scan-outline', label: 'Scan Food', color: '#2E7D32', bg: '#E8F5E9' },
              { key: 'add', icon: 'add-circle-outline', label: 'Add Item', color: '#1565C0', bg: '#E3F2FD' },
              { key: 'donate', icon: 'heart-outline', label: 'Donate Now', color: '#FF8F00', bg: '#FFF8E1' },
              { key: 'find', icon: 'location-outline', label: 'Find Food', color: '#AD1457', bg: '#FCE4EC' },
            ].map(action => (
              <Pressable
                key={action.key}
                onPress={() => handleQuickAction(action.key)}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: isDark ? Colors.dark.card : action.bg, opacity: pressed ? 0.75 : 1 }
                ]}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: action.color + '22' }]}>
                  <Ionicons name={action.icon as any} size={26} color={action.color} />
                </View>
                <Text style={[styles.actionLabel, { color: isDark ? Colors.dark.textPrimary : action.color }]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Pantry Overview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Pantry</Text>
            <Pressable onPress={() => router.push('/pantry')}>
              <Text style={[styles.seeAll, { color: Colors.primary }]}>See all</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pantryScroll}>
            {pantryItems.slice(0, 6).map(item => {
              const status = getExpiryStatus(item.expiryDate);
              const days = getDaysRemaining(item.expiryDate);
              return (
                <View key={item.id} style={[styles.pantryChip, { backgroundColor: cardBg, borderColor: border }]}>
                  <View style={[styles.chipDot, { backgroundColor: EXPIRY_COLORS[status] }]} />
                  <Text style={[styles.chipName, { color: textPrimary }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.chipDays, { color: EXPIRY_COLORS[status] }]}>
                    {days < 0 ? 'Exp.' : days === 0 ? 'Today' : `${days}d`}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Recent Activity</Text>
          {[
            { icon: 'basket-outline', color: Colors.primary, text: `${pantryItems.length} items tracked in pantry`, time: 'Now' },
            { icon: 'heart-outline', color: Colors.accent, text: 'Fresh Vegetables Bundle available nearby', time: '2h ago' },
            { icon: 'restaurant-outline', color: '#1565C0', text: `${5} new recipe suggestions ready`, time: '4h ago' },
          ].map((activity, idx) => (
            <View key={idx} style={[styles.activityItem, { backgroundColor: cardBg, borderColor: border }]}>
              <View style={[styles.activityIcon, { backgroundColor: activity.color + '18' }]}>
                <Ionicons name={activity.icon as any} size={18} color={activity.color} />
              </View>
              <Text style={[styles.activityText, { color: textSecondary }]} numberOfLines={1}>{activity.text}</Text>
              <Text style={[styles.activityTime, { color: Colors.textLight }]}>{activity.time}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 28 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  greeting: { color: 'rgba(255,255,255,0.8)', fontFamily: 'Poppins_400Regular', fontSize: 14 },
  userName: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 26, marginTop: -4 },
  notifBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  notifBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: Colors.accent, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notifBadgeText: { color: '#fff', fontSize: 9, fontFamily: 'Poppins_700Bold' },
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 18 },
  statLabel: { color: 'rgba(255,255,255,0.75)', fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 8 },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, marginBottom: 12 },
  seeAll: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  alertCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 8, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  alertDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  alertName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  alertDays: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 2 },
  alertBadge: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionBtn: { width: '47.5%', borderRadius: 16, padding: 16, alignItems: 'center', gap: 10 },
  actionIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  pantryScroll: { marginHorizontal: -4 },
  pantryChip: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: 4, borderWidth: 1, minWidth: 100, alignItems: 'center', flexDirection: 'row', gap: 6 },
  chipDot: { width: 7, height: 7, borderRadius: 3.5 },
  chipName: { fontFamily: 'Poppins_500Medium', fontSize: 12, flex: 1 },
  chipDays: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
  activityIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  activityText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 13 },
  activityTime: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
});
