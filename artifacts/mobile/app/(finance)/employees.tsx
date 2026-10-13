import React, { useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/Button";
import { useOrgCollection } from "@/hooks/useOrgCollection";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/context/AuthContext";
import { siteUrl } from "@/lib/site-api";
import { matchesSearch } from "@/lib/search-text";
import { canReadHrPeople, empNo, employeeName, hrPeopleWebPath } from "@/lib/hr-people";

interface Employee {
  id: string;
  /** HR 1.0 — permanent number, never reused. */
  no?: number | null;
  names?: { ar?: string | null; en?: string | null } | null;
  /** Records from before HR 1.0. */
  name?: string | null;
  role?: string | null;
  status?: string | null;
  organizationId: string;
}

/**
 * The people list, read-only — who works here and under which number.
 *
 * No pay of any kind: HR 1.0 moved wages off `employees` into `employeePay`,
 * which only the pay roles may read, so a total computed here would be a
 * false zero. Adding people, their files and anything about pay is the
 * website's HR (the button opens its People tab).
 *
 * The gate is the list rule's own (`hrOffice()` — see lib/hr-people.ts). The
 * module door opens for Finance OR HR, so this screen checks for itself rather
 * than trusting the door.
 */
export default function EmployeesScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { items: employees, isLoading, error: loadError } = useOrgCollection<Employee>("employees");

  const [search, setSearch] = useState("");
  const { can, isLoading: permsLoading } = usePermissions();
  const { user } = useAuth();
  const openHr = () => void WebBrowser.openBrowserAsync(siteUrl(hrPeopleWebPath(user?.role)));

  // Someone who has left is not on the team any more.
  const current = useMemo(() => employees.filter((e) => e.status !== "left"), [employees]);

  const filtered = useMemo(() => {
    return current
      .filter((e) =>
        search.trim()
          ? matchesSearch(search, [e.names?.ar, e.names?.en, e.name, e.role, e.no != null ? String(e.no) : null])
          : true
      )
      .sort((a, b) => (a.no ?? Number.MAX_SAFE_INTEGER) - (b.no ?? Number.MAX_SAFE_INTEGER) || employeeName(a, isRTL).localeCompare(employeeName(b, isRTL)));
  }, [current, search, isRTL]);

  if (!permsLoading && !canReadHrPeople(can)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={t.hr.employees} subtitle={t.hr.title} showBack />
        <EmptyState icon="lock" title={t.errors.noPermissionTitle} subtitle={t.errors.noPermission} />
      </View>
    );
  }

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
        <FlatList keyboardShouldPersistTaps="handled"
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: tabScreenBottomPadding(insets.bottom),
          }}
          ListHeaderComponent={
            <View style={styles.header}>
              {current.length > 0 ? (
                <StatsCard title={t.hr.headcount} value={current.length} icon="users" color={colors.cta} />
              ) : null}
              <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
                {t.hr.peopleOnWebHint}
              </Text>
              <Button title={t.hr.openHrOnWeb} variant="secondary" onPress={openHr} fullWidth />
            </View>
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
                  {employeeName(item, isRTL).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={[styles.name, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={1}
                >
                  {employeeName(item, isRTL)}
                </Text>
                {item.role ? (
                  <Text
                    style={[styles.role, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                    numberOfLines={1}
                  >
                    {item.role}
                  </Text>
                ) : null}
              </View>
              {item.no != null && (
                <Text style={[styles.number, { color: colors.mutedForeground }]}>{empNo(item.no)}</Text>
              )}
            </View>
          )}
          ListEmptyComponent={loadError ? (
              <EmptyState variant="error" icon="alert-circle" title={t.errors.loadFailed} subtitle={t.errors.loadFailedHint} />
            ) : (
              <EmptyState
              icon="briefcase"
              title={t.hr.noEmployees}
              subtitle={t.hr.noEmployeesHint}
            />
            )}
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
  header: { gap: 12, marginBottom: 12 },
  hint: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
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
  number: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"] },
});
