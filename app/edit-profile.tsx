import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, Image,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp, useIsDark, type UserRole, type UserCategory } from '@/context/AppContext';

const ROLES: { key: UserRole; icon: 'heart-outline' | 'hand-left-outline' | 'people-outline'; color: string }[] = [
  { key: 'Donor', icon: 'heart-outline', color: '#2E7D32' },
  { key: 'Receiver', icon: 'hand-left-outline', color: '#1565C0' },
  { key: 'Volunteer', icon: 'people-outline', color: '#FF8F00' },
];

const CATEGORIES: { key: UserCategory; icon: 'home-outline' | 'basket-outline' | 'gift-outline'; color: string }[] = [
  { key: 'Household', icon: 'home-outline', color: '#2E7D32' },
  { key: 'Pure Donor', icon: 'gift-outline', color: '#1565C0' },
  { key: 'Pure Receiver', icon: 'basket-outline', color: '#FF8F00' },
];

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { profile, updateProfile } = useApp();

  const [name, setName] = useState(profile.name);
  const [role, setRole] = useState<UserRole>(profile.role);
  const [userCategory, setUserCategory] = useState<UserCategory>(profile.userCategory || 'Household');
  const [entityType, setEntityType] = useState<string>(profile.entityType || '');
  const [buildingName, setBuildingName] = useState<string>(profile.buildingName || '');
  const [avatar, setAvatar] = useState(profile.avatar);
  const [loading, setLoading] = useState(false);

  const bg = isDark ? Colors.dark.background : Colors.background;
  const cardBg = isDark ? Colors.dark.card : '#fff';
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const hasChanges = name !== profile.name || role !== profile.role || avatar !== profile.avatar || userCategory !== profile.userCategory || entityType !== (profile.entityType || '') || buildingName !== (profile.buildingName || '');

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Permission to access photos is required to upload a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setAvatar(base64Image);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Permission to access the camera is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setAvatar(base64Image);
    }
  };

  const handleSelectImage = () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ 
        name: name.trim(), 
        role, 
        avatar, 
        userCategory,
        entityType: userCategory !== 'Household' ? entityType : undefined,
        buildingName: userCategory !== 'Household' ? buildingName.trim() : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: isDark ? Colors.dark.card : Colors.primary }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable
          onPress={handleSave}
          disabled={loading || !hasChanges}
          style={[styles.saveBtn, (!hasChanges || loading) && { opacity: 0.5 }]}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Save</Text>}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar preview */}
        <View style={styles.avatarSection}>
          <Pressable onPress={handleSelectImage} style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: Colors.primary, overflow: 'hidden' }]}>
              {avatar && avatar.startsWith('data:image') ? (
                <Image source={{ uri: avatar }} style={{ width: 80, height: 80 }} />
              ) : (
                <Text style={styles.avatarText}>
                  {name ? name[0].toUpperCase() : '?'}
                </Text>
              )}
            </View>
            <View style={styles.editOverlay}>
              <Ionicons name="camera-outline" size={14} color="#fff" />
            </View>
          </Pressable>
          <Text style={[styles.avatarHint, { color: textSecondary }]}>
            Tap to change profile picture
          </Text>
        </View>

        {/* Name */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Display Name</Text>
          <View style={[styles.inputWrapper, { borderColor: border, backgroundColor: isDark ? Colors.dark.background : '#F9F9F9' }]}>
            <Ionicons name="person-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: textPrimary }]}
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor={Colors.textLight}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Email (read-only) */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Email</Text>
          <View style={[styles.inputWrapper, { borderColor: border, backgroundColor: isDark ? Colors.dark.background : '#F9F9F9', opacity: 0.6 }]}>
            <Ionicons name="mail-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
            <Text style={[styles.input, { color: textSecondary }]}>{profile.email}</Text>
          </View>
          <Text style={[styles.fieldHint, { color: textSecondary }]}>Email cannot be changed here</Text>
        </View>

        {/* Role */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Role</Text>
          <View style={styles.rolesContainer}>
            {ROLES.map(r => {
              const selected = role === r.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRole(r.key); // ✅ r.key is now typed as UserRole directly
                  }}
                  style={[
                    styles.roleRow,
                    { borderColor: selected ? r.color : border, backgroundColor: selected ? r.color + '12' : 'transparent' }
                  ]}
                >
                  <View style={[styles.roleIcon, { backgroundColor: r.color + '20' }]}>
                    <Ionicons name={r.icon} size={18} color={r.color} />
                  </View>
                  <Text style={[styles.roleLabel, { color: selected ? r.color : textPrimary }]}>{r.key}</Text>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={r.color} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* User Category */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Account Type</Text>
          <Text style={[styles.fieldHint, { color: textSecondary, marginBottom: 8 }]}>Only Household accounts have access to the Pantry and AI Recipes features.</Text>
          <View style={styles.rolesContainer}>
            {CATEGORIES.map(c => {
              const selected = userCategory === c.key;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setUserCategory(c.key);
                  }}
                  style={[
                    styles.roleRow,
                    { borderColor: selected ? c.color : border, backgroundColor: selected ? c.color + '12' : 'transparent' }
                  ]}
                >
                  <View style={[styles.roleIcon, { backgroundColor: c.color + '20' }]}>
                    <Ionicons name={c.icon} size={18} color={c.color} />
                  </View>
                  <Text style={[styles.roleLabel, { color: selected ? c.color : textPrimary }]}>{c.key}</Text>
                  {selected && <Ionicons name="checkmark-circle" size={20} color={c.color} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Additional details for Pure Donor / Pure Receiver */}
        {userCategory !== 'Household' && (
          <>
            <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Facility / Category Type</Text>
              <View style={[styles.inputWrapper, { borderColor: border, backgroundColor: isDark ? Colors.dark.background : '#F9F9F9' }]}>
                <Ionicons name="pricetag-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: textPrimary }]}
                  value={entityType}
                  onChangeText={setEntityType}
                  placeholder={userCategory === 'Pure Donor' ? 'e.g. Hotel, Convention Hall' : 'e.g. Old Age Home, Orphanage'}
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>

            <View style={[styles.section, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>Building Name / Address</Text>
              <View style={[styles.inputWrapper, { borderColor: border, backgroundColor: isDark ? Colors.dark.background : '#F9F9F9' }]}>
                <Ionicons name="business-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: textPrimary }]}
                  value={buildingName}
                  onChangeText={setBuildingName}
                  placeholder="e.g. Grand Plaza Tower B, Main St"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>
          </>
        )}

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          disabled={loading || !hasChanges}
          style={({ pressed }) => [
            styles.saveLargeBtn,
            { opacity: pressed || loading || !hasChanges ? 0.6 : 1 }
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveLargeBtnText}>Save Changes</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 18 },
  saveBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, minWidth: 56, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  content: { padding: 16, gap: 16 },
  avatarSection: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 32 },
  editOverlay: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  avatarHint: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  section: { borderRadius: 18, padding: 18, borderWidth: 1, gap: 12 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, gap: 10 },
  inputIcon: { width: 20 },
  input: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 14 },
  fieldHint: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: -4 },
  rolesContainer: { gap: 10 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderWidth: 1.5 },
  roleIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  roleLabel: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  saveLargeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, marginTop: 8 },
  saveLargeBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 },
});