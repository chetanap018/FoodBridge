import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';

WebBrowser.maybeCompleteAuthSession();

// Build the OAuth redirect URI using expo-linking (replaces deprecated expo-auth-session)
const redirectTo = Linking.createURL('auth/callback');

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        Alert.alert('Login Failed', error.message);
      }
      // No manual router.replace needed — _layout.tsx onAuthStateChange handles navigation
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });

      if (error) {
        Alert.alert('Google Login Failed', error.message);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

        if (result.type === 'success' && result.url) {
          // Robustly parse the fragment (after the #) from the callback URL
          const fragment = result.url.includes('#') ? result.url.split('#')[1] : '';
          const params = new URLSearchParams(fragment);

          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token') ?? '';

          if (access_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) Alert.alert('Google Login Failed', sessionError.message);
          } else {
            Alert.alert('Google Login Failed', 'No access token received. Please try again.');
          }
        }
      }
    } catch (err: any) {
      Alert.alert('Google Login Failed', err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.logoContainer}>
          <Ionicons name="leaf" size={48} color={Colors.primary} />
          <Text style={styles.appName}>FoodBridge</Text>
          <Text style={styles.tagline}>Reduce waste. Share food. Save money.</Text>
        </View>

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

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={Colors.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={Colors.textLight}
              />
            </Pressable>
          </View>

          <Pressable onPress={() => router.push('/forgot-password')} style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          <Pressable
            onPress={handleLogin}
            disabled={loading || googleLoading}
            style={({ pressed }) => [styles.loginBtn, { opacity: pressed || loading ? 0.8 : 1 }]}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Sign In</Text>}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            onPress={handleGoogleLogin}
            disabled={loading || googleLoading}
            style={({ pressed }) => [styles.googleBtn, { opacity: pressed || googleLoading ? 0.8 : 1 }]}
          >
            {googleLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#fff" />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <Pressable onPress={() => router.push('/signup')}>
            <Text style={styles.signupLink}>Sign Up</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1A0A' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  appName: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 32, marginTop: 8 },
  tagline: { color: Colors.textLight, fontFamily: 'Poppins_400Regular', fontSize: 13, textAlign: 'center', marginTop: 4 },
  form: { gap: 14 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 14, height: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', fontFamily: 'Poppins_400Regular', fontSize: 14 },
  forgotBtn: { alignSelf: 'flex-end' },
  forgotText: { color: Colors.primaryLight, fontFamily: 'Poppins_400Regular', fontSize: 13 },
  loginBtn: { backgroundColor: Colors.primary, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center' },
  loginBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: Colors.textLight, fontFamily: 'Poppins_400Regular', fontSize: 13 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#4285F4', borderRadius: 14, height: 52 },
  googleBtnText: { color: '#fff', fontFamily: 'Poppins_700Bold', fontSize: 15 },
  signupRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signupText: { color: Colors.textLight, fontFamily: 'Poppins_400Regular', fontSize: 14 },
  signupLink: { color: Colors.primaryLight, fontFamily: 'Poppins_700Bold', fontSize: 14 },
});