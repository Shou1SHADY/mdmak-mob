import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { scrollBottomPadding } from "@/lib/layout";
import { CrmChoice } from "@/components/crm/CrmChoice";
import { useProject, useProjectTenders } from "@/hooks/useProjects";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { setProjectStatus } from "@/lib/project-writes";
import { PROJECT_STATUSES, resolveProjectStatus, type ProjectStatus } from "@/lib/project-status";
import { projectStatusColor } from "@/lib/project-display";
import { formatSar, formatSarCompact } from "@/lib/crm-display";
import { RFQ_STATUSES } from "@/constants/data";

/**
 * One project.
 *
 * Read-heavy by design. The BOQ is shown but never edited: a line locks once
 * drawn into a tender (`isEditable === false`) and firestore.rules then accepts
 * only the draw bookkeeping on it, so the phone shows what was drawn and leaves
 * the transition to the website. Publishing a tender likewise stays there — it
 * writes across the RFQ, the project's rfqIds and the BOQ draws at once.
 *
 * Status IS writable, because "this job is on hold now" is exactly the kind of
 * thing that gets decided on site.
 */
export default function ProjectDetailScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { project, boqItems, isLoading } = useProject(id);
  const { tenders, isLoading: tendersLoading } = useProjectTenders(id);
  // Project-scoped: a seat on this project overrides the member's default group.
  const { can, isLoading: permsLoading } = useProjectPermissions(id);

  const [busy, setBusy] = useState(false);

  const boqSummary = useMemo(() => {
    let value = 0;
    let drawn = 0;
    let locked = 0;
    for (const item of boqItems) {
      value += (item.quantity ?? 0) * (item.unitPrice ?? 0);
      if ((item.drawnQuantity ?? 0) > 0) drawn++;
      if (item.isEditable === false) locked++;
    }
    return { value, drawn, locked, count: boqItems.length };
  }, [boqItems]);

  if (isLoading || permsLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.cta} />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={t.projects.title} showBack />
        <View style={styles.center}>
          <Feather name="alert-circle" size={28} color={colors.outline} />
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
            {t.errors.notFound}
          </Text>
        </View>
      </View>
    );
  }

  const resolved = resolveProjectStatus(project.status as string);
  const tint = projectStatusColor(resolved, colors);
  const canEdit = can("projects.edit");

  const handleStatus = async (status: ProjectStatus) => {
    if (status === resolved || busy) return;
    if (!canEdit) {
      Alert.alert(t.errors.noPermissionTitle, t.errors.noPermission);
      return;
    }
    setBusy(true);
    try {
      await setProjectStatus(project.id, status);
    } catch (e: any) {
      console.warn("[Project] status:", e?.message);
      Alert.alert(t.common.error, t.projects.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={project.name} subtitle={project.clientName ?? t.projects.title} showBack />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: scrollBottomPadding(insets.bottom, false) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Headline */}
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {project.budget != null && (
            <Text style={[styles.budget, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
              {formatSar(project.budget, isRTL)}
            </Text>
          )}
          <View style={[styles.pillRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.pill, { backgroundColor: tint + "18", borderColor: tint + "30" }]}>
              <Text style={[styles.pillText, { color: tint }]}>{t.projects.statuses[resolved]}</Text>
            </View>
            {project.location && (
              <View style={[styles.pill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.pillText, { color: colors.mutedForeground }]}>
                  {project.location}
                </Text>
              </View>
            )}
            {project.sourceOpportunityId && (
              <View style={[styles.pill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.pillText, { color: colors.mutedForeground }]}>
                  {t.projects.fromDeal}
                </Text>
              </View>
            )}
          </View>
          {project.handover?.status === "pending" && (
            <View style={[styles.notice, { backgroundColor: colors.warning + "12", flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Feather name="clock" size={14} color={colors.warning} />
              <Text style={[styles.noticeText, { color: colors.warning }]}>
                {t.projects.handoverPending}
              </Text>
            </View>
          )}
        </View>

        {/* Status */}
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <CrmChoice
            label={t.projects.changeStatus}
            options={PROJECT_STATUSES.map((s) => ({ value: s, label: t.projects.statuses[s] }))}
            value={resolved}
            onChange={handleStatus}
            scroll
          />
          {!canEdit && (
            <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
              {t.errors.noPermission}
            </Text>
          )}
        </View>

        {/* BOQ */}
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
            {t.projects.boq}
          </Text>
          {boqSummary.count === 0 ? (
            <>
              <Text style={[styles.emptyLine, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
                {t.projects.noBoq}
              </Text>
              <Text style={[styles.hint, { color: colors.outline, textAlign: isRTL ? "right" : "left" }]}>
                {t.projects.boqOnWeb}
              </Text>
            </>
          ) : (
            <>
              <View style={[styles.statRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{boqSummary.count}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                    {t.projects.boqLines}
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>
                    {formatSarCompact(boqSummary.value, isRTL)}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                    {t.projects.boqValue}
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: colors.accent }]}>{boqSummary.locked}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                    {t.projects.locked}
                  </Text>
                </View>
              </View>

              {boqItems.slice(0, 6).map((item) => {
                const label =
                  (isRTL ? item.descriptionAr : item.descriptionEn) ||
                  item.descriptionAr ||
                  item.descriptionEn ||
                  item.itemNo ||
                  "—";
                return (
                  <View
                    key={item.id}
                    style={[styles.boqRow, { flexDirection: isRTL ? "row-reverse" : "row", borderTopColor: colors.border }]}
                  >
                    <Text
                      style={[styles.boqDesc, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                    <Text style={[styles.boqQty, { color: colors.mutedForeground }]}>
                      {item.quantity ?? 0} {item.unit ?? ""}
                    </Text>
                    {item.isEditable === false && (
                      <Feather name="lock" size={12} color={colors.outline} />
                    )}
                  </View>
                );
              })}
              {boqItems.length > 6 && (
                <Text style={[styles.hint, { color: colors.outline, textAlign: isRTL ? "right" : "left" }]}>
                  +{boqItems.length - 6} · {t.projects.boqOnWeb}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Tenders */}
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
            {t.projects.tenders}
          </Text>
          {tendersLoading ? (
            <ActivityIndicator color={colors.cta} />
          ) : tenders.length === 0 ? (
            <>
              <Text style={[styles.emptyLine, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
                {t.projects.noTenders}
              </Text>
              <Text style={[styles.hint, { color: colors.outline, textAlign: isRTL ? "right" : "left" }]}>
                {t.projects.noTendersHint}
              </Text>
            </>
          ) : (
            tenders.map((tender) => {
              const statusDef = RFQ_STATUSES.find((s) => s.id === tender.status);
              return (
                <TouchableOpacity
                  key={tender.id}
                  onPress={() => router.push(`/(contractor)/rfqs/${tender.id}` as never)}
                  accessibilityRole="button"
                  style={[styles.tenderRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
                >
                  <View style={[styles.dot, { backgroundColor: statusDef?.color ?? colors.outline }]} />
                  <Text
                    style={[styles.tenderTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                    numberOfLines={1}
                  >
                    {tender.title}
                  </Text>
                  {typeof tender.offersCount === "number" && tender.offersCount > 0 && (
                    <Text style={[styles.tenderOffers, { color: colors.mutedForeground }]}>
                      {tender.offersCount}
                    </Text>
                  )}
                  <Feather
                    name={isRTL ? "chevron-left" : "chevron-right"}
                    size={16}
                    color={colors.outline}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {project.description ? (
          <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.panelTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
              {t.projects.description}
            </Text>
            <Text
              style={[styles.body, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
            >
              {project.description}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  panel: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  panelTitle: { fontSize: 15, lineHeight: 24, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  budget: { fontSize: 24, lineHeight: 39, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  pillRow: { flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, borderWidth: 1 },
  pillText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  notice: { alignItems: "center", gap: 8, borderRadius: 10, padding: 10, marginTop: 12 },
  noticeText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 6, lineHeight: 17 },
  emptyLine: { fontSize: 13, lineHeight: 21, fontFamily: "Inter_400Regular", paddingVertical: 4 },
  statRow: { gap: 10, marginBottom: 12 },
  stat: { flex: 1, gap: 2 },
  statValue: { fontSize: 16, lineHeight: 26, fontFamily: "Inter_600SemiBold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  boqRow: {
    alignItems: "center",
    gap: 10,
    minHeight: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  boqDesc: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  boqQty: { fontSize: 11, fontFamily: "Inter_500Medium" },
  tenderRow: { alignItems: "center", gap: 10, minHeight: 44 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tenderTitle: { flex: 1, fontSize: 13, lineHeight: 21, fontFamily: "Inter_500Medium" },
  tenderOffers: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  body: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 21 },
});
