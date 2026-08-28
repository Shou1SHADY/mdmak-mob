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
 * The CRM module.
 *
 * One route group serves BOTH roles, exactly as the website serves the same CRM
 * pages to the contractor and supplier portals: the collections are shared and
 * every document is scoped by `organizationId`, so the only thing separating a
 * contractor's pipeline from a supplier's is which org is signed in.
 *
 * A stack, not tabs — the module is entered from the launcher and its screens
 * are a drill-down (list -> record), which is what a stack is for. The role
 * tab bar stays underneath and the user returns to it with back.
 *
 * Tabs, not a Stack. A module owns its own bottom bar listing its own screens —
 * the mobile equivalent of the module's sidebar section on the website. With a
 * Stack the bar vanished on entry, so a module's screens looked like unrelated
 * pages reachable one at a time, with a back arrow as the only way out.
 *
 * Detail screens are registered with `href: null`: they belong to this
 * navigator, so the bar stays visible while you read a record, but they are not
 * themselves destinations in it.
 */
export default function CrmLayout() {
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

  // Mirrors the website, where every CRM nav item requires `crm.manage`. The
  // Firestore rules scope the collections by organization but do not gate CRM
  // reads on this permission, so this check is the whole enforcement of "the
  // sales module is not your job" — it must run before any screen mounts.
  if (!can("crm.manage")) {
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
    <Tabs screenOptions={tabOptions}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t.modules.items.crm_dashboard,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="pie-chart" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="leads/index"
        options={{
          title: t.modules.items.crm_leads,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="user-plus" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="opportunities/index"
        options={{
          title: t.modules.items.crm_opportunities,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="target" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: t.modules.items.crm_activities,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="clipboard" focused={focused} />,
        }}
      />
      {/* In the navigator so the bar stays put, but not destinations in it. */}
      <Tabs.Screen name="leads/[id]" options={{ href: null }} />
      <Tabs.Screen name="opportunities/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  deniedTitle: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  deniedBody: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", textAlign: "center" },
});
