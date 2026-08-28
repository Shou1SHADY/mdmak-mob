import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { useCrmData } from "@/hooks/useCrmData";
import {
  OPEN_OPPORTUNITY_STAGES,
  isOpportunityOpen,
  opportunityState,
  opportunityTrack,
  type CrmOpportunity,
  type OpportunityStage,
} from "@/lib/crm";
import { labelFor } from "@/lib/labels";
import { daysUntil, formatSarCompact, stageColor } from "@/lib/crm-display";

type StageFilter = OpportunityStage | "all" | "open";

/**
 * The pipeline as a list, not a board.
 *
 * The website renders four kanban columns side by side; on a phone that becomes
 * a horizontal scroll where nothing is readable and cards are lost off-screen.
 * The same information reads better as one list filtered by stage, which is why
 * the stage chips carry live counts — they replace the columns' at-a-glance
 * shape.
 */
export default function CrmOpportunitiesScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { opportunities, isLoading } = useCrmData({ opportunities: true });

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("open");

  const counts = useMemo(() => {
    const map = new Map<StageFilter, number>();
    map.set("all", opportunities.length);
    map.set("open", opportunities.filter(isOpportunityOpen).length);
    for (const stage of OPEN_OPPORTUNITY_STAGES) {
      map.set(stage, opportunities.filter((o) => isOpportunityOpen(o) && o.stage === stage).length);
    }
    return map;
  }, [opportunities]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return opportunities
      .filter((o) => {
        if (stageFilter === "open") return isOpportunityOpen(o);
        if (stageFilter === "all") return true;
        return isOpportunityOpen(o) && o.stage === stageFilter;
      })
      .filter((o) => {
        if (!q) return true;
        return o.title?.toLowerCase().includes(q) || o.contactName?.toLowerCase().includes(q);
      })
      .sort((a, b) => (b.value || 0) - (a.value || 0));
  }, [opportunities, search, stageFilter]);

  const chips: { value: StageFilter; label: string }[] = [
    { value: "open", label: t.crm.openDeals },
    ...OPEN_OPPORTUNITY_STAGES.map((s) => ({ value: s as StageFilter, label: t.crm.stages[s] })),
    { value: "all", label: t.common.all },
  ];

  const renderDeal = ({ item }: { item: CrmOpportunity }) => {
    const tint = stageColor(item.stage, colors);
    const state = opportunityState(item);
    const days = daysUntil(item.expectedCloseDate);
    const overdue = state === "open" && days !== null && days < 0;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/(crm)/opportunities/${item.id}` as never)}
        activeOpacity={0.8}
        accessibilityRole="button"
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            flexDirection: isRTL ? "row-reverse" : "row",
          },
        ]}
      >
        <View style={[styles.stageBar, { backgroundColor: tint }]} />
        <View style={styles.cardBody}>
          <View style={[styles.cardTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text
              style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text style={[styles.value, { color: colors.foreground }]}>
              {formatSarCompact(item.value, isRTL)}
            </Text>
          </View>

          <Text
            style={[styles.contact, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
            numberOfLines={1}
          >
            {item.contactName || "—"}
          </Text>

          <View style={[styles.cardMeta, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.stagePill, { backgroundColor: tint + "18", borderColor: tint + "30" }]}>
              <Text style={[styles.stageText, { color: tint }]}>{labelFor(t.crm.stages, item.stage)}</Text>
            </View>
            <View style={[styles.trackPill, { backgroundColor: colors.muted }]}>
              <Text style={[styles.trackText, { color: colors.mutedForeground }]}>
                {t.crm.tracks[opportunityTrack(item)]}
              </Text>
            </View>
            {item.expectedCloseDate && (
              <Text
                style={[
                  styles.date,
                  { color: overdue ? colors.destructive : colors.outline },
                ]}
              >
                {overdue ? t.crm.overdue : item.expectedCloseDate}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.crm.opportunities} subtitle={t.crm.title} showBack />

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
            placeholder={t.crm.searchOpportunities}
            placeholderTextColor={colors.outline}
            style={[styles.searchInput, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
          />
        </View>
        <ScrollView
          horizontal
          // Hug the content: a horizontal scroller left to flex would stretch
          // to the parent's height and stretch its chips with it.
          style={{ flexGrow: 0, flexShrink: 0 }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
        >
          {chips.map((chip) => {
            const active = stageFilter === chip.value;
            const count = counts.get(chip.value) ?? 0;
            return (
              <TouchableOpacity
                key={chip.value}
                onPress={() => setStageFilter(chip.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.cta : colors.card,
                    borderColor: active ? colors.cta : colors.border,
                    flexDirection: isRTL ? "row-reverse" : "row",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? colors.ctaForeground : colors.mutedForeground },
                  ]}
                >
                  {chip.label}
                </Text>
                <Text
                  style={[
                    styles.filterCount,
                    { color: active ? colors.ctaForeground : colors.outline },
                  ]}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
          renderItem={renderDeal}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: tabScreenBottomPadding(insets.bottom),
          }}
          ListEmptyComponent={
            <EmptyState
              icon="target"
              title={t.crm.noOpportunities}
              subtitle={t.crm.noOpportunitiesHint}
              actionLabel={t.crm.leads}
              onAction={() => router.push("/(crm)/leads")}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  searchBox: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  chipRow: { alignItems: "center", gap: 8, paddingBottom: 8, paddingHorizontal: 4 },
  filterChip: {
    alignItems: "center",
    gap: 8,
    // 44px minimum touch target, per the project accessibility rule.
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  filterCount: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
    flexDirection: "row",
  },
  stageBar: { width: 4 },
  cardBody: { flex: 1, padding: 16, gap: 8 },
  cardTop: { alignItems: "flex-start", gap: 8 },
  title: { flex: 1, fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
  value: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  contact: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  cardMeta: { alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 },
  stagePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  stageText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  trackPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  trackText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  date: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
});
