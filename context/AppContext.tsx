import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useColorScheme, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { apiRequest } from '@/lib/query-client';

export type ExpiryStatus = 'fresh' | 'good' | 'warning' | 'danger' | 'expired';
export type Category = 'Fruits' | 'Vegetables' | 'Dairy' | 'Grains' | 'Protein' | 'Beverages' | 'Other';
export type StorageLocation = 'Fridge' | 'Freezer' | 'Pantry' | 'Counter';
export type UserRole = 'Donor' | 'Receiver' | 'Volunteer';
export type UserCategory = 'Pure Donor' | 'Pure Receiver' | 'Household';

export interface FoodItem {
  id: string;
  name: string;
  category: Category;
  quantity: string;
  unit: string;
  purchaseDate: string;
  expiryDate: string;
  storageLocation: StorageLocation;
  notes?: string;
  addedAt: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  missingIngredients: string[];
  cookTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  matchScore: number;
  emoji: string;
  description: string;
  steps: string[];
  filter: ('Quick Meals' | 'Zero Waste' | 'Healthy')[];
}

export interface DonationListing {
  id: string;
  donorName: string;
  title: string;
  foodCategory: string;
  quantity: string;
  unit: string;
  distance: string;
  distanceKm: number;
  type: 'vegetables' | 'bread' | 'canned' | 'dairy' | 'mixed';
  postedAt: string;
  available: boolean;
}

export interface UserDonation {
  id: string;
  title: string;
  foodCategory: string;
  quantity: string;
  unit: string;
  postedAt: number;
  status: 'pending' | 'accepted' | 'completed';
  receiverName?: string;
}

export interface Notification {
  id: string;
  type: 'expiry' | 'donation_accepted' | 'recipe' | 'nearby_food';
  message: string;
  itemName?: string;
  timestamp: number;
  read: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
  userCategory: UserCategory;
  entityType?: string;
  buildingName?: string;
  avatar: string;
  foodSaved: number;
  donationsMade: number;
  co2Reduced: number;
  mealsProvided: number;
}

export interface AppSettings {
  darkMode: boolean;
  notificationsEnabled: boolean;
  locationSharing: boolean;
}

