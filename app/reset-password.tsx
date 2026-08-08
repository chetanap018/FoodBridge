import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // When the deep link opens this screen, the URL contains the tokens in the fragment.
    // Supabase detects this automatically via onAuthStateChange with event PASSWORD_RECOVERY.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY' && session) {
          setSessionReady(true);
        }
      }
    );

    // Also handle the URL manually in case the event already fired
    const handleUrl = async (url: string) => {
      const fragment = url.split('#')[1];
      if (!fragment) return;
      const params = new URLSearchParams(fragment);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token') ?? '';
      if (access_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        setSessionReady(true);
      }
    };

    // Check if app was opened via the reset link
    Linking.getInitialURL().then(url => {
      if (url) handleUrl(url);
    });

    const linkSub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'Password Updated!',
        'Your password has been reset successfully.',
        [{ text: 'Sign In', onPress: () => router.replace('/login') }]
      );
    }
  };

  // Show a loading state while waiting for the session token from the deep link
  if (!sessionReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Verifying reset link…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-open-outline" size={48} color={Colors.primary} />
        </View>

        <Text style={styles.title}>New Password</Text>
        <Text style={styles.subtitle}>Choose a strong password for your account.</Text>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textLight} />
            </Pressable>
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor={Colors.textLight}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
            />
            <Pressable onPress={() => setShowConfirm(!showConfirm)}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textLight} />
            </Pressable>
          </View>

          <Pressable
            onPress={handleReset}
            disabled={loading}
            style={({ pressed }) => [styles.resetBtn, { opacity: pressed || loading ? 0.8 : 1 }]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.resetBtnText}>Update Password</Text>}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1A0A' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  loadingContainer: { flex: 1, backgroundColor: '#0A1A0A', alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: Colors.textLight, fontFamily: 'Poppins_400Regular', fontSize: 14 },
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
