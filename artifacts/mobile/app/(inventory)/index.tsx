import React, { useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { scrollBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { useWarehouses, useWarehouseRequests, type Warehouse } from "@/hooks/useInventory";

export default function WarehousesScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { warehouses, central, isLoading } = useWarehouses();
  const { requests } = useWarehouseRequests(central?.id);

  // The badge counts only what somebody still has to act on — a released
  // request is waiting on a receiver, a pending one on a releaser.
  const openRequests = useMemo(
    () => requests.filter((r) => r.status === "pending" || r.status === "released").length,
    [requests]
  );

  const sorted = useMemo(
    () =>
      [...warehouses].sort((a, b) => {
        if (!!a.isCentral !== !!b.isCentral) return a.isCentral ? -1 : 1;
        return (a.name || "").localeCompare(b.name || "");
      }),
    [warehouses]
  );

  const renderWarehouse = ({ item }: { item: Warehouse }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(inventory)/${item.id}` as never)}
      activeOpacity={0.8}
      accessibilityRole="button"
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: (item.isCentral ? colors.accent : colors.cta) + "1A" },
        ]}
      >
        <Feather
          name={item.isCentral ? "home" : "box"}
          size={18}
          color={item.isCentral ? colors.accent : colors.cta}
        />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={[styles.name, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <Text
          style={[styles.meta, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
          numberOfLines={1}
        >
          {item.location || "—"}
        </Text>
        <View style={[styles.pillRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {item.isCentral && (
            <View style={[styles.pill, { backgroundColor: colors.accent + "18" }]}>
              <Text style={[styles.pillText, { color: colors.accent }]}>{t.inventory.central}</Text>
            </View>
          )}
          {item.projectId && (
            <View style={[styles.pill, { backgroundColor: colors.muted }]}>
              <Text style={[styles.pillText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.projectName || t.inventory.linkedProject}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={colors.outline} />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.inventory.warehouses} subtitle={t.inventory.title} showBack />

      {isLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={renderWarehouse}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: scrollBottomPadding(insets.bottom, false),
          }}
          ListHeaderComponent={
            <TouchableOpacity
              onPress={() => router.push("/(inventory)/requests")}
              accessibilityRole="button"
              style={[
                styles.requestsLink,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: colors.warning + "1A" }]}>
                <Feather name="clipboard" size={18} color={colors.warning} />
              </View>
              <Text style={[styles.name, { flex: 1, color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
                {t.inventory.requests}
              </Text>
              {openRequests > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.warning }]}>
                  <Text style={[styles.badgeText, { color: colors.warningForeground }]}>
                    {openRequests}
                  </Text>
                </View>
              )}
              <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={colors.outline} />
            </TouchableOpacity>
          }
          ListEmptyComponent={
            <EmptyState
              icon="box"
              title={t.inventory.noWarehouses}
              subtitle={t.inventory.noWarehousesHint}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  requestsLink: {
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    minHeight: 56,
  },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  pillRow: { gap: 8, flexWrap: "wrap" },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  badge: { minWidth: 22, height: 22, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  badgeText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
});
