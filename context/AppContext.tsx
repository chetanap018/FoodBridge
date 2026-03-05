import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExpiryStatus = 'fresh' | 'good' | 'warning' | 'danger' | 'expired';
export type Category = 'Fruits' | 'Vegetables' | 'Dairy' | 'Grains' | 'Protein' | 'Beverages' | 'Other';
export type StorageLocation = 'Fridge' | 'Freezer' | 'Pantry' | 'Counter';
export type UserRole = 'Donor' | 'Receiver' | 'Volunteer';

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
  items: string;
  distance: string;
  distanceKm: number;
  type: 'vegetables' | 'bread' | 'canned' | 'dairy' | 'mixed';
  postedAt: string;
  available: boolean;
}

export interface UserDonation {
  id: string;
  items: string[];
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
  addFoodItem: (item: Omit<FoodItem, 'id' | 'addedAt'>) => void;
  removeFoodItem: (id: string) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  postDonation: (items: string[], note?: string) => void;
  getExpiryStatus: (expiryDate: string) => ExpiryStatus;
  getDaysRemaining: (expiryDate: string) => number;
  getExpiringItems: () => FoodItem[];
  isLoaded: boolean;
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
  {
    id: 'r1',
    name: 'Tomato & Spinach Omelette',
    ingredients: ['Eggs', 'Tomatoes', 'Spinach'],
    missingIngredients: [],
    cookTime: '10 min',
    difficulty: 'Easy',
    matchScore: 100,
    emoji: '🍳',
    description: 'A hearty, nutritious omelette packed with fresh veggies.',
    steps: ['Whisk 3 eggs', 'Dice tomatoes and wilt spinach', 'Cook in pan for 5 mins each side'],
    filter: ['Quick Meals', 'Healthy', 'Zero Waste'],
  },
  {
    id: 'r2',
    name: 'Chicken Fried Rice',
    ingredients: ['Rice (Basmati)', 'Chicken Breast', 'Eggs'],
    missingIngredients: ['Soy sauce', 'Garlic'],
    cookTime: '25 min',
    difficulty: 'Medium',
    matchScore: 75,
    emoji: '🍚',
    description: 'Classic fried rice with tender chicken and fluffy eggs.',
    steps: ['Cook rice', 'Stir-fry chicken', 'Add eggs and rice', 'Season with soy sauce'],
    filter: ['Zero Waste'],
  },
  {
    id: 'r3',
    name: 'Banana Smoothie Bowl',
    ingredients: ['Bananas', 'Milk (Full Cream)'],
    missingIngredients: ['Granola', 'Honey'],
    cookTime: '5 min',
    difficulty: 'Easy',
    matchScore: 80,
    emoji: '🍌',
    description: 'Creamy blended bowl with banana and milk, perfect for breakfast.',
    steps: ['Blend bananas with milk', 'Pour into bowl', 'Top with granola and honey'],
    filter: ['Quick Meals', 'Healthy'],
  },
  {
    id: 'r4',
    name: 'Spinach & Egg Scramble',
    ingredients: ['Eggs', 'Spinach'],
    missingIngredients: ['Feta cheese', 'Olive oil'],
    cookTime: '8 min',
    difficulty: 'Easy',
    matchScore: 85,
    emoji: '🥗',
    description: 'Quick protein-packed scramble with wilted spinach.',
    steps: ['Wilt spinach in pan', 'Scramble eggs together', 'Season with salt and pepper'],
    filter: ['Quick Meals', 'Healthy', 'Zero Waste'],
  },
  {
    id: 'r5',
    name: 'Tomato Rice Soup',
    ingredients: ['Tomatoes', 'Rice (Basmati)'],
    missingIngredients: ['Vegetable broth', 'Onion', 'Garlic'],
    cookTime: '30 min',
    difficulty: 'Medium',
    matchScore: 60,
    emoji: '🍲',
    description: 'Warming soup with fresh tomatoes and rice, a cozy classic.',
    steps: ['Sauté onion and garlic', 'Add tomatoes and broth', 'Simmer with rice for 20 mins'],
    filter: ['Zero Waste', 'Healthy'],
  },
];

