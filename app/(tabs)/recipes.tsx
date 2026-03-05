import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  useColorScheme,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp, Recipe } from '@/context/AppContext';
import { Colors } from '@/constants/colors';

type FilterType = 'All' | 'Quick Meals' | 'Zero Waste' | 'Healthy';
const FILTERS: FilterType[] = ['All', 'Quick Meals', 'Zero Waste', 'Healthy'];

const DIFFICULTY_COLORS = { Easy: '#2E7D32', Medium: '#FF8F00', Hard: '#D32F2F' };

function RecipeModal({ recipe, visible, onClose, isDark }: { recipe: Recipe; visible: boolean; onClose: () => void; isDark: boolean }) {
  const insets = useSafeAreaInsets();
  const bg = isDark ? Colors.dark.background : Colors.background;
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const cardBg = isDark ? Colors.dark.card : Colors.surface;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: bg }]}>
        <View style={[styles.modalHeader, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={textPrimary} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: textPrimary }]}>Recipe</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          <View style={styles.modalHero}>
            <Text style={styles.recipeEmoji}>{recipe.emoji}</Text>
            <Text style={[styles.modalRecipeName, { color: textPrimary }]}>{recipe.name}</Text>
            <Text style={[styles.modalDesc, { color: textSecondary }]}>{recipe.description}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                <Text style={[styles.metaText, { color: textSecondary }]}>{recipe.cookTime}</Text>
              </View>
              <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[recipe.difficulty] }]}>
                <Text style={styles.difficultyText}>{recipe.difficulty}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="checkmark-circle-outline" size={16} color={Colors.primary} />
                <Text style={[styles.metaText, { color: Colors.primary }]}>{recipe.matchScore}% match</Text>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            <Text style={[styles.sectionLabel, { color: textPrimary }]}>Ingredients</Text>
            {recipe.ingredients.map(ing => (
              <View key={ing} style={[styles.ingredientRow, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="checkmark" size={16} color={Colors.primary} />
                <Text style={[styles.ingredientText, { color: Colors.primary }]}>{ing}</Text>
                <Text style={styles.inPantryLabel}>In pantry</Text>
              </View>
            ))}
            {recipe.missingIngredients.map(ing => (
              <View key={ing} style={[styles.ingredientRow, { backgroundColor: cardBg }]}>
                <Ionicons name="add-outline" size={16} color={Colors.textLight} />
                <Text style={[styles.ingredientText, { color: textSecondary }]}>{ing}</Text>
                <Text style={styles.missingLabel}>Missing</Text>
              </View>
            ))}

            <Text style={[styles.sectionLabel, { color: textPrimary, marginTop: 20 }]}>Steps</Text>
            {recipe.steps.map((step, idx) => (
              <View key={idx} style={styles.stepRow}>
                <View style={[styles.stepNum, { backgroundColor: Colors.primary }]}>
                  <Text style={styles.stepNumText}>{idx + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: textSecondary }]}>{step}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function RecipeCard({ recipe, isDark, onPress }: { recipe: Recipe; isDark: boolean; onPress: () => void }) {
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const cardBg = isDark ? Colors.dark.card : Colors.card;
  const border = isDark ? Colors.dark.border : Colors.border;

  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={({ pressed }) => [styles.recipeCard, { backgroundColor: cardBg, borderColor: border, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={styles.recipeCardTop}>
        <View style={styles.emojiWrap}>
          <Text style={styles.cardEmoji}>{recipe.emoji}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={[styles.recipeName, { color: textPrimary }]}>{recipe.name}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[recipe.difficulty] }]}>
              <Text style={styles.difficultyText}>{recipe.difficulty}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color={Colors.textLight} />
              <Text style={[styles.cardMeta, { color: textSecondary }]}>{recipe.cookTime}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.matchCircle, { borderColor: Colors.primary }]}>
          <Text style={[styles.matchText, { color: Colors.primary }]}>{recipe.matchScore}%</Text>
        </View>
      </View>

      <View style={styles.ingredientsWrap}>
        {recipe.ingredients.map(ing => (
          <View key={ing} style={[styles.ingTag, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="checkmark" size={11} color={Colors.primary} />
            <Text style={[styles.ingText, { color: Colors.primary }]}>{ing}</Text>
          </View>
        ))}
        {recipe.missingIngredients.map(ing => (
          <View key={ing} style={[styles.ingTag, { backgroundColor: isDark ? Colors.dark.surface : '#F5F5F5' }]}>
            <Text style={[styles.ingText, { color: Colors.textLight }]}>{ing}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

export default function RecipesScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { recipes } = useApp();
  const [filter, setFilter] = useState<FilterType>('All');
  const [search, setSearch] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const bg = isDark ? Colors.dark.background : Colors.background;
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const filtered = recipes.filter(r => {
    const matchFilter = filter === 'All' || r.filter.includes(filter as any);
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.ingredients.some(i => i.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  }).sort((a, b) => b.matchScore - a.matchScore);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 8, backgroundColor: isDark ? Colors.dark.card : '#1B5E20' }]}>
        <Text style={styles.headerTitle}>Recipe Suggestions</Text>
        <Text style={styles.headerSubtitle}>Based on your pantry items</Text>
        <View style={[styles.searchBar, { backgroundColor: isDark ? Colors.dark.background : '#fff' }]}>
          <Ionicons name="search-outline" size={18} color={Colors.textLight} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or ingredient..."
            placeholderTextColor={Colors.textLight}
            style={[styles.searchInput, { color: textPrimary, fontFamily: 'Poppins_400Regular' }]}
          />
        </View>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={[styles.filterScroll, { backgroundColor: isDark ? Colors.dark.surface : Colors.surface }]}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map(f => (
          <Pressable
            key={f}
            onPress={() => { Haptics.selectionAsync(); setFilter(f); }}
            style={[styles.filterChip, {
              backgroundColor: filter === f ? Colors.primary : (isDark ? Colors.dark.card : '#fff'),
              borderColor: filter === f ? Colors.primary : border,
            }]}
          >
            <Text style={[styles.filterLabel, { color: filter === f ? '#fff' : textSecondary }]}>{f}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: Platform.OS === 'web' ? 120 : 100 }]}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={56} color={Colors.textLight} />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>No recipes found</Text>
            <Text style={[styles.emptyText, { color: textSecondary }]}>Add more items to your pantry</Text>
          </View>
        ) : (
          filtered.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              isDark={isDark}
              onPress={() => setSelectedRecipe(recipe)}
            />
          ))
        )}
      </ScrollView>

      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          visible={!!selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          isDark={isDark}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 22 },
  headerSubtitle: { color: 'rgba(255,255,255,0.75)', fontFamily: 'Poppins_400Regular', fontSize: 13, marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  filterScroll: { maxHeight: 52 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 10, flexDirection: 'row' },
  filterChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1 },
  filterLabel: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  recipeCard: { borderRadius: 18, padding: 16, borderWidth: 1 },
  recipeCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  emojiWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 28 },
  recipeName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, marginBottom: 6 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  difficultyBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  difficultyText: { color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMeta: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  matchCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  matchText: { fontFamily: 'Poppins_700Bold', fontSize: 13 },
  ingredientsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ingTag: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  ingText: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
  inPantryLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, color: Colors.primary, marginLeft: 'auto' },
  missingLabel: { fontFamily: 'Poppins_400Regular', fontSize: 10, color: Colors.textLight, marginLeft: 'auto' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center' },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  modalHero: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
  recipeEmoji: { fontSize: 72, marginBottom: 12 },
  modalRecipeName: { fontFamily: 'Poppins_700Bold', fontSize: 22, textAlign: 'center', marginBottom: 8 },
  modalDesc: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  metaText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  sectionLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, marginBottom: 12 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6 },
  ingredientText: { fontFamily: 'Poppins_500Medium', fontSize: 14, flex: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepNumText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 13 },
  stepText: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 22 },
});
