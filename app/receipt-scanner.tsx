import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform,
  Alert, Animated, ScrollView, ActivityIndicator,
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

interface ReceiptItem {
  name: string;
  category: Category;
  quantity: string;
  unit: string;
  purchaseDate: string;
  shelfLifeDays: number;
  storageLocation: StorageLocation;
}

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

export default function ReceiptScannerScreen() {
  const insets = useSafeAreaInsets();
  const { addFoodItem } = useApp();

  const [state, setState] = useState<'idle' | 'scanning' | 'result'>('idle');
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [isAddingAll, setIsAddingAll] = useState(false);

  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const scanReceiptWithAI = async (imageBase64: string) => {
    setState('scanning');
    try {
      const { fetch } = await import('expo/fetch');
      const url = new URL('/api/scan-receipt', getApiUrl()).toString();
      const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg' }),
          credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok || data.error || !data.items || data.items.length === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          data.error ? 'Scan Issue' : 'No Items Detected',
          data.error || "The AI couldn't find any food items on this receipt. Please try another photo.",
          [{ text: 'OK', onPress: () => setState('idle') }]
        );
        return;
      }
      setItems(data.items);
      setState('result');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Scan error:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Scanner Unavailable',
        'Could not reach the scanner service. Please try again later.',
        [{ text: 'OK', onPress: () => setState('idle') }]
      );
    }
  };

  const handleOpenCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Access', 'Camera permission is needed to scan receipts.');
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });
    if (!picked.canceled && picked.assets[0].base64) {
      await scanReceiptWithAI(picked.assets[0].base64);
    }
  };

  const handleSelectImage = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });
    if (!picked.canceled && picked.assets[0].base64) {
      await scanReceiptWithAI(picked.assets[0].base64);
    }
  };

  const handleAddAllToPantry = async () => {
    setIsAddingAll(true);
    try {
      for (const item of items) {
        const purchaseDate = new Date(item.purchaseDate);
        const expiryDate = new Date(purchaseDate);
        expiryDate.setDate(expiryDate.getDate() + item.shelfLifeDays);

        await addFoodItem({
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          purchaseDate: item.purchaseDate,
          expiryDate: expiryDate.toISOString().split('T')[0],
          storageLocation: item.storageLocation,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success!', `Added ${items.length} items to your pantry.`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error('Add all error:', err);
      Alert.alert('Error', 'Some items failed to add. Please try again.');
    } finally {
      setIsAddingAll(false);
    }
  };

  const handleScanAgain = () => { setItems([]); setState('idle'); };

  return (
    <View style={[styles.container, { backgroundColor: '#0A1A0A' }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Receipt Scanner</Text>
        <View style={{ width: 40 }} />
      </View>

      {state !== 'result' ? (
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
                <Ionicons name="receipt-outline" size={48} color="rgba(255,255,255,0.4)" />
                <Text style={styles.idleText}>Scan your grocery receipt</Text>
                <Text style={styles.idleSubText}>We'll extract items and add them to your pantry</Text>
              </View>
            )}
            {state === 'scanning' && (
              <View style={styles.scanningContent}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.scanningText}>Analyzing Receipt...</Text>
              </View>
            )}
          </View>

          <View style={styles.entryActions}>
            <Pressable onPress={handleOpenCamera} disabled={state === 'scanning'} style={styles.actionBtnLarge}>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.actionBtnText}>Take Photo</Text>
            </Pressable>
            <Pressable onPress={handleSelectImage} disabled={state === 'scanning'} style={styles.actionBtnLargeSecondary}>
              <Ionicons name="images" size={24} color={Colors.primary} />
              <Text style={[styles.actionBtnText, { color: Colors.primary }]}>Upload Image</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <Text style={styles.resultCountText}>{items.length} items found</Text>
          <ScrollView style={styles.itemsList} contentContainerStyle={{ paddingBottom: 20 }}>
            {items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(item.category) }]}>
                  <Text style={styles.categoryEmoji}>{getCategoryEmoji(item.category)}</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDetail}>{item.quantity} {item.unit} • {item.category}</Text>
                </View>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemDate}>{item.purchaseDate}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.actions, { paddingBottom: bottomPadding + 16 }]}>
            <Pressable onPress={handleScanAgain} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Rescan</Text>
            </Pressable>
            <Pressable onPress={handleAddAllToPantry} disabled={isAddingAll} style={styles.primaryBtn}>
              {isAddingAll ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>Add All to Pantry</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function getCategoryColor(cat: Category) {
  switch (cat) {
    case 'Fruits': return 'rgba(255, 107, 107, 0.2)';
    case 'Vegetables': return 'rgba(81, 207, 102, 0.2)';
    case 'Dairy': return 'rgba(77, 171, 247, 0.2)';
    case 'Grains': return 'rgba(255, 212, 59, 0.2)';
    case 'Protein': return 'rgba(255, 146, 43, 0.2)';
    default: return 'rgba(134, 142, 150, 0.2)';
  }
}

function getCategoryEmoji(cat: Category) {
  switch (cat) {
    case 'Fruits': return '🍎';
    case 'Vegetables': return '🥬';
    case 'Dairy': return '🧀';
    case 'Grains': return '🍞';
    case 'Protein': return '🥩';
    default: return '📦';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 18 },
  scanArea: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  scanFrame: { width: '100%', height: 300, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', overflow: 'hidden', position: 'relative' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: Colors.primaryLight },
  beam: { position: 'absolute', left: 0, right: 0, top: 0 },
  beamLine: { height: 2, backgroundColor: Colors.primaryLight, shadowColor: Colors.primaryLight, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8 },
  idleContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  idleText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 18, textAlign: 'center' },
  idleSubText: { color: 'rgba(255,255,255,0.4)', fontFamily: 'Poppins_400Regular', fontSize: 13, textAlign: 'center' },
  scanningContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  scanningText: { color: Colors.primaryLight, fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  entryActions: { marginTop: 40, gap: 16 },
  actionBtnLarge: { backgroundColor: Colors.primary, borderRadius: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  actionBtnLargeSecondary: { backgroundColor: 'rgba(81, 207, 102, 0.1)', borderRadius: 20, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1, borderColor: Colors.primary },
  actionBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 },
  resultContainer: { flex: 1, paddingHorizontal: 20 },
  resultCountText: { color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins_500Medium', fontSize: 14, marginBottom: 16, marginTop: 8 },
  itemsList: { flex: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 12, marginBottom: 10 },
  categoryIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  categoryEmoji: { fontSize: 20 },
  itemInfo: { flex: 1 },
  itemName: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  itemDetail: { color: 'rgba(255,255,255,0.4)', fontFamily: 'Poppins_400Regular', fontSize: 12 },
  itemMeta: { alignItems: 'flex-end' },
  itemDate: { color: 'rgba(255,255,255,0.3)', fontFamily: 'Poppins_400Regular', fontSize: 11 },
  actions: { flexDirection: 'row', gap: 12, paddingTop: 16 },
  primaryBtn: { flex: 2, backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 15 },
  secondaryBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { color: Colors.primaryLight, fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
});
