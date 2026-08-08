import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform,
  Alert, Animated, TextInput, ScrollView, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/colors';
import { getApiUrl } from '@/lib/query-client';
import type { Category, StorageLocation } from '@/context/AppContext';
import { useApp } from '@/context/AppContext';

interface ScanResult {
  name: string;
  category: Category;
  shelfLifeDays: number;
  confidence: number;
  storageLocation: StorageLocation;
  unit: string;
}

const CATEGORIES: Category[] = ['Fruits', 'Vegetables', 'Dairy', 'Grains', 'Protein', 'Beverages', 'Other'];
const STORAGE_LOCATIONS: StorageLocation[] = ['Fridge', 'Freezer', 'Pantry', 'Counter'];
const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'loaf', 'pack', 'box', 'can', 'bottle'];

function ScanBeam({ scanning }: { scanning: boolean }) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, { toValue: 200, duration: 1000, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      translateY.setValue(0);
    }
  }, [scanning]);

  if (!scanning) return null;
  return (
    <Animated.View style={[styles.beam, { transform: [{ translateY }] }]}>
      <View style={styles.beamLine} />
    </Animated.View>
  );
}

// ── Manual Entry Modal ───────────────────────────────
function ManualEntryModal({
  visible,
  initial,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: Partial<ScanResult>;
  onClose: () => void;
  onSave: (result: ScanResult) => void;
}) {
  const [name, setName] = useState(initial.name ?? '');
  const [category, setCategory] = useState<Category>(initial.category ?? 'Vegetables');
  const [shelfLifeDays, setShelfLifeDays] = useState(String(initial.shelfLifeDays ?? 7));
  const [storageLocation, setStorageLocation] = useState<StorageLocation>(initial.storageLocation ?? 'Fridge');
  const [unit, setUnit] = useState(initial.unit ?? 'pcs');

  // Sync initial values when modal opens with pre-filled data
  useEffect(() => {
    if (visible) {
      setName(initial.name ?? '');
      setCategory(initial.category ?? 'Vegetables');
      setShelfLifeDays(String(initial.shelfLifeDays ?? 7));
      setStorageLocation(initial.storageLocation ?? 'Fridge');
      setUnit(initial.unit ?? 'pcs');
    }
  }, [visible]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a food name');
      return;
    }
    const days = parseInt(shelfLifeDays);
    if (isNaN(days) || days <= 0) {
      Alert.alert('Error', 'Please enter a valid shelf life');
      return;
    }
    onSave({ name: name.trim(), category, shelfLifeDays: days, confidence: 100, storageLocation, unit });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.modalTitle}>Manual Entry</Text>
          <Pressable onPress={handleSave} style={styles.modalSaveBtn}>
            <Text style={styles.modalSaveText}>Add</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
          {/* Name */}
          <Text style={styles.modalLabel}>Food Name *</Text>
          <TextInput
            style={styles.modalInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Tomatoes"
            placeholderTextColor={Colors.textLight}
            autoCapitalize="words"
          />

          {/* Category */}
          <Text style={styles.modalLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {CATEGORIES.map(cat => (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                style={[styles.chip, category === cat && styles.chipSelected]}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextSelected]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Shelf Life */}
          <Text style={styles.modalLabel}>Estimated Shelf Life (days)</Text>
          <TextInput
            style={styles.modalInput}
            value={shelfLifeDays}
            onChangeText={setShelfLifeDays}
            placeholder="7"
            placeholderTextColor={Colors.textLight}
            keyboardType="numeric"
          />

          {/* Storage */}
          <Text style={styles.modalLabel}>Storage Location</Text>
          <View style={styles.chipRow}>
            {STORAGE_LOCATIONS.map(loc => (
              <Pressable
                key={loc}
                onPress={() => setStorageLocation(loc)}
                style={[styles.chip, storageLocation === loc && styles.chipSelected]}
              >
                <Text style={[styles.chipText, storageLocation === loc && styles.chipTextSelected]}>{loc}</Text>
              </Pressable>
            ))}
          </View>

          {/* Unit */}
          <Text style={styles.modalLabel}>Unit</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {UNITS.map(u => (
              <Pressable
                key={u}
                onPress={() => setUnit(u)}
                style={[styles.chip, unit === u && styles.chipSelected]}
              >
                <Text style={[styles.chipText, unit === u && styles.chipTextSelected]}>{u}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Main Scanner Screen ──────────────────────────────
export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const { addFoodItem } = useApp();

  const [state, setState] = useState<'idle' | 'scanning' | 'result'>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [showManual, setShowManual] = useState(false);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;




  const scanWithAI = async (imageBase64: string) => {
    setState('scanning');
    try {
      // Use raw fetch so we can inspect the response body even on non-2xx status
      // (apiRequest throws for any non-ok status before we can read the JSON)
      const { fetch } = await import('expo/fetch');
      const url = new URL('/api/scan', getApiUrl()).toString();
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg' }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        // AI couldn't identify food — offer manual entry
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'Not Detected',
          'The AI couldn\'t identify this item. Would you like to enter it manually?',
          [
            { text: 'Cancel', onPress: () => setState('idle') },
            { text: 'Enter Manually', onPress: () => { setState('idle'); setShowManual(true); } },
          ]
        );
        return;
      }
      setResult(data);
      setState('result');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Network/server error — offer manual entry
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Scanner Unavailable',
        'Could not reach the scanner service. Would you like to enter the item manually?',
        [
          { text: 'Cancel', onPress: () => setState('idle') },
          { text: 'Enter Manually', onPress: () => { setState('idle'); setShowManual(true); } },
        ]
      );
    }
  };

  const simulateScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState('scanning');
    setTimeout(() => {
      const DEMO_FOODS: ScanResult[] = [
        { name: 'Apple', category: 'Fruits', shelfLifeDays: 14, confidence: 96, storageLocation: 'Fridge', unit: 'pcs' },
        { name: 'Milk', category: 'Dairy', shelfLifeDays: 7, confidence: 97, storageLocation: 'Fridge', unit: 'L' },
        { name: 'Broccoli', category: 'Vegetables', shelfLifeDays: 7, confidence: 88, storageLocation: 'Fridge', unit: 'g' },
        { name: 'Eggs', category: 'Protein', shelfLifeDays: 21, confidence: 98, storageLocation: 'Fridge', unit: 'pcs' },
        { name: 'Bread', category: 'Grains', shelfLifeDays: 5, confidence: 93, storageLocation: 'Counter', unit: 'loaf' },
      ];
      const food = DEMO_FOODS[Math.floor(Math.random() * DEMO_FOODS.length)];
      setResult(food);
      setState('result');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 2200);
  };

  const handleOpenCamera = async () => {
    if (Platform.OS === 'web') {
      simulateScan();
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Access', 'Camera permission is needed to scan food items.', [
        { text: 'Enter Manually', onPress: () => setShowManual(true) },
        { text: 'Try Demo', onPress: simulateScan },
      ]);
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.5,
      base64: true,
    });
    if (!picked.canceled && picked.assets[0].base64) {
      await scanWithAI(picked.assets[0].base64);
    }
  };

  const handleUseResult = async () => {
    if (!result) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const today = new Date();
    const expiry = new Date(today);
    expiry.setDate(expiry.getDate() + result.shelfLifeDays);
    await addFoodItem({
      name: result.name,
      category: result.category,
      quantity: '1',
      unit: result.unit,
      purchaseDate: today.toISOString().split('T')[0],
      expiryDate: expiry.toISOString().split('T')[0],
      storageLocation: result.storageLocation,
    });
    Alert.alert('Added!', `${result.name} has been added to your pantry.`, [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const handleManualSave = async (manualResult: ScanResult) => {
    setShowManual(false);
    const today = new Date();
    const expiry = new Date(today);
    expiry.setDate(expiry.getDate() + manualResult.shelfLifeDays);
    await addFoodItem({
      name: manualResult.name,
      category: manualResult.category,
      quantity: '1',
      unit: manualResult.unit,
      purchaseDate: today.toISOString().split('T')[0],
      expiryDate: expiry.toISOString().split('T')[0],
      storageLocation: manualResult.storageLocation,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Added!', `${manualResult.name} has been added to your pantry.`, [
      { text: 'OK', onPress: () => router.back() }
    ]);
  };

  const handleScanAgain = () => { setResult(null); setState('idle'); };
  const confidenceColor = (c: number) => c >= 90 ? Colors.primary : c >= 80 ? Colors.accent : Colors.danger;

  return (
    <View style={[styles.container, { backgroundColor: '#0A1A0A' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>AI Food Scanner</Text>
        <Pressable onPress={() => setShowManual(true)} style={styles.manualBtn}>
          <Ionicons name="create-outline" size={20} color={Colors.primaryLight} />
        </Pressable>
      </View>

      {/* Scanner Frame */}
      <View style={styles.scanArea}>
        <View style={styles.scanFrame}>
          {[{ top: 0, left: 0 }, { top: 0, right: 0 }, { bottom: 0, left: 0 }, { bottom: 0, right: 0 }].map((pos, i) => (
            <View key={i} style={[styles.corner, pos, {
              borderTopWidth: pos.top !== undefined ? 3 : 0,
              borderBottomWidth: (pos as any).bottom !== undefined ? 3 : 0,
              borderLeftWidth: pos.left !== undefined ? 3 : 0,
              borderRightWidth: (pos as any).right !== undefined ? 3 : 0,
              borderTopLeftRadius: pos.top !== undefined && pos.left !== undefined ? 8 : 0,
              borderTopRightRadius: pos.top !== undefined && (pos as any).right !== undefined ? 8 : 0,
              borderBottomLeftRadius: (pos as any).bottom !== undefined && pos.left !== undefined ? 8 : 0,
              borderBottomRightRadius: (pos as any).bottom !== undefined && (pos as any).right !== undefined ? 8 : 0,
            }]} />
          ))}
          <ScanBeam scanning={state === 'scanning'} />
          {state === 'idle' && (
            <View style={styles.idleContent}>
              <Ionicons name="scan-outline" size={48} color="rgba(255,255,255,0.4)" />
              <Text style={styles.idleText}>Point camera at food item</Text>
              <Pressable onPress={() => setShowManual(true)} style={styles.manualHint}>
                <Ionicons name="create-outline" size={14} color={Colors.primaryLight} />
                <Text style={styles.manualHintText}>or enter manually</Text>
              </Pressable>
            </View>
          )}
          {state === 'scanning' && (
            <View style={styles.scanningContent}>
              <Text style={styles.scanningText}>Analyzing...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Result Card */}
      {state === 'result' && result && (
        <View style={[styles.resultCard, { backgroundColor: '#1A2E1A' }]}>
          <View style={styles.resultHeader}>
            <View style={[styles.resultDot, { backgroundColor: confidenceColor(result.confidence) }]} />
            <Text style={styles.resultFoodName}>{result.name}</Text>
            <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor(result.confidence) }]}>
              <Text style={styles.confidenceText}>{result.confidence}% match</Text>
            </View>
          </View>
          <View style={styles.resultGrid}>
            {[
              { label: 'Category', value: result.category, icon: 'pricetag-outline' },
              { label: 'Storage', value: result.storageLocation, icon: 'cube-outline' },
              { label: 'Shelf Life', value: `~${result.shelfLifeDays} days`, icon: 'calendar-outline' },
              { label: 'Unit', value: result.unit, icon: 'scale-outline' },
            ].map((field, i) => (
              <View key={i} style={styles.resultField}>
                <Ionicons name={field.icon as any} size={14} color={Colors.primaryLight} />
                <Text style={styles.resultFieldLabel}>{field.label}</Text>
                <Text style={styles.resultFieldValue}>{field.value}</Text>
              </View>
            ))}
          </View>
          {/* Edit result before adding */}
          <Pressable onPress={() => { setShowManual(true); }} style={styles.editResultBtn}>
            <Ionicons name="create-outline" size={14} color={Colors.textLight} />
            <Text style={styles.editResultText}>Edit before adding</Text>
          </Pressable>
        </View>
      )}

      {/* Action Buttons */}
      <View style={[styles.actions, { paddingBottom: bottomPadding + 16 }]}>
        {state === 'result' ? (
          <>
            <Pressable onPress={handleScanAgain} style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.8 : 1 }]}>
              <Ionicons name="refresh-outline" size={18} color={Colors.primaryLight} />
              <Text style={styles.secondaryBtnText}>Scan Again</Text>
            </Pressable>
            <Pressable onPress={handleUseResult} style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.9 : 1 }]}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>Add to Pantry</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={simulateScan}
              disabled={state === 'scanning'}
              style={({ pressed }) => [styles.secondaryBtn, { opacity: state === 'scanning' ? 0.5 : pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="flash-outline" size={18} color={Colors.primaryLight} />
              <Text style={styles.secondaryBtnText}>Demo Scan</Text>
            </Pressable>
            <Pressable
              onPress={handleOpenCamera}
              disabled={state === 'scanning'}
              style={({ pressed }) => [styles.primaryBtn, { opacity: state === 'scanning' ? 0.5 : pressed ? 0.9 : 1 }]}
            >
              <Ionicons name="camera-outline" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>{state === 'scanning' ? 'Scanning...' : 'Open Camera'}</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Manual Entry Modal */}
      <ManualEntryModal
        visible={showManual}
        initial={result ?? {}}
        onClose={() => setShowManual(false)}
        onSave={handleManualSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 18 },
  manualBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  scanArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  scanFrame: { width: '100%', aspectRatio: 1, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden', position: 'relative' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: Colors.primaryLight },
  beam: { position: 'absolute', left: 0, right: 0, top: 0 },
  beamLine: { height: 2, backgroundColor: Colors.primaryLight, shadowColor: Colors.primaryLight, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8 },
  idleContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  idleText: { color: 'rgba(255,255,255,0.4)', fontFamily: 'Poppins_500Medium', fontSize: 14 },
  manualHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  manualHintText: { color: Colors.primaryLight, fontFamily: 'Poppins_400Regular', fontSize: 12 },
  scanningContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanningText: { color: Colors.primaryLight, fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  resultCard: { marginHorizontal: 16, borderRadius: 20, padding: 18, marginBottom: 12 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  resultDot: { width: 10, height: 10, borderRadius: 5 },
  resultFoodName: { flex: 1, color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 18 },
  confidenceBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  confidenceText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 12 },
  resultGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  resultField: { width: '47%', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, gap: 4 },
  resultFieldLabel: { color: Colors.textLight, fontFamily: 'Poppins_400Regular', fontSize: 11 },
  resultFieldValue: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  editResultBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-end' },
  editResultText: { color: Colors.textLight, fontFamily: 'Poppins_400Regular', fontSize: 12 },
  actions: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', gap: 12 },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16 },
  primaryBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 15 },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingVertical: 16 },
  secondaryBtnText: { color: Colors.primaryLight, fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#0A1A0A' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 18 },
  modalSaveBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  modalSaveText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  modalLabel: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Poppins_500Medium', fontSize: 13, marginBottom: 8, marginTop: 16 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontFamily: 'Poppins_400Regular', fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Poppins_500Medium', fontSize: 13 },
  chipTextSelected: { color: '#fff' },
});