const INITIAL_NEARBY: DonationListing[] = [
  { id: 'd1', donorName: 'Green Market', items: 'Fresh Vegetables Bundle', distance: '0.3 km', distanceKm: 0.3, type: 'vegetables', postedAt: '2 hrs ago', available: true },
  { id: 'd2', donorName: 'City Bakery', items: 'Surplus Bread & Pastries', distance: '0.8 km', distanceKm: 0.8, type: 'bread', postedAt: '4 hrs ago', available: true },
  { id: 'd3', donorName: 'Community Pantry', items: 'Canned Food Pack', distance: '1.2 km', distanceKm: 1.2, type: 'canned', postedAt: '6 hrs ago', available: true },
];

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'expiry', message: 'Bread expires tomorrow — donate or use now', itemName: 'Bread (Wholegrain)', timestamp: Date.now() - 3600000, read: false },
  { id: 'n2', type: 'expiry', message: 'Chicken Breast expires in 1 day', itemName: 'Chicken Breast', timestamp: Date.now() - 7200000, read: false },
  { id: 'n3', type: 'nearby_food', message: 'Fresh Vegetables Bundle available 0.3km from you', timestamp: Date.now() - 10800000, read: false },
  { id: 'n4', type: 'recipe', message: 'New recipe suggestion: Tomato & Spinach Omelette', timestamp: Date.now() - 86400000, read: true },
  { id: 'n5', type: 'donation_accepted', message: 'Your donation was accepted by Green Market', timestamp: Date.now() - 172800000, read: true },
];

const INITIAL_PROFILE: UserProfile = {
  name: 'Alex Johnson',
  email: 'alex@example.com',
  role: 'Donor',
  avatar: 'AJ',
  foodSaved: 12.4,
  donationsMade: 8,
  co2Reduced: 24.8,
  mealsProvided: 32,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [pantryItems, setPantryItems] = useState<FoodItem[]>([]);
  const [userDonations, setUserDonations] = useState<UserDonation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    darkMode: false,
    notificationsEnabled: true,
    locationSharing: true,
  });
  const [profile] = useState<UserProfile>(INITIAL_PROFILE);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [pantryRaw, donationsRaw, notificationsRaw, settingsRaw] = await Promise.all([
          AsyncStorage.getItem('pantryItems'),
          AsyncStorage.getItem('userDonations'),
          AsyncStorage.getItem('notifications'),
          AsyncStorage.getItem('settings'),
        ]);
        setPantryItems(pantryRaw ? JSON.parse(pantryRaw) : INITIAL_PANTRY);
        setUserDonations(donationsRaw ? JSON.parse(donationsRaw) : []);
        setNotifications(notificationsRaw ? JSON.parse(notificationsRaw) : INITIAL_NOTIFICATIONS);
        if (settingsRaw) setSettings(JSON.parse(settingsRaw));
      } catch {
        setPantryItems(INITIAL_PANTRY);
        setNotifications(INITIAL_NOTIFICATIONS);
      }
      setIsLoaded(true);
    };
    load();
  }, []);

  useEffect(() => {
    if (isLoaded) AsyncStorage.setItem('pantryItems', JSON.stringify(pantryItems));
  }, [pantryItems, isLoaded]);

  useEffect(() => {
    if (isLoaded) AsyncStorage.setItem('userDonations', JSON.stringify(userDonations));
  }, [userDonations, isLoaded]);

  useEffect(() => {
    if (isLoaded) AsyncStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications, isLoaded]);

  useEffect(() => {
    if (isLoaded) AsyncStorage.setItem('settings', JSON.stringify(settings));
  }, [settings, isLoaded]);

  const addFoodItem = (item: Omit<FoodItem, 'id' | 'addedAt'>) => {
    const newItem: FoodItem = { ...item, id: generateId(), addedAt: Date.now() };
    setPantryItems(prev => [newItem, ...prev]);
  };

  const removeFoodItem = (id: string) => {
    setPantryItems(prev => prev.filter(item => item.id !== id));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAllNotifications = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const postDonation = (items: string[], _note?: string) => {
    const donation: UserDonation = {
      id: generateId(),
      items,
      postedAt: Date.now(),
      status: 'pending',
    };
    setUserDonations(prev => [donation, ...prev]);
  };

  const getExpiringItems = () => {
    return pantryItems.filter(item => {
      const days = getDaysRemaining(item.expiryDate);
      return days >= 0 && days <= 3;
    }).sort((a, b) => getDaysRemaining(a.expiryDate) - getDaysRemaining(b.expiryDate));
  };

  const value = useMemo(() => ({
    pantryItems,
    recipes: INITIAL_RECIPES,
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
    getExpiryStatus,
    getDaysRemaining,
    getExpiringItems,
    isLoaded,
  }), [pantryItems, userDonations, notifications, settings, profile, isLoaded]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
