import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable,
  StyleSheet, Alert, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { apiRequest } from '@/lib/query-client';
import { Colors } from '@/constants/colors';
import { useApp, type UserCategory, type UserRole } from '@/context/AppContext';

const ACCOUNT_TYPES: { key: UserCategory; title: string; desc: string; icon: any; color: string }[] = [
  {
    key: 'Household',
    title: 'Household',
    desc: 'For personal & family food management, sharing surplus & recipe suggestions.',
    icon: 'home-outline',
    color: '#2E7D32',
  },
  {
    key: 'Pure Donor',
    title: 'Pure Donor',
    desc: 'For businesses & organizations with bulk surplus food to donate.',
    icon: 'gift-outline',
    color: '#1565C0',
  },
  {
    key: 'Pure Receiver',
    title: 'Pure Receiver',
    desc: 'For NGOs, shelters, & homes receiving bulk food donations.',
    icon: 'basket-outline',
    color: '#FF8F00',
  },
];

const HOUSEHOLD_ROLES: { key: UserRole; label: string; desc: string; icon: any }[] = [
  { key: 'Donor', label: 'Donor', desc: 'I have surplus food to share with neighbors', icon: 'heart-outline' },
  { key: 'Receiver', label: 'Receiver', desc: 'I am looking for food donations from neighbors', icon: 'hand-left-outline' },
  { key: 'Volunteer', label: 'Volunteer', desc: 'I help connect donors and receivers in my area', icon: 'people-outline' },
];

const PURE_DONOR_CATEGORIES = [
  { key: 'Hotel / Restaurant', label: 'Hotel / Restaurant', icon: 'restaurant-outline' },
  { key: 'Convention / Function Hall', label: 'Convention / Function Hall', icon: 'business-outline' },
  { key: 'Catering Service', label: 'Catering Service', icon: 'fast-food-outline' },
  { key: 'Supermarket / Grocery', label: 'Supermarket / Grocery Store', icon: 'cart-outline' },
  { key: 'Corporate Cafeteria', label: 'Corporate Cafeteria', icon: 'briefcase-outline' },
  { key: 'Other Bulk Donor', label: 'Other Bulk Donor', icon: 'cube-outline' },
];

const PURE_RECEIVER_CATEGORIES = [
  { key: 'Old Age Home', label: 'Old Age Home', icon: 'heart-circle-outline' },
  { key: 'Orphanage', label: 'Orphanage', icon: 'people-circle-outline' },
  { key: 'Food Bank / Shelter', label: 'Food Bank / Shelter', icon: 'home-outline' },
  { key: 'Community Kitchen', label: 'Community Kitchen', icon: 'flame-outline' },
  { key: 'Charitable NGO', label: 'Charitable NGO', icon: 'shield-checkmark-outline' },
  { key: 'Other Receiver', label: 'Other Organization', icon: 'help-circle-outline' },
];

