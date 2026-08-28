import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { StatsCard } from "@/components/StatsCard";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { useCrmData } from "@/hooks/useCrmData";
import {
  OPEN_LEAD_STATUSES,
  OPEN_OPPORTUNITY_STAGES,
  isOpportunityOpen,
  summarizeOpportunities,
  type CrmActivity,
} from "@/lib/crm";
import { formatSarCompact, stageColor } from "@/lib/crm-display";

/**
 * The CRM overview.
 *
 * Every figure comes from `summarizeOpportunities` in the mirrored lib/crm.ts —
 * the same function the website's dashboard calls — so the pipeline total on a
 * phone can never disagree with the one on the desktop. Nothing is recomputed
 * locally.
 */
export default function CrmDashboardScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { contacts, opportunities, activities, isLoading } = useCrmData({
    opportunities: true,
    activities: true,
  });

  const summary = useMemo(() => summarizeOpportunities(opportunities), [opportunities]);

  const openLeads = useMemo(
    () => contacts.filter((c) => OPEN_LEAD_STATUSES.includes(c.status ?? "new")).length,
    [contacts]
  );

  // "Needs attention" is the only thing on this screen that is not a headline
  // number: an overdue task is the one CRM item worth opening the phone for.
  const { overdue, dueToday } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    let overdueList: CrmActivity[] = [];
    let dueTodayCount = 0;
    for (const a of activities) {
      if (a.done || !a.dueDate) continue;
      const due = new Date(a.dueDate).getTime();
      if (Number.isNaN(due)) continue;
      if (due < todayMs) overdueList.push(a);
      else if (due < todayMs + 86_400_000) dueTodayCount++;
    }
    overdueList.sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1));
    return { overdue: overdueList, dueToday: dueTodayCount };
  }, [activities]);

  // Stage counts for the pipeline bar — open stages only, matching the
  // website's board, which shows won/lost as a summary rather than columns.
  const stageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const opp of opportunities) {
      if (!isOpportunityOpen(opp)) continue;
      counts.set(opp.stage, (counts.get(opp.stage) ?? 0) + 1);
    }
    return counts;
  }, [opportunities]);

  const maxStage = Math.max(1, ...OPEN_OPPORTUNITY_STAGES.map((s) => stageCounts.get(s) ?? 0));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.crm.title} subtitle={t.crm.dashboard} showBack />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <View style={[styles.grid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={styles.gridCell}>
                <StatsCard
                  title={t.crm.openDeals}
                  value={summary.open}
                  icon="target"
                  color={colors.cta}
                />
              </View>
              <View style={styles.gridCell}>
                <StatsCard
                  title={t.crm.pipelineValue}
                  value={formatSarCompact(summary.openValue, isRTL)}
                  icon="trending-up"
                  color={colors.accent}
                />
              </View>
            </View>
            <View style={[styles.grid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={styles.gridCell}>
                <StatsCard
                  title={t.crm.weightedValue}
                  value={formatSarCompact(summary.weightedValue, isRTL)}
                  icon="percent"
                  color={colors.warning}
                />
              </View>
              <View style={styles.gridCell}>
                <StatsCard
                  title={t.crm.totalLeads}
                  value={openLeads}
                  icon="user-plus"
                  color={colors.success}
                />
              </View>
            </View>

            {/* Pipeline by stage */}
            <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text
                style={[
                  styles.panelTitle,
                  { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
                ]}
              >
                {t.crm.opportunities}
              </Text>
              {OPEN_OPPORTUNITY_STAGES.map((stage) => {
                const count = stageCounts.get(stage) ?? 0;
                const tint = stageColor(stage, colors);
                return (
                  <View
                    key={stage}
                    style={[styles.stageRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
                  >
                    <Text
                      style={[styles.stageName, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                      numberOfLines={1}
                    >
                      {t.crm.stages[stage]}
                    </Text>
                    <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            backgroundColor: tint,
                            width: `${(count / maxStage) * 100}%`,
                            alignSelf: isRTL ? "flex-end" : "flex-start",
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.stageCount, { color: colors.foreground }]}>{count}</Text>
                  </View>
                );
              })}
              <TouchableOpacity
                onPress={() => router.push("/(crm)/opportunities")}
                style={[styles.panelLink, { flexDirection: isRTL ? "row-reverse" : "row" }]}
                accessibilityRole="button"
              >
                <Text style={[styles.panelLinkText, { color: colors.cta }]}>{t.crm.opportunities}</Text>
                <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={colors.cta} />
              </TouchableOpacity>
            </View>

            {/* Needs attention */}
            <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.panelHead, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Text style={[styles.panelTitle, { color: colors.foreground }]}>
                  {t.crm.activities}
                </Text>
                <View style={[styles.pillRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  {overdue.length > 0 && (
                    <View style={[styles.pill, { backgroundColor: colors.destructive + "1A" }]}>
                      <Text style={[styles.pillText, { color: colors.destructive }]}>
                        {overdue.length} {t.crm.overdueTasks}
                      </Text>
                    </View>
                  )}
                  {dueToday > 0 && (
                    <View style={[styles.pill, { backgroundColor: colors.warning + "1A" }]}>
                      <Text style={[styles.pillText, { color: colors.warning }]}>
                        {dueToday} {t.crm.dueToday}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {overdue.slice(0, 3).map((a) => (
                <View
                  key={a.id}
                  style={[styles.taskRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
                >
                  <Feather name="alert-circle" size={15} color={colors.destructive} />
                  <Text
                    style={[styles.taskText, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                    numberOfLines={1}
                  >
                    {a.title}
                  </Text>
                </View>
              ))}
              {overdue.length === 0 && dueToday === 0 && (
                <Text
                  style={[styles.emptyLine, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                >
                  {t.crm.noActivities}
                </Text>
              )}

              <TouchableOpacity
                onPress={() => router.push("/(crm)/activities")}
                style={[styles.panelLink, { flexDirection: isRTL ? "row-reverse" : "row" }]}
                accessibilityRole="button"
              >
                <Text style={[styles.panelLinkText, { color: colors.cta }]}>{t.crm.activities}</Text>
                <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={colors.cta} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(crm)/leads")}
              style={[
                styles.bigLink,
                { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" },
              ]}
              accessibilityRole="button"
            >
              <Feather name="user-plus" size={18} color={colors.cta} />
              <Text style={[styles.bigLinkText, { color: colors.foreground }]}>{t.crm.leads}</Text>
              <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={colors.outline} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12, marginBottom: 12 },
  gridCell: { flex: 1 },
  panel: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  panelHead: { alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 },
  panelTitle: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  stageRow: { alignItems: "center", gap: 8, marginBottom: 8 },
  stageName: { width: 82, fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4, minWidth: 2 },
  stageCount: { width: 24, fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  panelLink: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    marginTop: 4,
  },
  panelLinkText: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  pillRow: { gap: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  taskRow: { alignItems: "center", gap: 8, minHeight: 32 },
  taskText: { flex: 1, fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular" },
  emptyLine: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", paddingVertical: 8 },
  bigLink: {
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  bigLinkText: { flex: 1, fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
});
