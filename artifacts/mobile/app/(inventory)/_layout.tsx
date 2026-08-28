import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Stack, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * The Inventory module.
 *
 * Serves BOTH roles, like the website: warehouses are org-scoped and a supplier
 * runs them the same way a contractor does.
 *
 * Gated on `warehouses.manage`, matching every Inventory nav item on the website
 * and the rule that guards recording waste. Releasing and confirming a request
 * are guarded by org membership rather than that permission, so the gate here is
 * slightly tighter than the rules — which is the right direction: a member with
 * no inventory job has no reason to be moving stock.
 */
export default function InventoryLayout() {
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

  if (!can("warehouses.manage")) {
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
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="waste" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  deniedTitle: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  deniedBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 23 },
});
