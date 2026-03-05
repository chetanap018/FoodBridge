import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '@/context/AppContext';
import { Colors } from '@/constants/colors';
import type { Category, StorageLocation } from '@/context/AppContext';

interface ScanResult {
  name: string;
  category: Category;
  shelfLifeDays: number;
  confidence: number;
  storageLocation: StorageLocation;
  unit: string;
}

const MOCK_FOODS: ScanResult[] = [
  { name: 'Apple', category: 'Fruits', shelfLifeDays: 14, confidence: 96, storageLocation: 'Fridge', unit: 'pcs' },
  { name: 'Banana', category: 'Fruits', shelfLifeDays: 7, confidence: 94, storageLocation: 'Counter', unit: 'pcs' },
  { name: 'Carrot', category: 'Vegetables', shelfLifeDays: 21, confidence: 91, storageLocation: 'Fridge', unit: 'g' },
  { name: 'Broccoli', category: 'Vegetables', shelfLifeDays: 7, confidence: 88, storageLocation: 'Fridge', unit: 'g' },
  { name: 'Milk', category: 'Dairy', shelfLifeDays: 7, confidence: 97, storageLocation: 'Fridge', unit: 'L' },
  { name: 'Cheddar Cheese', category: 'Dairy', shelfLifeDays: 30, confidence: 85, storageLocation: 'Fridge', unit: 'g' },
  { name: 'Bread', category: 'Grains', shelfLifeDays: 5, confidence: 93, storageLocation: 'Counter', unit: 'loaf' },
  { name: 'Rice', category: 'Grains', shelfLifeDays: 180, confidence: 90, storageLocation: 'Pantry', unit: 'kg' },
  { name: 'Chicken Breast', category: 'Protein', shelfLifeDays: 3, confidence: 89, storageLocation: 'Fridge', unit: 'g' },
  { name: 'Eggs', category: 'Protein', shelfLifeDays: 21, confidence: 98, storageLocation: 'Fridge', unit: 'pcs' },
  { name: 'Orange Juice', category: 'Beverages', shelfLifeDays: 7, confidence: 92, storageLocation: 'Fridge', unit: 'L' },
  { name: 'Spinach', category: 'Vegetables', shelfLifeDays: 5, confidence: 87, storageLocation: 'Fridge', unit: 'g' },
  { name: 'Tomato', category: 'Vegetables', shelfLifeDays: 7, confidence: 95, storageLocation: 'Counter', unit: 'g' },
  { name: 'Yogurt', category: 'Dairy', shelfLifeDays: 14, confidence: 91, storageLocation: 'Fridge', unit: 'g' },
  { name: 'Pasta', category: 'Grains', shelfLifeDays: 365, confidence: 96, storageLocation: 'Pantry', unit: 'g' },
];

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

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { addFoodItem } = useApp();

  const [state, setState] = useState<'idle' | 'scanning' | 'result'>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const simulateScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setState('scanning');
    setTimeout(() => {
      const food = MOCK_FOODS[Math.floor(Math.random() * MOCK_FOODS.length)];
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
        { text: 'OK', onPress: simulateScan }
      ]);
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
    if (!picked.canceled) {
      simulateScan();
    }
  };

  const handleUseResult = () => {
    if (!result) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const today = new Date();
    const expiry = new Date(today);
    expiry.setDate(expiry.getDate() + result.shelfLifeDays);
    addFoodItem({
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

  const handleScanAgain = () => {
    setResult(null);
    setState('idle');
  };

  const confidenceColor = (c: number) => c >= 90 ? Colors.primary : c >= 80 ? Colors.accent : Colors.danger;

  return (
    <View style={[styles.container, { backgroundColor: '#0A1A0A' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>AI Food Scanner</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Scanner Frame */}
      <View style={styles.scanArea}>
        <View style={styles.scanFrame}>
          {/* Corner decorations */}
          {[{ top: 0, left: 0 }, { top: 0, right: 0 }, { bottom: 0, left: 0 }, { bottom: 0, right: 0 }].map((pos, i) => (
            <View
              key={i}
              style={[
                styles.corner,
                pos,
                {
                  borderTopWidth: pos.top !== undefined ? 3 : 0,
                  borderBottomWidth: pos.bottom !== undefined ? 3 : 0,
                  borderLeftWidth: pos.left !== undefined ? 3 : 0,
                  borderRightWidth: pos.right !== undefined ? 3 : 0,
                  borderTopLeftRadius: pos.top !== undefined && pos.left !== undefined ? 8 : 0,
                  borderTopRightRadius: pos.top !== undefined && pos.right !== undefined ? 8 : 0,
                  borderBottomLeftRadius: pos.bottom !== undefined && pos.left !== undefined ? 8 : 0,
                  borderBottomRightRadius: pos.bottom !== undefined && pos.right !== undefined ? 8 : 0,
                }
              ]}
            />
          ))}
          <ScanBeam scanning={state === 'scanning'} />

          {state === 'idle' && (
            <View style={styles.idleContent}>
              <Ionicons name="scan-outline" size={48} color="rgba(255,255,255,0.4)" />
              <Text style={styles.idleText}>Point camera at food item</Text>
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
        </View>
      )}

      {/* Action Buttons */}
      <View style={[styles.actions, { paddingBottom: bottomPadding + 16 }]}>
        {state === 'result' ? (
          <>
            <Pressable
              onPress={handleScanAgain}
              style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Ionicons name="refresh-outline" size={18} color={Colors.primaryLight} />
              <Text style={styles.secondaryBtnText}>Scan Again</Text>
            </Pressable>
            <Pressable
              onPress={handleUseResult}
              style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.9 : 1 }]}
            >
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 18 },
  scanArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  scanFrame: { width: '100%', aspectRatio: 1, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden', position: 'relative' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: Colors.primaryLight },
  beam: { position: 'absolute', left: 0, right: 0, top: 0 },
  beamLine: { height: 2, backgroundColor: Colors.primaryLight, shadowColor: Colors.primaryLight, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8 },
  idleContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  idleText: { color: 'rgba(255,255,255,0.4)', fontFamily: 'Poppins_500Medium', fontSize: 14 },
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
  actions: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row', gap: 12 },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16 },
  primaryBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 15 },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingVertical: 16 },
  secondaryBtnText: { color: Colors.primaryLight, fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
});
