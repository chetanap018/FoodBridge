import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  useColorScheme,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';

const ROLE_COLORS: Record<string, string> = { Donor: '#2E7D32', Receiver: '#1565C0', Volunteer: '#FF8F00' };

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { profile, settings, updateSettings, userDonations, notifications } = useApp();
  const unreadCount = notifications.filter(n => !n.read).length;

  const bg = isDark ? Colors.dark.background : Colors.background;
  const cardBg = isDark ? Colors.dark.card : '#fff';
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const toggleDark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ darkMode: !settings.darkMode });
  };

  const toggleNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ notificationsEnabled: !settings.notificationsEnabled });
  };

  const toggleLocation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateSettings({ locationSharing: !settings.locationSharing });
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => Alert.alert('Signed out', 'You have been signed out.') },
    ]);
  };

  const donationStatusColor = { pending: Colors.accent, accepted: Colors.primary, completed: Colors.textLight };
  const donationStatusLabel = { pending: 'Pending', accepted: 'Accepted', completed: 'Completed' };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bg }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {/* Header + Avatar */}
      <LinearGradient
        colors={isDark ? ['#0D2E0D', '#1B5E20'] : ['#2E7D32', '#43A047']}
        style={[styles.header, { paddingTop: topPadding + 8 }]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/notifications'); }} style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color="#fff" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile.avatar}</Text>
          </View>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[profile.role] }]}>
            <Text style={styles.roleText}>{profile.role}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.content, { paddingBottom: Platform.OS === 'web' ? 120 : 100 }]}>
        {/* Impact Stats */}
        <View style={[styles.statsCard, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>My Impact</Text>
          <View style={styles.statsGrid}>
            {[
              { value: `${profile.foodSaved}kg`, label: 'Food Saved', icon: 'leaf-outline', color: Colors.primary },
              { value: `${profile.donationsMade}`, label: 'Donations', icon: 'heart-outline', color: Colors.accent },
              { value: `${profile.co2Reduced}kg`, label: 'CO₂ Reduced', icon: 'cloud-outline', color: '#1565C0' },
              { value: `${profile.mealsProvided}`, label: 'Meals', icon: 'restaurant-outline', color: '#AD1457' },
            ].map((stat, i) => (
              <View key={i} style={[styles.statCell, { borderColor: border }]}>
                <View style={[styles.statIconWrap, { backgroundColor: stat.color + '18' }]}>
                  <Ionicons name={stat.icon as any} size={18} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: textPrimary }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: textSecondary }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Donation History */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>Donation History</Text>
          {userDonations.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="heart-outline" size={36} color={Colors.textLight} />
              <Text style={[styles.emptyText, { color: textSecondary }]}>No donations yet</Text>
            </View>
          ) : (
            userDonations.slice(0, 5).map(donation => (
              <View key={donation.id} style={[styles.donationRow, { borderBottomColor: border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.donationItems, { color: textPrimary }]} numberOfLines={1}>
                    {donation.items.join(', ')}
                  </Text>
                  <Text style={[styles.donationDate, { color: textSecondary }]}>
                    {new Date(donation.postedAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: donationStatusColor[donation.status] + '22' }]}>
                  <Text style={[styles.statusText, { color: donationStatusColor[donation.status] }]}>
                    {donationStatusLabel[donation.status]}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Settings */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>Settings</Text>

          {[
            {
              icon: 'notifications-outline', label: 'Notifications', color: '#2E7D32',
              right: <Switch value={settings.notificationsEnabled} onValueChange={toggleNotifications} trackColor={{ true: Colors.primary }} />,
            },
            {
              icon: 'location-outline', label: 'Location Sharing', color: '#1565C0',
              right: <Switch value={settings.locationSharing} onValueChange={toggleLocation} trackColor={{ true: Colors.primary }} />,
            },
            {
              icon: 'moon-outline', label: 'Dark Mode', color: '#4A148C',
              right: <Switch value={settings.darkMode} onValueChange={toggleDark} trackColor={{ true: Colors.primary }} />,
            },
          ].map((setting, i) => (
            <View key={i} style={[styles.settingRow, { borderBottomColor: border }]}>
              <View style={[styles.settingIcon, { backgroundColor: setting.color + '18' }]}>
                <Ionicons name={setting.icon as any} size={18} color={setting.color} />
              </View>
              <Text style={[styles.settingLabel, { color: textPrimary }]}>{setting.label}</Text>
              {setting.right}
            </View>
          ))}

          {[
            { icon: 'help-circle-outline', label: 'Help & Support', color: '#00838F' },
            { icon: 'information-circle-outline', label: 'About FoodBridge', color: Colors.textLight },
          ].map((item, i) => (
            <Pressable
              key={i}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              style={({ pressed }) => [styles.settingRow, { borderBottomColor: border, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[styles.settingIcon, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon as any} size={18} color={item.color} />
              </View>
              <Text style={[styles.settingLabel, { color: textPrimary }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
            </Pressable>
          ))}
        </View>

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutBtn, { opacity: pressed ? 0.85 : 1, backgroundColor: '#FFEBEE', borderColor: Colors.danger }]}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={[styles.logoutText, { color: Colors.danger }]}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 32 },
  headerTop: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 },
  notifBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  notifBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: Colors.accent, borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  notifBadgeText: { color: '#fff', fontSize: 9, fontFamily: 'Poppins_700Bold' },
  avatarSection: { alignItems: 'center', gap: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 28 },
  profileName: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 20 },
  profileEmail: { color: 'rgba(255,255,255,0.75)', fontFamily: 'Poppins_400Regular', fontSize: 13 },
  roleBadge: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5, marginTop: 4 },
  roleText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  content: { padding: 16, gap: 16 },
  statsCard: { borderRadius: 18, padding: 18, borderWidth: 1 },
  section: { borderRadius: 18, padding: 18, borderWidth: 1 },
  cardTitle: { fontFamily: 'Poppins_700Bold', fontSize: 16, marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  statCell: { width: '50%', alignItems: 'center', paddingVertical: 14, gap: 6 },
  statIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
  statLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  donationRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  donationItems: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  donationDate: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 },
  statusBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  emptyHistory: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 13 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  settingIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 14 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16, borderWidth: 1 },
  logoutText: { fontFamily: 'Poppins_700Bold', fontSize: 16 },
});
