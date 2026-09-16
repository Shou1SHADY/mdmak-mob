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
 * Accounting (المحاسبة) — the books, read-only.
 *
 * What a phone is good for here is the question "how are we doing", asked away
 * from the desk: the owner in a client's lobby, the manager between sites. So
 * the module carries the four screens that answer it — the dashboard, the two
 * statements, and the ledger they are built from — and nothing that writes.
 *
 * Posting a voucher, closing a period and switching the module on stay on the
 * website. Each is a decision with a paper trail behind it, and each needs
 * `accounting.post` or `accounting.close`, which this release never asks for.
 * The reader needs `accounting.view`, the same gate the website applies.
 */
export default function AccountingLayout() {
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

  if (!can("accounting.view")) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 32 }]}>
        <Feather name="lock" size={32} color={colors.outline} />
        <Text style={[styles.deniedTitle, { color: colors.foreground }]}>{t.acc.noAccess}</Text>
        <Text style={[styles.deniedBody, { color: colors.mutedForeground }]}>{t.acc.noAccessHint}</Text>
      </View>
    );
  }

  return (
    <Tabs screenOptions={tabOptions}>
      <Tabs.Screen
        name="books"
        options={{
          title: t.acc.books,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="grid" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="income"
        options={{
          title: t.acc.income,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="trending-up" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="balance"
        options={{
          title: t.acc.balance,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="bar-chart-2" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: t.acc.journal,
          tabBarIcon: ({ focused }) => <ModuleTabIcon name="book-open" focused={focused} />,
        }}
      />
      {/* Reached from the dashboard rather than the bar: five tabs on a phone
          is one too many, and these two are follow-up reads, not destinations. */}
      <Tabs.Screen name="cashflow" options={{ href: null, title: t.acc.cashflow }} />
      <Tabs.Screen name="trial-balance" options={{ href: null, title: t.acc.trial }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  deniedTitle: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  deniedBody: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", textAlign: "center" },
});
