import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  useColorScheme,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp, FoodItem, ExpiryStatus, Category } from '@/context/AppContext';
import { Colors } from '@/constants/colors';

const CATEGORIES: Category[] = ['Fruits', 'Vegetables', 'Dairy', 'Grains', 'Protein', 'Beverages', 'Other'];

const EXPIRY_COLORS: Record<ExpiryStatus, string> = {
  fresh: Colors.expiry.fresh,
  good: Colors.expiry.good,
  warning: Colors.expiry.warning,
  danger: Colors.expiry.danger,
  expired: Colors.expiry.expired,
};

const EXPIRY_BG: Record<ExpiryStatus, string> = {
  fresh: '#E8F5E9',
  good: '#F1F8E9',
  warning: '#FFF8E1',
  danger: '#FFEBEE',
  expired: '#F5F5F5',
};

const CATEGORY_ICONS: Record<Category, string> = {
  Fruits: 'nutrition-outline',
  Vegetables: 'leaf-outline',
  Dairy: 'water-outline',
  Grains: 'cellular-outline',
  Protein: 'fitness-outline',
  Beverages: 'cafe-outline',
  Other: 'cube-outline',
};

function FoodItemCard({ item, onDelete }: { item: FoodItem; onDelete: () => void }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { getExpiryStatus, getDaysRemaining } = useApp();
  const status = getExpiryStatus(item.expiryDate);
  const days = getDaysRemaining(item.expiryDate);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert('Remove Item', `Remove ${item.name} from pantry?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: () => {
          Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(onDelete);
        }
      },
    ]);
  };

  const cardBg = isDark ? Colors.dark.card : EXPIRY_BG[status];
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Pressable
        style={[styles.foodCard, { backgroundColor: cardBg, borderLeftColor: EXPIRY_COLORS[status] }]}
      >
        <View style={[styles.cardIconWrap, { backgroundColor: EXPIRY_COLORS[status] + '22' }]}>
          <Ionicons name={CATEGORY_ICONS[item.category] as any} size={20} color={EXPIRY_COLORS[status]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.foodName, { color: textPrimary }]}>{item.name}</Text>
          <Text style={[styles.foodMeta, { color: textSecondary }]}>
            {item.quantity}{item.unit} · {item.storageLocation}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.expiryBadge, { backgroundColor: EXPIRY_COLORS[status] }]}>
            <Text style={styles.expiryBadgeText}>
              {days < 0 ? 'Expired' : days === 0 ? 'Today' : `${days}d`}
            </Text>
          </View>
          <Pressable onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color={Colors.textLight} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function PantryScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { pantryItems, removeFoodItem } = useApp();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category | 'All'>('All');

  const bg = isDark ? Colors.dark.background : Colors.background;
  const cardBg = isDark ? Colors.dark.card : Colors.card;
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const filtered = pantryItems.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchSearch && matchCategory;
  });

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: isDark ? Colors.dark.card : Colors.primary }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Smart Pantry</Text>
            <Text style={styles.headerSubtitle}>{pantryItems.length} items tracked</Text>
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/scanner'); }}
            style={styles.scanBtn}
          >
            <Ionicons name="scan-outline" size={20} color={Colors.primary} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: isDark ? Colors.dark.background : '#fff' }]}>
          <Ionicons name="search-outline" size={18} color={Colors.textLight} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search items..."
            placeholderTextColor={Colors.textLight}
            style={[styles.searchInput, { color: textPrimary, fontFamily: 'Poppins_400Regular' }]}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textLight} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.categoryScroll, { backgroundColor: isDark ? Colors.dark.surface : Colors.surface }]}
        contentContainerStyle={styles.categoryContent}
      >
        {(['All', ...CATEGORIES] as const).map(cat => (
          <Pressable
            key={cat}
            onPress={() => { Haptics.selectionAsync(); setActiveCategory(cat as any); }}
            style={[
              styles.categoryChip,
              {
                backgroundColor: activeCategory === cat ? Colors.primary : (isDark ? Colors.dark.card : '#fff'),
                borderColor: activeCategory === cat ? Colors.primary : border,
              }
            ]}
          >
            {cat !== 'All' && (
              <Ionicons
                name={CATEGORY_ICONS[cat as Category] as any}
                size={14}
                color={activeCategory === cat ? '#fff' : Colors.textSecondary}
              />
            )}
            <Text style={[styles.categoryLabel, { color: activeCategory === cat ? '#fff' : textSecondary }]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Food List */}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === 'web' ? 120 : 100 }]}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="basket-outline" size={56} color={Colors.textLight} />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>No items found</Text>
            <Text style={[styles.emptyText, { color: textSecondary }]}>
              {search ? 'Try a different search term' : 'Add food items to start tracking'}
            </Text>
          </View>
        ) : (
          filtered.map(item => (
            <FoodItemCard key={item.id} item={item} onDelete={() => removeFoodItem(item.id)} />
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/add-food'); }}
        style={({ pressed }) => [
          styles.fab,
          { bottom: (Platform.OS === 'web' ? 100 : insets.bottom + 88), opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] }
        ]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerTitle: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 22 },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontFamily: 'Poppins_400Regular', fontSize: 13 },
  scanBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  categoryScroll: { maxHeight: 52 },
  categoryContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 10, flexDirection: 'row' },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  categoryLabel: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  foodCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, borderLeftWidth: 4 },
  cardIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  foodName: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  foodMeta: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  expiryBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  expiryBadgeText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 11 },
  deleteBtn: { padding: 4 },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center' },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
});
