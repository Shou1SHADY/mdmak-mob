import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Stack, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Finance and HR.
 *
 * Both are read-only here — a phone is where these get CHECKED, not maintained.
 * Raising an invoice, reviewing a guarantee and changing a salary all stay on
 * the website, so this module writes nothing at all.
 *
 * One route group covers both: they are two short lists sharing the same gate
 * shape, and splitting them would mean two layouts differing only in a
 * permission id. `invoices.manage` guards Finance and `employees.manage` guards
 * HR, matching the website's nav items; each screen re-checks its own.
 */
export default function FinanceLayout() {
  const colors = useColors();
  const t = useT();
  const { user, loading } = useAuth();
  const { can, isLoading: permsLoading } = usePermissions();

  if (loading || permsLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.cta} />
      </View>
    );
  }

  if (!user) return <Redirect href="/auth/login" />;

  if (!can("invoices.manage") && !can("employees.manage")) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 32 }]}>
        <Feather name="lock" size={32} color={colors.outline} />
        <Text style={[styles.deniedTitle, { color: colors.foreground }]}>
          {t.errors.noPermissionTitle}
        </Text>
        <Text style={[styles.deniedBody, { color: colors.mutedForeground }]}>
          {t.errors.noPermission}
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="invoices" />
      <Stack.Screen name="guarantees" />
      <Stack.Screen name="employees" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  deniedTitle: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  deniedBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 23 },
});
