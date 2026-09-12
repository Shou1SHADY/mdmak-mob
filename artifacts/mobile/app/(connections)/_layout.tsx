import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Tabs, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ModuleTabIcon, useModuleTabOptions } from "@/components/ModuleTabBar";

/**
 * Connections — the supplier's invitation inbox, reached from the CRM module.
 *
 * Supplier-only, and gated on `crm.manage` like every other CRM item in the
 * registry. It had no layout of its own, so it was the one module screen that
 * opened with no bottom bar: a back arrow was the only way out, which is the
 * exact failure ModuleTabBar exists to prevent. One tab, like Goods Received.
 */
export default function ConnectionsLayout() {
  const colors = useColors();
  const t = useT();
  const { user, loading } = useAuth();
  const { can, isLoading: permsLoading } = usePermissions();
  const tabOptions = useModuleTabOptions();

  if (loading || permsLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.cta} />
      </View>
    );
  }

  if (!user) return <Redirect href="/auth/login" />;
  if (user.role !== "Supplier") return <Redirect href="/" />;

  if (!can("crm.manage")) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 32 }]}>
        <Feather name="lock" size={32} color={colors.outline} />
        <Text style={[styles.deniedTitle, { color: colors.foreground }]}>{t.errors.noPermissionTitle}</Text>
        <Text style={[styles.deniedBody, { color: colors.mutedForeground }]}>{t.errors.noPermission}</Text>
      </View>
    );
  }

  return (
    <Tabs screenOptions={tabOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: t.modules.items.connections,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="link" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  deniedTitle: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  deniedBody: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", textAlign: "center" },
});
