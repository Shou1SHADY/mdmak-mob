import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts as useInterFont,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ToastProvider } from "@/context/ToastContext";
import { ThemeProvider } from "@/context/ThemeContext";
// Push registration intentionally disabled for now — re-enable after `eas init`
// and push credentials are configured (see DEPLOYMENT.md).
// import { usePushToken } from "@/hooks/usePushToken";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  // usePushToken();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/register" />
      <Stack.Screen name="(contractor)" />
      <Stack.Screen name="(supplier)" />
      {/* Modules live outside the role tab groups: the CRM is one route group
          serving both roles, and the launcher is reachable from either. */}
      <Stack.Screen name="(crm)" />
      <Stack.Screen name="(projects)" />
      <Stack.Screen name="(inventory)" />
      <Stack.Screen name="(finance)" />
      <Stack.Screen name="(goods)" />
      <Stack.Screen name="(connections)" />
      <Stack.Screen name="apps" />
      <Stack.Screen name="chat/[chatId]" />
    </Stack>
  );
}

export default function RootLayout() {
  const [interLoaded] = useInterFont({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [hankenLoaded] = useFonts({
    HankenGrotesk_400Regular: require("@/assets/fonts/HankenGrotesk_400Regular.ttf"),
    HankenGrotesk_500Medium: require("@/assets/fonts/HankenGrotesk_500Medium.ttf"),
    HankenGrotesk_600SemiBold: require("@/assets/fonts/HankenGrotesk_600SemiBold.ttf"),
    HankenGrotesk_700Bold: require("@/assets/fonts/HankenGrotesk_700Bold.ttf"),
  });

  useEffect(() => {
    if (interLoaded && hankenLoaded) {
      SplashScreen.hideAsync();
    }
  }, [interLoaded, hankenLoaded]);

  if (!interLoaded || !hankenLoaded) return null;

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <ToastProvider>
                    <AuthProvider>
                      <RootLayoutNav />
                    </AuthProvider>
                  </ToastProvider>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
