import React from 'react';
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
import * as Haptics from 'expo-haptics';
import { useApp, Notification } from '@/context/AppContext';
import { Colors } from '@/constants/colors';

const NOTIF_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
  expiry: { icon: 'warning-outline', color: Colors.danger, bgColor: '#FFEBEE' },
  donation_accepted: { icon: 'checkmark-circle-outline', color: Colors.primary, bgColor: '#E8F5E9' },
  recipe: { icon: 'restaurant-outline', color: '#1565C0', bgColor: '#E3F2FD' },
  nearby_food: { icon: 'location-outline', color: Colors.accent, bgColor: '#FFF8E1' },
};

function NotifItem({ notif, isDark, onPress }: { notif: Notification; isDark: boolean; onPress: () => void }) {
  const cfg = NOTIF_CONFIG[notif.type];
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const cardBg = isDark ? Colors.dark.card : '#fff';
  const border = isDark ? Colors.dark.border : Colors.border;
  const timeAgo = formatTimeAgo(notif.timestamp);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.notifCard,
        {
          backgroundColor: notif.read ? cardBg : (isDark ? '#1A2E1A' : '#F0FAF0'),
          borderColor: notif.read ? border : Colors.primary + '44',
          opacity: pressed ? 0.85 : 1,
        }
      ]}
    >
      <View style={[styles.notifIcon, { backgroundColor: isDark ? cfg.color + '25' : cfg.bgColor }]}>
        <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.notifMessage, { color: textPrimary, fontFamily: notif.read ? 'Poppins_400Regular' : 'Poppins_600SemiBold' }]}>
          {notif.message}
        </Text>
        <Text style={[styles.notifTime, { color: textSecondary }]}>{timeAgo}</Text>
      </View>
      {!notif.read && <View style={[styles.unreadDot, { backgroundColor: Colors.primary }]} />}
    </Pressable>
  );
}

function formatTimeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { notifications, markNotificationRead, clearAllNotifications } = useApp();
  const unread = notifications.filter(n => !n.read);

  const bg = isDark ? Colors.dark.background : Colors.background;
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: isDark ? Colors.dark.card : Colors.primary }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unread.length > 0 && (
            <Text style={styles.headerSubtitle}>{unread.length} unread</Text>
          )}
        </View>
        {unread.length > 0 ? (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); clearAllNotifications(); }}
            style={styles.clearBtn}
          >
            <Text style={styles.clearBtnText}>Mark all read</Text>
          </Pressable>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 32 }]}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={56} color={Colors.textLight} />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>All caught up</Text>
            <Text style={[styles.emptyText, { color: textSecondary }]}>No notifications yet</Text>
          </View>
        ) : (
          <>
            {unread.length > 0 && (
              <Text style={[styles.sectionLabel, { color: textPrimary }]}>Unread</Text>
            )}
            {notifications.filter(n => !n.read).map(notif => (
              <NotifItem
                key={notif.id}
                notif={notif}
                isDark={isDark}
                onPress={() => { Haptics.selectionAsync(); markNotificationRead(notif.id); }}
              />
            ))}

            {notifications.some(n => n.read) && (
              <Text style={[styles.sectionLabel, { color: textPrimary, marginTop: unread.length > 0 ? 16 : 0 }]}>Earlier</Text>
            )}
            {notifications.filter(n => n.read).map(notif => (
              <NotifItem
                key={notif.id}
                notif={notif}
                isDark={isDark}
                onPress={() => {}}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 20 },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontFamily: 'Poppins_400Regular', fontSize: 13 },
  clearBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  clearBtnText: { color: '#fff', fontFamily: 'Poppins_500Medium', fontSize: 12 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  sectionLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, marginBottom: 4 },
  notifCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14, borderWidth: 1 },
  notifIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notifMessage: { fontSize: 13, lineHeight: 20 },
  notifTime: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 14 },
});
