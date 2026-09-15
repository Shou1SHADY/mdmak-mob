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
 * Manufacturing (التصنيع) — the field half of the marble line.
 *
 * A phone is where the shop floor already is: a lead records what their station
 * finished, Quality decides on what was rejected, and a stop is reported while
 * the machine is still cold. Those acts live here. Everything that is a desk
 * job — product cards, the station registry, cost statements, settings — stays
 * on the website, and the launcher still links to it.
 *
 * Any of the five manufacturing roles opens the module; what a person can
 * actually do inside is decided by the engine's `ownsCandidate`, the same
 * function the website asks, and finally by the rules, which scope each role to
 * the fields it may write.
 */
export default function ManufacturingLayout() {
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

  const anyRole =
    can("manufacturing.manage") ||
    can("manufacturing.work") ||
    can("manufacturing.qc") ||
    can("manufacturing.cost") ||
    can("manufacturing.view");

  if (!anyRole) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 32 }]}>
        <Feather name="lock" size={32} color={colors.outline} />
        <Text style={[styles.deniedTitle, { color: colors.foreground }]}>{t.mfg.noRole}</Text>
        <Text style={[styles.deniedBody, { color: colors.mutedForeground }]}>{t.mfg.noRoleHint}</Text>
      </View>
    );
  }

  return (
    <Tabs screenOptions={tabOptions}>
      <Tabs.Screen
        name="today"
        options={{
          title: t.mfg.today,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="check-square" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="floor"
        options={{
          title: t.mfg.floor,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="tool" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t.mfg.orders,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="layers" focused={focused} />,
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
