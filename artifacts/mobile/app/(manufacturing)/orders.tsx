import React, { useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, StyleSheet, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { type Tone } from "@/lib/design";
import { labelFor } from "@/lib/labels";
import { formatSarCompact } from "@/lib/crm-display";
import { useMfgWorld } from "@/hooks/useMfgWorld";
import { WORKSHOP_FILTERS, compareOrders, filterCounts, inFilter, matchesSearch, type WorkshopFilter } from "@/lib/manufacturing-view";

/**
 * The workshop list — every live order, filtered the way the website filters
 * it, so "in production" means the same thing on both screens.
 *
 * Money is shown only to the personas the engine says may see it; a station
 * lead reads quantities and dates, never cost.
 */
export default function MfgOrdersScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const state = useMfgWorld();

  const [filter, setFilter] = useState<WorkshopFilter>("all");
  const [search, setSearch] = useState("");

  const counts = useMemo(() => filterCounts(state.world.views), [state.world.views]);
  const visible = useMemo(
    () =>
      state.world.views
        .filter((v) => inFilter(v, filter) && matchesSearch(v, search))
        .sort(compareOrders),
    [state.world.views, filter, search]
  );

  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.mfg.orders} subtitle={t.mfg.title} showBack />

      <View style={styles.controls}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.card, borderColor: colors.border, flexDirection: row },
          ]}
        >
          <Feather name="search" size={16} color={colors.outline} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.mfg.ordersSearch}
            placeholderTextColor={colors.outline}
            style={[styles.searchInput, { color: colors.foreground, textAlign: align }]}
          />
        </View>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filters, { flexDirection: row }]}
      >
        {WORKSHOP_FILTERS.map((f) => (
          <Pressable accessibilityRole="button"
            key={f}
            onPress={() => setFilter(f)}
            style={[
              styles.filter,
              {
                backgroundColor: filter === f ? colors.cta : colors.card,
                borderColor: filter === f ? colors.cta : colors.border,
              },
            ]}
          >
            <Text style={[styles.filterText, { color: filter === f ? colors.ctaForeground : colors.mutedForeground }]}>
              {f === "all" ? t.common.all : labelFor(t.mfg.stages, f)} {counts[f]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {state.isLoading ? (
        <View style={{ paddingHorizontal: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <FlatList keyboardShouldPersistTaps="handled"
          data={visible}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
          renderItem={({ item: v }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.cardTop, { flexDirection: row }]}>
                <Text style={[styles.ref, { color: colors.foreground, textAlign: align }]} numberOfLines={1}>
                  {v.ref} · {v.product.name}
                </Text>
                <StatusBadge label={labelFor(t.mfg.stages, v.stage)} tone={stageTone(v.stage)} size="sm" />
              </View>
              <Text style={[styles.meta, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={1}>
                {v.quantity} {v.unit} · {v.sourceName}
              </Text>
              <View style={[styles.metaRow, { flexDirection: row }]}>
                {v.rush && <StatusBadge label={t.mfg.rush} tone="warning" size="sm" />}
                {v.late && (
                  <StatusBadge label={t.mfg.late.replace("{days}", String(v.lateDays))} tone="destructive" size="sm" />
                )}
                {v.neededBy && (
                  <Text style={[styles.due, { color: colors.outline }]}>
                    {t.mfg.dueOn.replace("{date}", v.neededBy)}
                  </Text>
                )}
                {state.seesMoney && v.cost.total > 0 && (
                  <Text style={[styles.cost, { color: colors.foreground }]}>
                    {formatSarCompact(v.cost.total, isRTL)}
                  </Text>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={<EmptyState icon="layers" title={t.mfg.noOrders} subtitle={t.mfg.noOrdersHint} />}
        />
      )}
    </View>
  );
}

function stageTone(stage: string): Tone {
  if (stage === "done" || stage === "ready") return "success";
  if (stage === "cancel") return "destructive";
  if (stage === "pay" || stage === "wait") return "warning";
  return "cta";
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBox: { alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 44 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 10 },
  filters: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  filter: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, minHeight: 40, justifyContent: "center" },
  filterText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 6 },
  cardTop: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  ref: { flex: 1, fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  metaRow: { alignItems: "center", gap: 8, flexWrap: "wrap" },
  due: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cost: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold", marginStart: "auto" },
});
