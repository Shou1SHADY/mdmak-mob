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
 * The Project Management module.
 *
 * Contractor-only, matching the website: `projects` is the contractor's core
 * work, and firestore.rules requires `isContractor()` to create one. A supplier
 * reaching this route is sent home rather than shown an empty list.
 *
 * The gate here is `projects.view`, the org-wide permission that reveals the
 * list. Anything scoped to ONE project re-checks with `useProjectPermissions`,
 * because a project seat overrides the member's default group in both
 * directions.
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
export default function ProjectsLayout() {
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
  if (user.role !== "Contractor") return <Redirect href="/" />;

  if (!can("projects.view")) {
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
        name="index"
        options={{
          title: t.modules.items.projects,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="folder" focused={focused} />,
        }}
      />
      {/* In the navigator so the bar stays put, but not destinations in it. */}
      <Tabs.Screen name="[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  deniedTitle: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  deniedBody: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", textAlign: "center" },
});
