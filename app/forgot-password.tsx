import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

// Deep link that opens the reset-password screen inside the app
const resetRedirectUrl = Linking.createURL('reset-password');

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetRedirectUrl,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        <View style={styles.iconContainer}>
          <Ionicons name="key-outline" size={48} color={Colors.primary} />
        </View>

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          {sent
            ? `A reset link has been sent to ${email}. Tap it to set a new password.`
            : "Enter your email and we'll send you a reset link."}
        </Text>

        {!sent ? (
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Pressable
              onPress={handleReset}
              disabled={loading}
              style={({ pressed }) => [styles.resetBtn, { opacity: pressed || loading ? 0.8 : 1 }]}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.resetBtnText}>Send Reset Link</Text>}
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => router.replace('/login')} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>Back to Sign In</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1A0A' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  backBtn: { position: 'absolute', top: 60, left: 24 },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  title: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 28, marginBottom: 8 },
  subtitle: { color: Colors.textLight, fontFamily: 'Poppins_400Regular', fontSize: 14, marginBottom: 32, lineHeight: 22 },
  form: { gap: 14 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontFamily: 'Poppins_400Regular', fontSize: 14 },
  resetBtn: { backgroundColor: Colors.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  resetBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 },
});