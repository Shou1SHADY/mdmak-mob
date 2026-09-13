import React, { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/context/ToastContext";
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
import { useAuth } from "@/context/AuthContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { Input } from "@/components/ui/Input";
import { DateField } from "@/components/ui/DateField";
import { Button } from "@/components/ui/Button";
import { CrmSheet } from "@/components/crm/CrmSheet";
import { CrmChoice } from "@/components/crm/CrmChoice";
import { useCrmData } from "@/hooks/useCrmData";
import { advanceOpportunityStage, logActivity, updateOpportunity } from "@/lib/crm-writes";
import {
  ACTIVITY_TYPES,
  OPEN_OPPORTUNITY_STAGES,
  gatesRemaining,
  nextStage,
  opportunityState,
  opportunityTrack,
  stageHistory,
  stageMoveBlock,
  type ActivityType,
  type OpportunityStage,
  type CrmOrgProfile,
  type GateContext,
} from "@/lib/crm";
import { labelFor } from "@/lib/labels";
import { activityIcon, formatSar, stageColor } from "@/lib/crm-display";

/**
 * One deal.
 *
 * Advancing is the whole point of this screen on a phone. It goes through
 * `stageMoveBlock` from the mirrored lib/crm.ts, so the gate rules that stop a
 * move on the website stop it here too, for the same reason and with the same
 * wording — a deal cannot be nudged forward on a phone past a checklist the
 * desktop would have enforced.
 *
 * Winning, losing and handing over are deliberately absent. They need a reason,
 * a final value and the `crm.close` permission that firestore.rules checks, and
 * `advanceOpportunityStage` cannot reach a terminal stage by construction.
 */
export default function CrmOpportunityDetailScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { opportunities, activities, orgId, isLoading } = useCrmData({
    opportunities: true,
    activities: true,
  });

  const opp = useMemo(() => opportunities.find((o) => o.id === id), [opportunities, id]);
  const linked = useMemo(
    () => activities.filter((a) => a.opportunityId === id).slice(0, 6),
    [activities, id]
  );

  const { can } = usePermissions();
  const { showToast } = useToast();
  const canManage = can("crm.manage");
  const [busy, setBusy] = useState(false);

  // The org's CRM profile is what the `fit` gate reads. Without it lib/crm.ts
  // treats the gate as passed, so this screen would let a deal past a gate the
  // website blocks; load it once so both apps judge the same way.
  const [profile, setProfile] = useState<CrmOrgProfile | null | undefined>(undefined);
  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    getDoc(doc(db, "crmOrgProfile", orgId))
      .then((snap) => { if (!cancelled) setProfile(snap.exists() ? ({ id: snap.id, ...snap.data() } as CrmOrgProfile) : null); })
      .catch(() => { if (!cancelled) setProfile(null); });
    return () => { cancelled = true; };
  }, [orgId]);
  const gateCtx: GateContext = { profile: profile ?? null };

  const [editSheet, setEditSheet] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editClose, setEditClose] = useState("");
  const [editProbability, setEditProbability] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [activitySheet, setActivitySheet] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>("call");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDue, setActivityDue] = useState("");

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.cta} />
      </View>
    );
  }

  if (!opp) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={t.crm.opportunities} showBack />
        <View style={styles.center}>
          <Feather name="alert-circle" size={28} color={colors.outline} />
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
            {t.errors.notFound}
          </Text>
        </View>
      </View>
    );
  }

  const tint = stageColor(opp.stage, colors);
  const state = opportunityState(opp);
  const target = nextStage(opp);
  const remaining = gatesRemaining(opp, gateCtx);
  const block = target ? stageMoveBlock(opp, target, gateCtx) : "closed";

  const openEdit = () => {
    setEditTitle(opp.title ?? "");
    setEditValue(opp.value ? String(opp.value) : "");
    setEditClose(opp.expectedCloseDate ?? "");
    setEditProbability(opp.probability != null ? String(opp.probability) : "");
    setEditNotes(opp.notes ?? "");
    setEditSheet(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) { Alert.alert(t.common.error, t.crm.titleRequired); return; }
    const value = parseFloat(editValue.replace(/,/g, ""));
    const probability = editProbability.trim() ? Math.min(100, Math.max(0, parseFloat(editProbability) || 0)) : null;
    setBusy(true);
    try {
      await updateOpportunity(opp.id, {
        title: editTitle,
        value: Number.isFinite(value) ? Math.max(0, value) : 0,
        expectedCloseDate: editClose || null,
        probability,
        notes: editNotes || null,
      });
      showToast(t.crm.saved, "success");
      setEditSheet(false);
    } catch {
      Alert.alert(t.common.error, t.crm.saveFailed);
    } finally {
      setBusy(false);
    }
  };
  const history = stageHistory(opp);

  // Stage events reuse the stage labels; the handover events have no phone-side
  // label of their own, so they render readably rather than as raw ids.
  const historyLabel = (event: string): string => {
    const stages = t.crm.stages as Record<string, string>;
    return stages[event] ?? event.replace(/_/g, " ");
  };

  const blockMessage = (): string => {
    switch (block) {
      case "gates":
        return t.crm.blockedGates;
      case "skip":
        return t.crm.blockedSkip;
      case "closed":
        return t.crm.blockedClosed;
      case "terminal":
        return t.crm.blockedTerminal;
      default:
        return t.crm.cannotAdvance;
    }
  };

  const handleAdvance = async () => {
    if (!canManage) { Alert.alert(t.errors.noPermissionTitle, t.crm.readOnly); return; }
    if (!target) return;
    if (target === "won" || target === "lost") {
      Alert.alert(t.crm.cannotAdvance, t.crm.blockedTerminal);
      return;
    }
    if (block !== null) {
      Alert.alert(t.crm.cannotAdvance, blockMessage());
      return;
    }
    setBusy(true);
    try {
      await advanceOpportunityStage(opp, target as Exclude<OpportunityStage, "won" | "lost">);
    } catch (e: any) {
      if (__DEV__) console.warn("[CrmOpportunity] advance:", e?.message);
      Alert.alert(t.common.error, t.crm.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleLogActivity = async () => {
    if (!activityTitle.trim()) {
      Alert.alert(t.common.error, t.crm.titleRequired);
      return;
    }
    if (!orgId) return;
    setBusy(true);
    try {
      await logActivity({
        orgId,
        type: activityType,
        title: activityTitle,
        contactId: opp.contactId,
        contactName: opp.contactName ?? null,
        opportunityId: opp.id,
        opportunityTitle: opp.title,
        dueDate: activityDue || null,
        ownerId: user?.uid ?? null,
        ownerName: user?.displayName ?? null,
      });
      setActivitySheet(false);
      setActivityTitle("");
      setActivityDue("");
      setActivityType("call");
    } catch (e: any) {
      if (__DEV__) console.warn("[CrmOpportunity] activity:", e?.message);
      Alert.alert(t.common.error, t.crm.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const canAdvance = state === "open" && !!target && target !== "won" && block === null;
  const isTerminalNext = target === "won" || target === "lost";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={opp.title}
        subtitle={opp.contactName ?? t.crm.opportunities}
        showBack
        right={canManage ? (
          <TouchableOpacity onPress={openEdit} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel={t.crm.editOpportunity}>
            <Feather name="edit-2" size={18} color={colors.cta} />
          </TouchableOpacity>
        ) : undefined}
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Headline */}
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.value, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
            {formatSar(opp.value, isRTL)}
          </Text>
          <View style={[styles.pillRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.pill, { backgroundColor: tint + "18", borderColor: tint + "30" }]}>
              <Text style={[styles.pillText, { color: tint }]}>{labelFor(t.crm.stages, opp.stage)}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.pillText, { color: colors.mutedForeground }]}>
                {t.crm.tracks[opportunityTrack(opp)]}
              </Text>
            </View>
            {opp.expectedCloseDate && (
              <View style={[styles.pill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.pillText, { color: colors.mutedForeground }]}>
                  {opp.expectedCloseDate}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Stage rail */}
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
            {t.crm.stage}
          </Text>
          <View style={[styles.rail, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {OPEN_OPPORTUNITY_STAGES.map((s, i) => {
              const reached = OPEN_OPPORTUNITY_STAGES.indexOf(opp.stage) >= i;
              return (
                <View key={s} style={styles.railStep}>
                  <View
                    style={[
                      styles.railBar,
                      { backgroundColor: reached ? stageColor(s, colors) : colors.muted },
                    ]}
                  />
                  <Text
                    style={[
                      styles.railLabel,
                      { color: reached ? colors.foreground : colors.outline },
                    ]}
                    numberOfLines={1}
                  >
                    {t.crm.stages[s]}
                  </Text>
                </View>
              );
            })}
          </View>

          {remaining.length > 0 && state === "open" && (
            <View style={[styles.gateBox, { backgroundColor: colors.warning + "12", borderColor: colors.warning + "30" }]}>
              <View style={[styles.gateHead, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Feather name="alert-triangle" size={14} color={colors.warning} />
                <Text style={[styles.gateTitle, { color: colors.warning }]}>{t.crm.blockedGates}</Text>
              </View>
              {remaining.slice(0, 4).map((gate) => (
                <Text
                  key={gate.id}
                  style={[styles.gateItem, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={1}
                >
                  • {labelFor(t.crm.gates, gate.id)}
                </Text>
              ))}
            </View>
          )}

          {isTerminalNext ? (
            <View style={[styles.webNote, { backgroundColor: colors.muted, flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Feather name="external-link" size={14} color={colors.mutedForeground} />
              <Text style={[styles.webNoteText, { color: colors.mutedForeground }]}>
                {t.crm.blockedTerminal}
              </Text>
            </View>
          ) : (
            <Button
              title={
                target ? `${t.crm.advanceStage} → ${t.crm.stages[target]}` : t.crm.cannotAdvance
              }
              onPress={handleAdvance}
              disabled={!canAdvance || busy}
              loading={busy}
              fullWidth
            />
          )}
        </View>

        {/* Activity */}
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.panelHead, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text style={[styles.panelTitle, { color: colors.foreground }]}>{t.crm.activities}</Text>
            <TouchableOpacity
              onPress={() => setActivitySheet(true)}
              accessibilityRole="button"
              accessibilityLabel={t.crm.logActivity}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="plus-circle" size={20} color={colors.cta} />
            </TouchableOpacity>
          </View>
          {linked.length === 0 ? (
            <Text style={[styles.emptyLine, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
              {t.crm.noActivities}
            </Text>
          ) : (
            linked.map((a) => (
              <View key={a.id} style={[styles.activityRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Feather
                  name={activityIcon(a.type) as keyof typeof Feather.glyphMap}
                  size={15}
                  color={a.done ? colors.success : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.activityTitle,
                    {
                      color: colors.foreground,
                      textAlign: isRTL ? "right" : "left",
                      textDecorationLine: a.done ? "line-through" : "none",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {a.title}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Audit trail */}
        {history.length > 0 && (
          <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.panelTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
              {t.crm.history}
            </Text>
            {history.slice(-6).reverse().map((entry, i) => (
              <View key={`${entry.at}-${i}`} style={[styles.historyRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.historyDot, { backgroundColor: colors.outline }]} />
                <Text
                  style={[styles.historyText, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={1}
                >
                  {historyLabel(entry.event)} · {new Date(entry.at).toLocaleDateString()}
                  {entry.byName ? ` · ${entry.byName}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {opp.contactId && (
          <TouchableOpacity
            onPress={() => router.push(`/(crm)/leads/${opp.contactId}` as never)}
            accessibilityRole="button"
            style={[
              styles.bigLink,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <Feather name="user" size={18} color={colors.cta} />
            <Text style={[styles.bigLinkText, { color: colors.foreground }]} numberOfLines={1}>
              {opp.contactName ?? t.crm.leads}
            </Text>
            <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={colors.outline} />
          </TouchableOpacity>
        )}
      </ScrollView>

      <CrmSheet
        visible={editSheet}
        title={t.crm.editOpportunity}
        onClose={() => setEditSheet(false)}
        onSubmit={handleSaveEdit}
        submitLabel={t.common.save}
        submitting={busy}
      >
        <Input label={t.crm.newOpportunity} value={editTitle} onChangeText={setEditTitle} required isRTL={isRTL} containerStyle={{ marginBottom: 12 }} />
        <Input label={t.crm.value} value={editValue} onChangeText={setEditValue} keyboardType="numeric" isRTL={isRTL} containerStyle={{ marginBottom: 12 }} />
        <Input label={t.crm.probability} value={editProbability} onChangeText={setEditProbability} keyboardType="numeric" isRTL={isRTL} containerStyle={{ marginBottom: 12 }} />
        <DateField label={`${t.crm.expectedClose} (${t.crm.optional})`} value={editClose} onChange={setEditClose} isRTL={isRTL} containerStyle={{ marginBottom: 12 }} />
        <Input label={`${t.crm.notes} (${t.crm.optional})`} value={editNotes} onChangeText={setEditNotes} multiline isRTL={isRTL} />
      </CrmSheet>

      <CrmSheet
        visible={activitySheet}
        title={t.crm.logActivity}
        onClose={() => setActivitySheet(false)}
        onSubmit={handleLogActivity}
        submitLabel={t.common.save}
        submitting={busy}
      >
        <CrmChoice
          label={t.crm.activityType}
          options={ACTIVITY_TYPES.map((a) => ({ value: a, label: t.crm.activityTypes[a] }))}
          value={activityType}
          onChange={setActivityType}
          scroll
          required
        />
        <Input label={t.crm.logActivity} value={activityTitle} onChangeText={setActivityTitle} required isRTL={isRTL} />
        <DateField label={`${t.crm.dueDate} (${t.crm.optional})`} value={activityDue} onChange={setActivityDue} isRTL={isRTL} />
      </CrmSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  panel: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  panelHead: { alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  panelTitle: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  value: { fontSize: 24, lineHeight: 40, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  pillRow: { flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  pillText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  rail: { gap: 8, marginBottom: 16 },
  railStep: { flex: 1, gap: 8 },
  railBar: { height: 4, borderRadius: 4 },
  railLabel: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "center" },
  gateBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12, gap: 4 },
  gateHead: { alignItems: "center", gap: 8, marginBottom: 4 },
  gateTitle: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold", flex: 1 },
  gateItem: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  webNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    minHeight: 44,
  },
  webNoteText: { flex: 1, fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  emptyLine: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", paddingVertical: 8 },
  activityRow: { alignItems: "center", gap: 8, minHeight: 40 },
  activityTitle: { flex: 1, fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular" },
  historyRow: { alignItems: "center", gap: 8, minHeight: 32 },
  historyDot: { width: 6, height: 6, borderRadius: 4 },
  historyText: { flex: 1, fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
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