interface AppContextValue {
  pantryItems: FoodItem[];
  recipes: Recipe[];
  nearbyDonations: DonationListing[];
  userDonations: UserDonation[];
  notifications: Notification[];
  profile: UserProfile;
  settings: AppSettings;
  addFoodItem: (item: Omit<FoodItem, 'id' | 'addedAt'>) => Promise<void>;
  removeFoodItem: (id: string, action?: 'consume' | 'donate' | 'waste') => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  postDonation: (itemIds: string[], note?: string, communityId?: string, isBulk?: boolean, bulkItems?: string[]) => Promise<void>;
  updateProfile: (data: { 
    name?: string; 
    role?: string; 
    userCategory?: UserCategory;
    entityType?: string;
    buildingName?: string;
    avatar?: string;
    foodSaved?: number;
    donationsMade?: number;
    co2Reduced?: number;
    mealsProvided?: number;
  }) => Promise<void>;
  getExpiryStatus: (expiryDate: string) => ExpiryStatus;
  getDaysRemaining: (expiryDate: string) => number;
  getExpiringItems: () => FoodItem[];
  removeAllExpiredItems: () => Promise<void>;
  isLoaded: boolean;
  isGeneratingRecipes: boolean;
  generateRecipes: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

function getDaysRemaining(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryStatus(expiryDate: string): ExpiryStatus {
  const days = getDaysRemaining(expiryDate);
  if (days < 0) return 'expired';
  if (days <= 2) return 'danger';
  if (days <= 6) return 'warning';
  if (days <= 14) return 'good';
  return 'fresh';
}

const today = new Date();
const dateOffset = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

function calculateItemWeightKg(quantityStr: string, unit: string): number {
  const qty = parseFloat(quantityStr) || 0;
  const u = unit.toLowerCase().trim();
  if (u === 'g' || u === 'ml') {
    return qty / 1000;
  }
  if (u === 'kg' || u === 'l') {
    return qty;
  }
  if (u === 'pcs') {
    return qty * 0.1; // Assumed 100g per piece
  }
  if (u === 'loaf') {
    return qty * 0.5; // Assumed 500g per loaf
  }
  if (u === 'pack' || u === 'box' || u === 'can' || u === 'bottle') {
    return qty * 0.4; // Assumed 400g average
  }
  return qty * 0.2; // Default fallback
}

const INITIAL_PANTRY: FoodItem[] = [
  { id: '1', name: 'Tomatoes', category: 'Vegetables', quantity: '500', unit: 'g', purchaseDate: dateOffset(-5), expiryDate: dateOffset(2), storageLocation: 'Fridge', addedAt: Date.now() - 5000 },
  { id: '2', name: 'Milk (Full Cream)', category: 'Dairy', quantity: '1', unit: 'L', purchaseDate: dateOffset(-3), expiryDate: dateOffset(4), storageLocation: 'Fridge', addedAt: Date.now() - 4000 },
  { id: '3', name: 'Bread (Wholegrain)', category: 'Grains', quantity: '1', unit: 'loaf', purchaseDate: dateOffset(-2), expiryDate: dateOffset(1), storageLocation: 'Counter', addedAt: Date.now() - 3000 },
  { id: '4', name: 'Chicken Breast', category: 'Protein', quantity: '400', unit: 'g', purchaseDate: dateOffset(-1), expiryDate: dateOffset(1), storageLocation: 'Freezer', addedAt: Date.now() - 2500 },
  { id: '5', name: 'Spinach', category: 'Vegetables', quantity: '200', unit: 'g', purchaseDate: dateOffset(-2), expiryDate: dateOffset(3), storageLocation: 'Fridge', addedAt: Date.now() - 2000 },
  { id: '6', name: 'Eggs', category: 'Protein', quantity: '6', unit: 'pcs', purchaseDate: dateOffset(-3), expiryDate: dateOffset(10), storageLocation: 'Fridge', addedAt: Date.now() - 1500 },
  { id: '7', name: 'Rice (Basmati)', category: 'Grains', quantity: '2', unit: 'kg', purchaseDate: dateOffset(-10), expiryDate: dateOffset(180), storageLocation: 'Pantry', addedAt: Date.now() - 1000 },
  { id: '8', name: 'Bananas', category: 'Fruits', quantity: '4', unit: 'pcs', purchaseDate: dateOffset(-2), expiryDate: dateOffset(5), storageLocation: 'Counter', addedAt: Date.now() - 500 },
];

const INITIAL_RECIPES: Recipe[] = [
  { id: 'r1', name: 'Tomato & Spinach Omelette', ingredients: ['Eggs', 'Tomatoes', 'Spinach'], missingIngredients: [], cookTime: '10 min', difficulty: 'Easy', matchScore: 100, emoji: '🍳', description: 'A hearty, nutritious omelette packed with fresh veggies.', steps: ['Whisk 3 eggs', 'Dice tomatoes and wilt spinach', 'Cook in pan for 5 mins each side'], filter: ['Quick Meals', 'Healthy', 'Zero Waste'] },
  { id: 'r2', name: 'Chicken Fried Rice', ingredients: ['Rice (Basmati)', 'Chicken Breast', 'Eggs'], missingIngredients: ['Soy sauce', 'Garlic'], cookTime: '25 min', difficulty: 'Medium', matchScore: 75, emoji: '🍚', description: 'Classic fried rice with tender chicken and fluffy eggs.', steps: ['Cook rice', 'Stir-fry chicken', 'Add eggs and rice', 'Season with soy sauce'], filter: ['Zero Waste'] },
  { id: 'r3', name: 'Banana Smoothie Bowl', ingredients: ['Bananas', 'Milk (Full Cream)'], missingIngredients: ['Granola', 'Honey'], cookTime: '5 min', difficulty: 'Easy', matchScore: 80, emoji: '🍌', description: 'Creamy blended bowl with banana and milk, perfect for breakfast.', steps: ['Blend bananas with milk', 'Pour into bowl', 'Top with granola and honey'], filter: ['Quick Meals', 'Healthy'] },
  { id: 'r4', name: 'Spinach & Egg Scramble', ingredients: ['Eggs', 'Spinach'], missingIngredients: ['Feta cheese', 'Olive oil'], cookTime: '8 min', difficulty: 'Easy', matchScore: 85, emoji: '🥗', description: 'Quick protein-packed scramble with wilted spinach.', steps: ['Wilt spinach in pan', 'Scramble eggs together', 'Season with salt and pepper'], filter: ['Quick Meals', 'Healthy', 'Zero Waste'] },
  { id: 'r5', name: 'Tomato Rice Soup', ingredients: ['Tomatoes', 'Rice (Basmati)'], missingIngredients: ['Vegetable broth', 'Onion', 'Garlic'], cookTime: '30 min', difficulty: 'Medium', matchScore: 60, emoji: '🍲', description: 'Warming soup with fresh tomatoes and rice, a cozy classic.', steps: ['Sauté onion and garlic', 'Add tomatoes and broth', 'Simmer with rice for 20 mins'], filter: ['Zero Waste', 'Healthy'] },
];

const INITIAL_NEARBY: DonationListing[] = [
  { id: 'd1', donorName: 'Green Market', title: 'Fresh Vegetables Bundle', foodCategory: 'Vegetables', quantity: '1', unit: 'Bundle', distance: '0.3 km', distanceKm: 0.3, type: 'vegetables', postedAt: '2 hrs ago', available: true },
  { id: 'd2', donorName: 'City Bakery', title: 'Surplus Bread & Pastries', foodCategory: 'Bakery', quantity: '1', unit: 'Bundle', distance: '0.8 km', distanceKm: 0.8, type: 'bread', postedAt: '4 hrs ago', available: true },
  { id: 'd3', donorName: 'Community Pantry', title: 'Canned Food Pack', foodCategory: 'Other', quantity: '1', unit: 'Bundle', distance: '1.2 km', distanceKm: 1.2, type: 'canned', postedAt: '6 hrs ago', available: true },
];

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'expiry', message: 'Bread expires tomorrow — donate or use now', itemName: 'Bread (Wholegrain)', timestamp: Date.now() - 3600000, read: false },
  { id: 'n2', type: 'expiry', message: 'Chicken Breast expires in 1 day', itemName: 'Chicken Breast', timestamp: Date.now() - 7200000, read: false },
  { id: 'n3', type: 'nearby_food', message: 'Fresh Vegetables Bundle available 0.3km from you', timestamp: Date.now() - 10800000, read: false },
  { id: 'n4', type: 'recipe', message: 'New recipe suggestion: Tomato & Spinach Omelette', timestamp: Date.now() - 86400000, read: true },
  { id: 'n5', type: 'donation_accepted', message: 'Your donation was accepted by Green Market', timestamp: Date.now() - 172800000, read: true },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [pantryItems, setPantryItems] = useState<FoodItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [userDonations, setUserDonations] = useState<UserDonation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const [settings, setSettings] = useState<AppSettings>({ darkMode: false, notificationsEnabled: true, locationSharing: true });
  const [profile, setProfile] = useState<UserProfile>({ name: '', email: '', role: 'Donor', userCategory: 'Household', avatar: '?', foodSaved: 0, donationsMade: 0, co2Reduced: 0, mealsProvided: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGeneratingRecipes, setIsGeneratingRecipes] = useState(false);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;

    const loadData = async (session: Session | null) => {
      setIsLoaded(false);
      try {
        const settingsRaw = await AsyncStorage.getItem('settings');
        if (settingsRaw) setSettings(JSON.parse(settingsRaw));

        if (!session) {
          // GUEST MODE
          const localPantryRaw = await AsyncStorage.getItem('pantryItems');
          if (localPantryRaw) {
            setPantryItems(JSON.parse(localPantryRaw));
          } else {
            setPantryItems(INITIAL_PANTRY);
          }
          setUserDonations([]);
          setProfile({ name: 'Guest User', email: '', role: 'Donor', userCategory: 'Household', avatar: 'G', foodSaved: 0, donationsMade: 0, co2Reduced: 0, mealsProvided: 0 });
          setIsLoaded(true);
          return;
        }

        // USER MODE
        const userId = session.user.id;
        setProfile(prev => ({
          ...prev,
          email: session.user.email ?? '',
          name: session.user.user_metadata?.full_name ?? prev.name,
          avatar: (session.user.user_metadata?.full_name ?? session.user.email ?? '?')[0].toUpperCase(),
        }));

        // Migration Check
        const migratedKey = `pantry_migrated_${userId}`;
        const alreadyMigrated = await AsyncStorage.getItem(migratedKey);
        
        if (!alreadyMigrated) {
          const localPantryRaw = await AsyncStorage.getItem('pantryItems');
          if (localPantryRaw) {
            const localPantry: FoodItem[] = JSON.parse(localPantryRaw);
            // ONLY migrate items that are NOT the hardcoded samples (IDs 1-8)
            const userCreatedItems = localPantry.filter(i => i.id.length > 2);
            if (userCreatedItems.length > 0) {
              await apiRequest('POST', '/api/pantry/migrate', { userId, items: userCreatedItems });
            }
          }
          await AsyncStorage.setItem(migratedKey, 'true');
          await AsyncStorage.removeItem('pantryItems');
        }

        // Fetch DB data
        const [pantryRes, donationsRes, notifRes] = await Promise.all([
          apiRequest('GET', `/api/pantry?userId=${userId}`),
          apiRequest('GET', `/api/donations?userId=${userId}`),
          apiRequest('GET', '/api/notifications'),
        ]);

        const pantryData: FoodItem[] = await pantryRes.json();
        const donationsData: any[] = await donationsRes.json();

        setPantryItems(pantryData); // Logged in user sees EXACTLY their DB items (even if 0)
        setUserDonations(donationsData);

        // Fetch server notifications and merge with any local ones
        try {
          if (notifRes.ok) {
            const serverNotifs: any[] = await notifRes.json();
            if (Array.isArray(serverNotifs) && serverNotifs.length > 0) {
              const mapped: Notification[] = serverNotifs.map((n: any) => ({
                id: n.id,
                type: (n.type === 'alert' ? 'expiry' : n.type) as Notification['type'],
                message: n.message,
                timestamp: n.timestamp ? (typeof n.timestamp === 'number' ? n.timestamp * 1000 : new Date(n.timestamp).getTime()) : Date.now(),
                read: n.read,
              }));
              setNotifications(mapped);
            }
          }
        } catch { /* ignore notification fetch error */ }

        // Profile details from DB
        try {
          const profileRes = await apiRequest('GET', `/api/users/${userId}`);
          if (profileRes.ok) {
            const dbUser = await profileRes.json();
            setProfile(prev => ({
              ...prev,
              name: dbUser.name ?? prev.name,
              role: dbUser.role ?? prev.role,
              userCategory: dbUser.userCategory ?? prev.userCategory,
              entityType: dbUser.entityType ?? prev.entityType,
              buildingName: dbUser.buildingName ?? prev.buildingName,
              foodSaved: Number(dbUser.foodSaved) || 0,
              donationsMade: Number(dbUser.donationsMade) || 0,
              co2Reduced: Number(dbUser.co2Reduced) || 0,
              mealsProvided: Number(dbUser.mealsProvided) || 0,
              avatar: dbUser.avatar || (dbUser.name ?? dbUser.email ?? '?')[0].toUpperCase(),
            }));
          }
        } catch { /* ignore profile fetch error */ }

      } catch (err) {
        console.error('Loading user data failed:', err);
        // On error, we provide an empty list for safety rather than sample data
        setPantryItems([]); 
      } finally {
        setIsLoaded(true);
      }
    };

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadData(session);
    });

    // Listen for auth changes
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        loadData(session);
      }
    });
    subscription = data.subscription;

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Persist guest pantry items locally
  useEffect(() => {
    const persistGuest = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && isLoaded) {
        AsyncStorage.setItem('pantryItems', JSON.stringify(pantryItems));
      }
    };
    persistGuest();
  }, [pantryItems, isLoaded]);

  // Persist settings to AsyncStorage
  useEffect(() => {
    if (isLoaded) AsyncStorage.setItem('settings', JSON.stringify(settings));
  }, [settings, isLoaded]);

  const addFoodItem = async (item: Omit<FoodItem, 'id' | 'addedAt'>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Offline fallback
      const newItem: FoodItem = { ...item, id: generateId(), addedAt: Date.now() };
      setPantryItems(prev => [newItem, ...prev]);
      return;
    }
    try {
      const res = await apiRequest('POST', '/api/pantry', {
        ...item,
        userId: session.user.id,
      });
      const newItem: FoodItem = await res.json();
      setPantryItems(prev => [newItem, ...prev]);
    } catch {
      // Fallback to local
      const newItem: FoodItem = { ...item, id: generateId(), addedAt: Date.now() };
      setPantryItems(prev => [newItem, ...prev]);
    }
  };

  const removeFoodItem = async (id: string, action?: 'consume' | 'donate' | 'waste') => {
    const itemToDelete = pantryItems.find(item => item.id === id);
    
    // Optimistic update
    setPantryItems(prev => prev.filter(item => item.id !== id));

    if (itemToDelete && action === 'consume') {
      const weight = calculateItemWeightKg(itemToDelete.quantity, itemToDelete.unit);
      const roundedWeight = Math.round(weight * 10) / 10;
      const co2 = Math.round(weight * 2.5 * 10) / 10;
      const meals = Math.round(weight * 2);

      const newStats = {
        foodSaved: Math.round((profile.foodSaved + roundedWeight) * 10) / 10,
        co2Reduced: Math.round((profile.co2Reduced + co2) * 10) / 10,
        mealsProvided: profile.mealsProvided + meals,
      };

      await updateProfile(newStats);
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      await apiRequest('DELETE', `/api/pantry/${id}?userId=${session.user.id}`);
    } catch {
      // If server delete fails, item was already removed locally — acceptable
    }
  };

  const removeAllExpiredItems = async () => {
    const expiredIds = pantryItems.filter(item => getDaysRemaining(item.expiryDate) < 0).map(i => i.id);
    if (expiredIds.length === 0) return;

    // Optimistic update
    setPantryItems(prev => prev.filter(item => getDaysRemaining(item.expiryDate) >= 0));
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    try {
      await Promise.all(
        expiredIds.map(id => apiRequest('DELETE', `/api/pantry/${id}?userId=${session.user.id}`))
      );
    } catch {
      // Silent catch
    }
  };

  const postDonation = async (itemIds: string[], _note?: string, communityId?: string, isBulk?: boolean, bulkItems?: string[]) => {
    let itemsNames: string[] = [];
    let roundedWeight = 0;
    let co2 = 0;
    let meals = 0;

    if (isBulk && bulkItems) {
      itemsNames = bulkItems;
      // Heuristic: Bulk donations represent a lot of weight, we can estimate or pass weight directly.
      // Let's assume 10kg average for a bulk generic donation for stats if not calculated.
      roundedWeight = 10;
      co2 = 25;
      meals = 20;
    } else {
      const itemsToDonate = pantryItems.filter(item => itemIds.includes(item.id));
      itemsNames = itemsToDonate.map(item => item.name);
      
      let totalWeight = 0;
      itemsToDonate.forEach(item => {
        totalWeight += calculateItemWeightKg(item.quantity, item.unit);
      });
      
      roundedWeight = Math.round(totalWeight * 10) / 10;
      co2 = Math.round(totalWeight * 2.5 * 10) / 10;
      meals = Math.round(totalWeight * 2);
    }

    // Optimistically update local profile stats
    setProfile(prev => ({ 
      ...prev, 
      donationsMade: prev.donationsMade + 1,
      foodSaved: Math.round((prev.foodSaved + roundedWeight) * 10) / 10,
      co2Reduced: Math.round((prev.co2Reduced + co2) * 10) / 10,
      mealsProvided: prev.mealsProvided + meals,
    }));

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const donation: UserDonation = { id: generateId(), title: itemsNames.join(', '), foodCategory: 'Other', quantity: '1', unit: 'batch', postedAt: Date.now(), status: 'pending' };
      setUserDonations(prev => [donation, ...prev]);
      return;
    }
    try {
      const payload: any = { 
        userId: session.user.id, 
        title: itemsNames.join(', '), 
        foodCategory: 'Other', 
        quantity: '1', 
        unit: 'batch', 
        visibility: communityId ? 'community' : 'public'
      };
      if (communityId) payload.communityId = communityId;

      const res = await apiRequest('POST', '/api/donations', payload);
      const donation = await res.json();
      
      setUserDonations(prev => [donation, ...prev]);

      // Update server-side profile stats — use functional update to avoid stale closure
      setProfile(prev => {
        const newStats = {
          donationsMade: prev.donationsMade,
          foodSaved: Math.round((prev.foodSaved + roundedWeight) * 10) / 10,
          co2Reduced: Math.round((prev.co2Reduced + co2) * 10) / 10,
          mealsProvided: prev.mealsProvided + meals,
        };
        apiRequest('PATCH', `/api/users/${session.user.id}`, {
          donationsMade: newStats.donationsMade,
          foodSaved: newStats.foodSaved,
          co2Reduced: newStats.co2Reduced,
          mealsProvided: newStats.mealsProvided,
        }).catch(() => {});
        return prev; // Don't double-update, stats were already set optimistically above
      });
    } catch {
      const donation: UserDonation = { id: generateId(), title: itemsNames.join(', '), foodCategory: 'Other', quantity: '1', unit: 'batch', postedAt: Date.now(), status: 'pending' };
      setUserDonations(prev => [donation, ...prev]);
    }
  };

  const updateProfile = async (data: { 
    name?: string; 
    role?: string; 
    userCategory?: UserCategory;
    entityType?: string;
    buildingName?: string;
    avatar?: string;
    foodSaved?: number;
    donationsMade?: number;
    co2Reduced?: number;
    mealsProvided?: number;
  }) => {
    // Optimistic Local Fallback (applies instantly)
    setProfile(prev => ({
      ...prev,
      name: data.name ?? prev.name,
      role: (data.role as any) ?? prev.role,
      userCategory: data.userCategory ?? prev.userCategory,
      entityType: data.entityType !== undefined ? data.entityType : prev.entityType,
      buildingName: data.buildingName !== undefined ? data.buildingName : prev.buildingName,
      avatar: data.avatar ?? prev.avatar,
      foodSaved: data.foodSaved !== undefined ? data.foodSaved : prev.foodSaved,
      donationsMade: data.donationsMade !== undefined ? data.donationsMade : prev.donationsMade,
      co2Reduced: data.co2Reduced !== undefined ? data.co2Reduced : prev.co2Reduced,
      mealsProvided: data.mealsProvided !== undefined ? data.mealsProvided : prev.mealsProvided,
    }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return; // Works locally in offline mode!
      
      const res = await apiRequest("PATCH", `/api/users/${session.user.id}`, data);
      const updated = await res.json();
      
      // Sync confirmed state
      setProfile(prev => ({
        ...prev,
        name: updated.name ?? prev.name,
        role: updated.role ?? prev.role,
        userCategory: updated.userCategory ?? prev.userCategory,
        entityType: updated.entityType ?? prev.entityType,
        buildingName: updated.buildingName ?? prev.buildingName,
        avatar: updated.avatar || (updated.name ?? updated.email ?? "?")[0].toUpperCase(),
        foodSaved: Number(updated.foodSaved) || 0,
        donationsMade: Number(updated.donationsMade) || 0,
        co2Reduced: Number(updated.co2Reduced) || 0,
        mealsProvided: Number(updated.mealsProvided) || 0,
      }));
    } catch (err) {
      // Network failed or API error - we silently gracefully handle it
      // The optimistic local state is already applied!
    }
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    // Sync to server (best-effort)
    apiRequest('PATCH', `/api/notifications/${id}/read`).catch(() => {});
  };

  const clearAllNotifications = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    // Sync to server (best-effort)
    apiRequest('PATCH', '/api/notifications/clear-all').catch(() => {});
  };

  const getExpiringItems = () => {
    return pantryItems.filter(item => {
      const days = getDaysRemaining(item.expiryDate);
      return days >= 0 && days <= 6;
    }).sort((a, b) => getDaysRemaining(a.expiryDate) - getDaysRemaining(b.expiryDate));
  };

  const generateRecipes = async () => {
    const validItems = pantryItems.filter(item => getDaysRemaining(item.expiryDate) >= 0);
    
    if (validItems.length === 0) {
      Alert.alert("Empty Pantry", "Add some non-expired items to your pantry first!");
      return;
    }

    const urgentIngredients = validItems
      .filter(item => getDaysRemaining(item.expiryDate) <= 3)
      .map(item => item.name);

    const normalIngredients = validItems
      .filter(item => getDaysRemaining(item.expiryDate) > 3)
      .map(item => item.name);

    setIsGeneratingRecipes(true);
    try {
      const res = await apiRequest('POST', '/api/recipes/suggest', {
        urgentIngredients,
        normalIngredients
      });
      const data = await res.json();
      if (data.recipes) {
        setRecipes(data.recipes);
      }
    } catch (err) {
      console.error("Failed to generate recipes:", err);
    } finally {
      setIsGeneratingRecipes(false);
    }
  };

  const value = useMemo(() => ({
    pantryItems,
    recipes,
    nearbyDonations: INITIAL_NEARBY,
    userDonations,
    notifications,
    profile,
    settings,
    addFoodItem,
    removeFoodItem,
    updateSettings,
    markNotificationRead,
    clearAllNotifications,
    postDonation,
    updateProfile,
    getExpiryStatus,
    getDaysRemaining,
    getExpiringItems,
    removeAllExpiredItems,
    isLoaded,
    isGeneratingRecipes,
    generateRecipes,
  }), [pantryItems, recipes, userDonations, notifications, settings, profile, isLoaded, isGeneratingRecipes]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function useIsDark(): boolean {
  const { settings } = useApp();
  const systemScheme = useColorScheme();
  if (settings.darkMode !== undefined) return settings.darkMode;
  return systemScheme === 'dark';
}
