import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { useApp, useIsDark , Category, StorageLocation} from '@/context/AppContext';

const CATEGORIES: Category[] = ['Fruits', 'Vegetables', 'Dairy', 'Grains', 'Protein', 'Beverages', 'Other'];
const STORAGE: StorageLocation[] = ['Fridge', 'Freezer', 'Pantry', 'Counter'];
const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'loaf', 'pack', 'box', 'can', 'bottle'];

function SelectOption<T extends string>({
  label, options, value, onChange, isDark
}: { label: string; options: T[]; value: T; onChange: (v: T) => void; isDark: boolean }) {
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const cardBg = isDark ? Colors.dark.card : '#fff';
  const border = isDark ? Colors.dark.border : Colors.border;

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: textSecondary }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
        {options.map(opt => (
          <Pressable
            key={opt}
            onPress={() => { Haptics.selectionAsync(); onChange(opt); }}
            style={[
              styles.optionChip,
              {
                backgroundColor: value === opt ? Colors.primary : cardBg,
                borderColor: value === opt ? Colors.primary : border,
              }
            ]}
          >
            <Text style={[styles.optionText, { color: value === opt ? '#fff' : textPrimary }]}>{opt}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function DateField({ label, value, onChange, isDark }: { label: string; value: string; onChange: (v: string) => void; isDark: boolean }) {
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;
  const cardBg = isDark ? Colors.dark.card : '#fff';

  return (
    <View style={[styles.fieldGroup, { flex: 1 }]}>
      <Text style={[styles.fieldLabel, { color: textSecondary }]}>{label}</Text>
      <View style={[styles.input, { backgroundColor: cardBg, borderColor: border, flexDirection: 'row', alignItems: 'center' }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textLight}
          style={[styles.inputText, { color: textPrimary, flex: 1 }]}
          keyboardType="numeric"
        />
        <Ionicons name="calendar-outline" size={18} color={Colors.textLight} />
      </View>
    </View>
  );
}

export default function AddFoodScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { addFoodItem } = useApp();

  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Vegetables');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState<string>('pcs');
  const [purchaseDate, setPurchaseDate] = useState(today);
  const [expiryDate, setExpiryDate] = useState(nextWeek);
  const [storage, setStorage] = useState<StorageLocation>('Fridge');
  const [notes, setNotes] = useState('');

  const bg = isDark ? Colors.dark.background : Colors.background;
  const cardBg = isDark ? Colors.dark.card : '#fff';
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPadding = Platform.OS === 'web' ? 34 : insets.bottom;

  const validate = (): string | null => {
    if (!name.trim()) return 'Please enter a food name.';
    if (!quantity || isNaN(Number(quantity))) return 'Please enter a valid quantity.';
    if (!purchaseDate.match(/^\d{4}-\d{2}-\d{2}$/)) return 'Purchase date must be YYYY-MM-DD.';
    if (!expiryDate.match(/^\d{4}-\d{2}-\d{2}$/)) return 'Expiry date must be YYYY-MM-DD.';
    if (expiryDate < purchaseDate) return 'Expiry date must be after purchase date.';
    return null;
  };

  const handleSave = () => {
    const error = validate();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addFoodItem({ name: name.trim(), category, quantity, unit, purchaseDate, expiryDate, storageLocation: storage, notes: notes.trim() || undefined });
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: isDark ? Colors.dark.card : Colors.primary }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Add Food Item</Text>
        <Pressable onPress={handleSave} style={styles.saveHeaderBtn}>
          <Text style={styles.saveHeaderText}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Scan hint */}
        <Pressable
          onPress={() => router.push('/scanner')}
          style={[styles.scanHint, { backgroundColor: isDark ? '#1A2E1A' : '#E8F5E9', borderColor: Colors.primary + '44' }]}
        >
          <Ionicons name="scan-outline" size={20} color={Colors.primary} />
          <Text style={[styles.scanHintText, { color: Colors.primary }]}>Use AI Scanner to auto-fill details</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
        </Pressable>

        {/* Food Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: textSecondary }]}>Food Name *</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Tomatoes"
            placeholderTextColor={Colors.textLight}
            style={[styles.input, styles.inputText, { backgroundColor: cardBg, borderColor: border, color: textPrimary }]}
          />
        </View>

        {/* Category */}
        <SelectOption label="Category *" options={CATEGORIES} value={category} onChange={setCategory} isDark={isDark} />

        {/* Quantity + Unit */}
        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={[styles.fieldLabel, { color: textSecondary }]}>Quantity *</Text>
            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={Colors.textLight}
              style={[styles.input, styles.inputText, { backgroundColor: cardBg, borderColor: border, color: textPrimary }]}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1.5 }]}>
            <Text style={[styles.fieldLabel, { color: textSecondary }]}>Unit *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {UNITS.map(u => (
                <Pressable
                  key={u}
                  onPress={() => { Haptics.selectionAsync(); setUnit(u); }}
                  style={[styles.optionChip, { backgroundColor: unit === u ? Colors.primary : cardBg, borderColor: unit === u ? Colors.primary : border }]}
                >
                  <Text style={[styles.optionText, { color: unit === u ? '#fff' : textPrimary }]}>{u}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.row}>
          <DateField label="Purchase Date *" value={purchaseDate} onChange={setPurchaseDate} isDark={isDark} />
          <DateField label="Expiry Date *" value={expiryDate} onChange={setExpiryDate} isDark={isDark} />
        </View>

        {/* Storage */}
        <SelectOption label="Storage Location" options={STORAGE} value={storage} onChange={setStorage} isDark={isDark} />

        {/* Notes */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: textSecondary }]}>Notes (optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes..."
            placeholderTextColor={Colors.textLight}
            multiline
            numberOfLines={3}
            style={[styles.input, styles.inputText, styles.textarea, { backgroundColor: cardBg, borderColor: border, color: textPrimary }]}
          />
        </View>

        {/* Save */}
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.9 : 1 }]}
        >
          <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
          <Text style={styles.saveBtnText}>Add to Pantry</Text>
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
  saveHeaderBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  saveHeaderText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 18 },
  scanHint: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 14, borderWidth: 1 },
  scanHintText: { flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 14 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  row: { flexDirection: 'row', gap: 12 },
  input: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  inputText: { fontFamily: 'Poppins_400Regular', fontSize: 14 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  optionChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  optionText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 18, marginTop: 8 },
  saveBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 },
});
