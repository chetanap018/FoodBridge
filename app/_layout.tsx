import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient, apiRequest } from "@/lib/query-client";
import { AppProvider } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

SplashScreen.preventAutoHideAsync();

async function syncUserToDb(session: Session) {
  try {
    const { id, email, user_metadata } = session.user;
    await apiRequest("POST", "/api/auth/sync", {
      id,
      email: email ?? "",
      name: user_metadata?.full_name ?? user_metadata?.name ?? null,
    });
  } catch (err) {
    console.warn("User DB sync failed:", err);
  }
}

function RootLayoutNav({ session, isRecovering }: { session: Session | null, isRecovering: boolean }) {
  useEffect(() => {
    if (isRecovering) return; // Stay on reset-password screen

    if (session) {
      router.replace("/(tabs)");
    } else {
      router.replace("/login");
    }
  }, [session, isRecovering]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
      <Stack.Screen
        name="scanner"
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />
      <Stack.Screen
        name="receipt-scanner"
        options={{ headerShown: false, presentation: "fullScreenModal" }}
      />
      <Stack.Screen
        name="add-food"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="notifications"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="help-support"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="about"
        options={{ headerShown: false, presentation: "modal" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const lastSyncedUserId = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
      if (session && session.user.id !== lastSyncedUserId.current) {
        lastSyncedUserId.current = session.user.id;
        syncUserToDb(session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setSession(session);
          setIsRecovering(true);
          // Force navigate to reset-password screen
          setTimeout(() => router.replace('/reset-password'), 0);
          return;
        }

        if (event === 'SIGNED_OUT') {
          setIsRecovering(false);
        }

        setSession(session);
        if (session && session.user.id !== lastSyncedUserId.current) {
          lastSyncedUserId.current = session.user.id;
          syncUserToDb(session);
        }
        if (!session) {
          lastSyncedUserId.current = null;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && authChecked) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, authChecked]);

  if ((!fontsLoaded && !fontError) || !authChecked) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <RootLayoutNav session={session} isRecovering={isRecovering} />
          </GestureHandlerRootView>
        </AppProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}