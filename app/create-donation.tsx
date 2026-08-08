import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/colors';
import { useApp, useIsDark } from '@/context/AppContext';
import { apiRequest } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';

export default function CreateDonationScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const { profile } = useApp();
  
  const { communityId, communityName } = useLocalSearchParams<{ communityId?: string, communityName?: string }>();

  const bg = isDark ? Colors.dark.background : Colors.background;
  const cardBg = isDark ? Colors.dark.card : '#fff';
  const textPrimary = isDark ? Colors.dark.textPrimary : Colors.textPrimary;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.textSecondary;
  const border = isDark ? Colors.dark.border : Colors.border;
  const topPadding = Platform.OS === 'web' ? 67 : insets.top;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [foodCategory, setFoodCategory] = useState('Cooked Meals');
  const [foodType, setFoodType] = useState('Cooked');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('Meals');
  const [vegType, setVegType] = useState('Veg');
  const [preparation, setPreparation] = useState('Homemade');
  const [description, setDescription] = useState('');

  const [mfgDate, setMfgDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [condition, setCondition] = useState('Fresh');
  const [storageMethod, setStorageMethod] = useState('Room Temperature');
  const [packageOpened, setPackageOpened] = useState('No');

  const [allergens, setAllergens] = useState<string[]>([]);
  const [spiceLevel, setSpiceLevel] = useState('Medium');
  const [hygieneConfirmed, setHygieneConfirmed] = useState(false);

  const [images, setImages] = useState<string[]>([]); // base64

  const [pickupAddress, setPickupAddress] = useState(profile.buildingName || '');
  const [pickupWindow, setPickupWindow] = useState('Next 2 hours');
  const isPureDonor = ['Pure Donor', 'Hotel', 'Restaurant', 'Supermarket', 'Grocery Store', 'Catering Service'].includes(profile?.userCategory || '');
  const [visibility, setVisibility] = useState<'community' | 'public' | 'community_first'>(isPureDonor ? 'public' : 'community_first');
  const [specialInstructions, setSpecialInstructions] = useState('');

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(s => s + 1);
  };
  const handlePrev = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(s => s - 1);
  };

  const toggleAllergen = (a: string) => {
    if (allergens.includes(a)) setAllergens(allergens.filter(x => x !== a));
    else setAllergens([...allergens, a]);
  };

  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert('Max Images', 'You can only upload up to 5 images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      setImages([...images, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  };

  const handleSubmit = async () => {
    if (!title || !quantity) {
      Alert.alert('Missing Details', 'Please fill in the food name and quantity.');
      return;
    }
    if (!hygieneConfirmed) {
      Alert.alert('Safety First', 'Please confirm that the food has been prepared/stored hygienically.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const metadata = {
        foodType,
        vegType,
        preparation,
        description,
        mfgDate,
        expiryDate,
        condition,
        storageMethod,
        packageOpened,
        allergens,
        spiceLevel,
        pickupAddress,
        pickupWindow,
        specialInstructions
      };

      const payload = {
        userId: session.user.id,
        communityId: visibility === 'public' ? null : (communityId || null),
        title,
        foodCategory,
        quantity,
        unit,
        visibility,
        metadata,
        imagesBase64: images,
      };

      const res = await apiRequest('POST', '/api/donations/analyze-and-create', payload);
      
      if (res.ok) {
        Alert.alert('Donation Posted!', 'Your donation is now visible and has been analyzed by AI.');
        router.back();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Failed to post donation');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: bg, paddingTop: topPadding }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={() => { step === 1 ? router.back() : handlePrev() }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Step {step} of 5</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: textPrimary }]}>Food Information</Text>
            
            <Text style={[styles.label, { color: textPrimary }]}>Food Name</Text>
            <TextInput style={[styles.input, { color: textPrimary, borderColor: border, backgroundColor: cardBg }]} placeholder="E.g., Vegetable Biryani" placeholderTextColor={Colors.textLight} value={title} onChangeText={setTitle} />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: textPrimary }]}>Quantity</Text>
                <TextInput style={[styles.input, { color: textPrimary, borderColor: border, backgroundColor: cardBg }]} placeholder="E.g., 6" keyboardType="numeric" placeholderTextColor={Colors.textLight} value={quantity} onChangeText={setQuantity} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: textPrimary }]}>Unit</Text>
                <TextInput style={[styles.input, { color: textPrimary, borderColor: border, backgroundColor: cardBg }]} placeholder="Meals, kg..." placeholderTextColor={Colors.textLight} value={unit} onChangeText={setUnit} />
              </View>
            </View>

            <Text style={[styles.label, { color: textPrimary }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillScroll}>
              {['Cooked Meals', 'Fruits', 'Vegetables', 'Dairy', 'Bakery', 'Snacks', 'Other'].map(cat => (
                <Pressable key={cat} onPress={() => setFoodCategory(cat)} style={[styles.pill, { backgroundColor: foodCategory === cat ? Colors.primary : cardBg, borderColor: border }]}>
                  <Text style={{ color: foodCategory === cat ? '#fff' : textPrimary, fontFamily: 'Poppins_500Medium' }}>{cat}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: textPrimary }]}>Dietary Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillScroll}>
              {['Veg', 'Non-Veg', 'Vegan', 'Jain'].map(type => (
                <Pressable key={type} onPress={() => setVegType(type)} style={[styles.pill, { backgroundColor: vegType === type ? Colors.primary : cardBg, borderColor: border }]}>
                  <Text style={{ color: vegType === type ? '#fff' : textPrimary, fontFamily: 'Poppins_500Medium' }}>{type}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.label, { color: textPrimary }]}>Description</Text>
            <TextInput style={[styles.input, { color: textPrimary, borderColor: border, backgroundColor: cardBg, minHeight: 80 }]} multiline textAlignVertical="top" placeholder="Tell receivers more about this food..." placeholderTextColor={Colors.textLight} value={description} onChangeText={setDescription} />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: textPrimary }]}>Freshness & Storage</Text>
            
            <Text style={[styles.label, { color: textPrimary }]}>Current Condition</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {['Fresh', 'Very Good', 'Good', 'Near Expiry'].map(cond => (
                <Pressable key={cond} onPress={() => setCondition(cond)} style={[styles.pill, { backgroundColor: condition === cond ? Colors.primary : cardBg, borderColor: border }]}>
                  <Text style={{ color: condition === cond ? '#fff' : textPrimary, fontFamily: 'Poppins_500Medium' }}>{cond}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: textPrimary }]}>Storage Method</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {['Room Temperature', 'Refrigerated', 'Frozen'].map(method => (
                <Pressable key={method} onPress={() => setStorageMethod(method)} style={[styles.pill, { backgroundColor: storageMethod === method ? Colors.primary : cardBg, borderColor: border }]}>
                  <Text style={{ color: storageMethod === method ? '#fff' : textPrimary, fontFamily: 'Poppins_500Medium' }}>{method}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: textPrimary }]}>Has the package been opened?</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {['Yes', 'No'].map(ans => (
                <Pressable key={ans} onPress={() => setPackageOpened(ans)} style={[styles.pill, { backgroundColor: packageOpened === ans ? Colors.primary : cardBg, borderColor: border }]}>
                  <Text style={{ color: packageOpened === ans ? '#fff' : textPrimary, fontFamily: 'Poppins_500Medium' }}>{ans}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: textPrimary }]}>Food Safety</Text>
            
            <Text style={[styles.label, { color: textPrimary }]}>Contains Allergens?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {['Milk', 'Egg', 'Peanut', 'Soy', 'Gluten', 'Tree Nuts', 'Seafood'].map(allergen => (
                <Pressable key={allergen} onPress={() => toggleAllergen(allergen)} style={[styles.pill, { backgroundColor: allergens.includes(allergen) ? '#FF9800' : cardBg, borderColor: border }]}>
                  <Text style={{ color: allergens.includes(allergen) ? '#fff' : textPrimary, fontFamily: 'Poppins_500Medium' }}>{allergen}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: textPrimary }]}>Spice Level</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 }}>
              {['None', 'Low', 'Medium', 'High'].map(level => (
                <Pressable key={level} onPress={() => setSpiceLevel(level)} style={[styles.pill, { backgroundColor: spiceLevel === level ? Colors.primary : cardBg, borderColor: border }]}>
                  <Text style={{ color: spiceLevel === level ? '#fff' : textPrimary, fontFamily: 'Poppins_500Medium' }}>{level}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={() => setHygieneConfirmed(!hygieneConfirmed)} style={[styles.hygieneCard, { backgroundColor: hygieneConfirmed ? 'rgba(76, 175, 80, 0.1)' : cardBg, borderColor: hygieneConfirmed ? '#4CAF50' : border }]}>
              <View style={[styles.checkbox, { borderColor: hygieneConfirmed ? '#4CAF50' : Colors.textLight, backgroundColor: hygieneConfirmed ? '#4CAF50' : 'transparent' }]}>
                {hygieneConfirmed && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[styles.hygieneText, { color: textPrimary }]}>I confirm this food has been prepared and stored hygienically.</Text>
            </Pressable>
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: textPrimary }]}>Photos</Text>
            <Text style={[styles.label, { color: textSecondary, marginBottom: 20 }]}>Add up to 5 photos. Our AI will analyze them for freshness and quantity.</Text>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {images.map((img, idx) => (
                <View key={idx} style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: img }} style={styles.imagePreview} />
                  <Pressable onPress={() => setImages(images.filter((_, i) => i !== idx))} style={styles.removeImageBtn}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </Pressable>
                </View>
              ))}
              
              {images.length < 5 && (
                <Pressable onPress={pickImage} style={[styles.addImageBtn, { borderColor: border, backgroundColor: cardBg }]}>
                  <Ionicons name="camera" size={32} color={Colors.textLight} />
                  <Text style={{ color: textSecondary, fontFamily: 'Poppins_500Medium', marginTop: 8 }}>Add Photo</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {step === 5 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: textPrimary }]}>Pickup & Visibility</Text>
            
            <Text style={[styles.label, { color: textPrimary }]}>Pickup Address</Text>
            <TextInput style={[styles.input, { color: textPrimary, borderColor: border, backgroundColor: cardBg }]} value={pickupAddress} onChangeText={setPickupAddress} placeholder="Street address..." placeholderTextColor={Colors.textLight} />

            <Text style={[styles.label, { color: textPrimary }]}>Visibility</Text>
            <View style={{ gap: 10, marginBottom: 16 }}>
              {[
                { id: 'community_first', label: 'Community First → Public Later', desc: 'Prioritize community members, then broadcast globally.' },
                { id: 'community', label: 'Community Only', desc: 'Strictly hidden from non-members.' },
                { id: 'public', label: 'Public Only (Global)', desc: 'Broadcast to NGOs and anyone nearby immediately.' }
              ]
                .filter(opt => isPureDonor ? opt.id === 'public' : true)
                .map(opt => (
                <Pressable key={opt.id} onPress={() => setVisibility(opt.id as any)} style={[styles.visibilityCard, { borderColor: visibility === opt.id ? Colors.primary : border, backgroundColor: cardBg }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.visTitle, { color: textPrimary }]}>{opt.label}</Text>
                    <Text style={[styles.visDesc, { color: textSecondary }]}>{opt.desc}</Text>
                  </View>
                  <View style={[styles.radio, { borderColor: visibility === opt.id ? Colors.primary : border }]}>
                    {visibility === opt.id && <View style={[styles.radioInner, { backgroundColor: Colors.primary }]} />}
                  </View>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: textPrimary }]}>Special Instructions (Optional)</Text>
            <TextInput style={[styles.input, { color: textPrimary, borderColor: border, backgroundColor: cardBg }]} value={specialInstructions} onChangeText={setSpecialInstructions} placeholder="E.g., Bring your own container" placeholderTextColor={Colors.textLight} />
          </View>
        )}

      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20), borderTopColor: border }]}>
        {step < 5 ? (
          <Pressable style={({pressed}) => [styles.submitBtn, { opacity: pressed ? 0.7 : 1 }]} onPress={handleNext}>
            <Text style={styles.submitBtnText}>Next Step</Text>
          </Pressable>
        ) : (
          <Pressable style={({pressed}) => [styles.submitBtn, { opacity: pressed || loading ? 0.7 : 1 }]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Post Donation & Analyze</Text>}
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
  content: { padding: 20 },
  stepContainer: { gap: 16 },
  stepTitle: { fontFamily: 'Poppins_700Bold', fontSize: 24, marginBottom: 8 },
  label: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, marginBottom: -8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontFamily: 'Poppins_400Regular', fontSize: 15 },
  row: { flexDirection: 'row', gap: 16 },
  pillScroll: { gap: 10, paddingVertical: 4 },
  pill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  hygieneCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12, borderWidth: 1 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hygieneText: { flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 14, lineHeight: 20 },
  imagePreviewWrapper: { width: 100, height: 100, borderRadius: 12, overflow: 'hidden' },
  imagePreview: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  addImageBtn: { width: 100, height: 100, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  visibilityCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1 },
  visTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  visDesc: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 4 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  footer: { padding: 20, borderTopWidth: 1 },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: 16, padding: 18, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 },
});
