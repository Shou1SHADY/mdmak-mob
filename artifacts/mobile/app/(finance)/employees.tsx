import React, { useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { StatsCard } from "@/components/StatsCard";
import { useOrgCollection } from "@/hooks/useOrgCollection";
import { formatSarCompact } from "@/lib/crm-display";

interface Employee {
  id: string;
  name: string;
  role?: string;
  salary?: number;
  organizationId: string;
}

/**
 * The team roster, read-only.
 *
 * Salaries are shown because the module is gated on `employees.manage` — the
 * same permission that reveals the website's HR pages, where the figure is
 * already visible. Anyone who can open this screen can already see it there.
 */
export default function EmployeesScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { items: employees, isLoading } = useOrgCollection<Employee>("employees");

  const [search, setSearch] = useState("");

  const payroll = useMemo(
    () => employees.reduce((sum, e) => sum + (e.salary ?? 0), 0),
    [employees]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees
      .filter((e) =>
        q ? e.name?.toLowerCase().includes(q) || e.role?.toLowerCase().includes(q) : true
      )
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [employees, search]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.hr.employees} subtitle={t.hr.title} showBack />

      <View style={styles.controls}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <Feather name="search" size={16} color={colors.outline} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.hr.searchEmployees}
            placeholderTextColor={colors.outline}
            style={[styles.searchInput, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: tabScreenBottomPadding(insets.bottom),
          }}
          ListHeaderComponent={
            employees.length > 0 ? (
              <View style={[styles.statRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={{ flex: 1 }}>
                  <StatsCard
                    title={t.hr.headcount}
                    value={employees.length}
                    icon="users"
                    color={colors.cta}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <StatsCard
                    title={t.hr.payroll}
                    value={formatSarCompact(payroll, isRTL)}
                    icon="credit-card"
                    color={colors.success}
                  />
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.row,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.cta + "1A" }]}>
                <Text style={[styles.avatarText, { color: colors.cta }]}>
                  {(item.name || "?").trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={[styles.name, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  style={[styles.role, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={1}
                >
                  {item.role || "—"}
                </Text>
              </View>
              {item.salary != null && (
                <Text style={[styles.salary, { color: colors.foreground }]}>
                  {formatSarCompact(item.salary, isRTL)}
                </Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="briefcase"
              title={t.hr.noEmployees}
              subtitle={t.hr.noEmployeesHint}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBox: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  statRow: { gap: 12, marginBottom: 12 },
  row: {
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    minHeight: 56,
  },
  avatar: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
  name: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  role: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  salary: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
});
