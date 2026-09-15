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
 * Sales (المبيعات) — the phone-shaped half of the website's Sales module.
 *
 * The seller never invoices and never collects: a client's "I paid" becomes a
 * transfer notice here, and only Finance answers it — which is why the gate
 * admits `invoices.manage` alongside the two sales permissions: the Finance
 * person opens this module for the notices inbox on Payments. Writing the
 * quotation itself (the live A4 composer) stays on the web; this module
 * tracks, reports and answers.
 */
export default function SalesLayout() {
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

  if (!can("sales.manage") && !can("sales.approve") && !can("invoices.manage")) {
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
        name="quotations"
        options={{
          title: t.sales.quotations,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="file-text" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t.sales.orders,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="clipboard" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: t.sales.payments,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="credit-card" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: t.sales.requests,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="inbox" focused={focused} />,
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