export default function OnboardingScreen() {
  const { updateProfile } = useApp();

  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<UserCategory | null>(null);

  // Household fields
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);

  // Pure Donor / Pure Receiver fields
  const [orgName, setOrgName] = useState('');
  const [entityType, setEntityType] = useState<string>('');
  const [buildingName, setBuildingName] = useState('');

  const [loading, setLoading] = useState(false);

  const handleSelectAccountType = (type: UserCategory) => {
    Haptics.selectionAsync();
    setAccountType(type);
  };

  const handleNextStep = () => {
    if (!accountType) {
      Alert.alert('Selection Required', 'Please select an account type to proceed.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(2);
  };

  const handleFinish = async () => {
    if (accountType === 'Household') {
      if (!name.trim()) {
        Alert.alert('Error', 'Please enter your name');
        return;
      }
      if (!role) {
        Alert.alert('Error', 'Please select a role');
        return;
      }
    } else if (accountType === 'Pure Donor' || accountType === 'Pure Receiver') {
      if (!orgName.trim()) {
        Alert.alert('Error', 'Please enter your Organization / Facility name');
        return;
      }
      if (!entityType) {
        Alert.alert('Error', 'Please select a category type');
        return;
      }
      if (!buildingName.trim()) {
        Alert.alert('Error', 'Please enter your Building Name / Address');
        return;
      }
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Session Expired', 'Please sign in again.');
        router.replace('/login');
        return;
      }

      const finalName = accountType === 'Household' ? name.trim() : orgName.trim();
      const finalRole: UserRole = accountType === 'Pure Donor' ? 'Donor' : accountType === 'Pure Receiver' ? 'Receiver' : (role || 'Donor');

      // 1. Sync to backend database
      await apiRequest('POST', '/api/auth/sync', {
        id: session.user.id,
        email: session.user.email ?? '',
        name: finalName,
        role: finalRole,
        userCategory: accountType,
        entityType: accountType !== 'Household' ? entityType : null,
        buildingName: accountType !== 'Household' ? buildingName.trim() : null,
      });

      // 2. Update local state
      await updateProfile({
        name: finalName,
        role: finalRole,
        userCategory: accountType as any,
        entityType: accountType !== 'Household' ? entityType : undefined,
        buildingName: accountType !== 'Household' ? buildingName.trim() : undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // 3. Enter app
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to complete profile setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={['#2E7D32', '#43A047']} style={styles.header}>
          <Ionicons name="leaf" size={42} color="#fff" />
          <Text style={styles.headerTitle}>Welcome to FoodBridge!</Text>
          <Text style={styles.headerSubtitle}>
            {step === 1 ? 'Step 1 of 2: Choose Account Type' : 'Step 2 of 2: Complete Your Details'}
          </Text>
        </LinearGradient>

        <View style={styles.body}>

          {/* STEP 1: Account Type Selection */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.sectionTitle}>What type of account would you like to create?</Text>

              <View style={styles.cardsList}>
                {ACCOUNT_TYPES.map((type) => {
                  const selected = accountType === type.key;
                  return (
                    <Pressable
                      key={type.key}
                      onPress={() => handleSelectAccountType(type.key)}
                      style={({ pressed }) => [
                        styles.accountCard,
                        selected && { borderColor: type.color, backgroundColor: type.color + '15' },
                        { opacity: pressed ? 0.85 : 1 }
                      ]}
                    >
                      <View style={[styles.iconWrap, { backgroundColor: type.color + '22' }]}>
                        <Ionicons name={type.icon} size={26} color={type.color} />
                      </View>
                      <View style={styles.cardTextWrap}>
                        <Text style={[styles.cardTitle, selected && { color: type.color }]}>{type.title}</Text>
                        <Text style={styles.cardDesc}>{type.desc}</Text>
                      </View>
                      {selected && (
                        <Ionicons name="checkmark-circle" size={24} color={type.color} />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={handleNextStep}
                disabled={!accountType}
                style={({ pressed }) => [
                  styles.submitBtn,
                  !accountType && styles.btnDisabled,
                  { opacity: pressed ? 0.85 : 1 }
                ]}
              >
                <Text style={styles.submitBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </Pressable>
            </View>
          )}

          {/* STEP 2: Details Based on Account Type */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Pressable onPress={() => setStep(1)} style={styles.backLink}>
                <Ionicons name="arrow-back" size={18} color={Colors.primaryLight} />
                <Text style={styles.backLinkText}>Change Account Type ({accountType})</Text>
              </Pressable>

              {/* HOUSEHOLD FLOW */}
              {accountType === 'Household' && (
                <View style={styles.formSection}>
                  <Text style={styles.inputLabel}>Username / Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. John Doe"
                      placeholderTextColor={Colors.textLight}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>

                  <Text style={[styles.inputLabel, { marginTop: 16 }]}>Choose your primary Role</Text>
                  <View style={styles.cardsList}>
                    {HOUSEHOLD_ROLES.map((r) => {
                      const selected = role === r.key;
                      return (
                        <Pressable
                          key={r.key}
                          onPress={() => { Haptics.selectionAsync(); setRole(r.key); }}
                          style={[
                            styles.roleRowCard,
                            selected && { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' }
                          ]}
                        >
                          <Ionicons name={r.icon as any} size={22} color={selected ? Colors.primaryLight : Colors.textLight} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.roleRowTitle, selected && { color: Colors.primaryLight }]}>{r.label}</Text>
                            <Text style={styles.roleRowDesc}>{r.desc}</Text>
                          </View>
                          {selected && <Ionicons name="checkmark-circle" size={20} color={Colors.primaryLight} />}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* PURE DONOR FLOW */}
              {accountType === 'Pure Donor' && (
                <View style={styles.formSection}>
                  <Text style={styles.inputLabel}>Establishment / Business Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="business-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Grand Hotel & Suites"
                      placeholderTextColor={Colors.textLight}
                      value={orgName}
                      onChangeText={setOrgName}
                      autoCapitalize="words"
                    />
                  </View>

                  <Text style={[styles.inputLabel, { marginTop: 16 }]}>Select Donor Category Type</Text>
                  <View style={styles.gridOptions}>
                    {PURE_DONOR_CATEGORIES.map((cat) => {
                      const selected = entityType === cat.key;
                      return (
                        <Pressable
                          key={cat.key}
                          onPress={() => { Haptics.selectionAsync(); setEntityType(cat.key); }}
                          style={[
                            styles.chipOption,
                            selected && { borderColor: '#1565C0', backgroundColor: 'rgba(21, 101, 192, 0.2)' }
                          ]}
                        >
                          <Ionicons name={cat.icon as any} size={18} color={selected ? '#42A5F5' : Colors.textLight} />
                          <Text style={[styles.chipText, selected && { color: '#42A5F5', fontFamily: 'Poppins_600SemiBold' }]}>{cat.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.inputLabel, { marginTop: 16 }]}>Building Name / Address</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="location-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Tower B, Convention Center Rd"
                      placeholderTextColor={Colors.textLight}
                      value={buildingName}
                      onChangeText={setBuildingName}
                    />
                  </View>
                </View>
              )}

              {/* PURE RECEIVER FLOW */}
              {accountType === 'Pure Receiver' && (
                <View style={styles.formSection}>
                  <Text style={styles.inputLabel}>Organization / Facility Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="heart-circle-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Hope Elderly Home & Shelter"
                      placeholderTextColor={Colors.textLight}
                      value={orgName}
                      onChangeText={setOrgName}
                      autoCapitalize="words"
                    />
                  </View>

                  <Text style={[styles.inputLabel, { marginTop: 16 }]}>Select Receiver Category Type</Text>
                  <View style={styles.gridOptions}>
                    {PURE_RECEIVER_CATEGORIES.map((cat) => {
                      const selected = entityType === cat.key;
                      return (
                        <Pressable
                          key={cat.key}
                          onPress={() => { Haptics.selectionAsync(); setEntityType(cat.key); }}
                          style={[
                            styles.chipOption,
                            selected && { borderColor: '#FF8F00', backgroundColor: 'rgba(255, 143, 0, 0.2)' }
                          ]}
                        >
                          <Ionicons name={cat.icon as any} size={18} color={selected ? '#FFB74D' : Colors.textLight} />
                          <Text style={[styles.chipText, selected && { color: '#FFB74D', fontFamily: 'Poppins_600SemiBold' }]}>{cat.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.inputLabel, { marginTop: 16 }]}>Building Name / Address</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="location-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Hope House, Block 4, City Care Complex"
                      placeholderTextColor={Colors.textLight}
                      value={buildingName}
                      onChangeText={setBuildingName}
                    />
                  </View>
                </View>
              )}

              <Pressable
                onPress={handleFinish}
                disabled={loading}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { opacity: pressed || loading ? 0.8 : 1 }
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Complete Setup</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  </>
                )}
              </Pressable>
            </View>
          )}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1A0A' },
  content: { flexGrow: 1 },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 32,
    paddingHorizontal: 24,
    gap: 8,
  },
  headerTitle: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 24, textAlign: 'center' },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontFamily: 'Poppins_500Medium', fontSize: 13 },
  body: { padding: 20 },
  stepContainer: { gap: 16 },
  sectionTitle: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 16, marginBottom: 4 },
  cardsList: { gap: 12 },
  accountCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  iconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cardTextWrap: { flex: 1 },
  cardTitle: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 },
  cardDesc: { color: Colors.textLight, fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 2 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, height: 54, marginTop: 16,
  },
  btnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  backLinkText: { color: Colors.primaryLight, fontFamily: 'Poppins_500Medium', fontSize: 13 },
  formSection: { gap: 10 },
  inputLabel: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, paddingHorizontal: 14, height: 52,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontFamily: 'Poppins_400Regular', fontSize: 14 },
  roleRowCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  roleRowTitle: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  roleRowDesc: { color: Colors.textLight, fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 },
  gridOptions: { gap: 8 },
  chipOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  chipText: { color: '#fff', fontFamily: 'Poppins_400Regular', fontSize: 13 },
});