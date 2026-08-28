import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { scrollBottomPadding } from "@/lib/layout";
import { Input } from "@/components/ui/Input";
import { CrmSheet } from "@/components/crm/CrmSheet";
import { CrmChoice } from "@/components/crm/CrmChoice";
import { useCrmData } from "@/hooks/useCrmData";
import { createOpportunity, logActivity, setLeadStatus } from "@/lib/crm-writes";
import {
  ACTIVITY_TYPES,
  LEAD_STATUSES,
  OPPORTUNITY_TRACKS,
  partyRoles,
  type ActivityType,
  type LeadStatus,
  type OpportunityTrack,
} from "@/lib/crm";
import {
  activityIcon,
  formatSarCompact,
  leadStatusColor,
  stageColor,
  tierColor,
} from "@/lib/crm-display";
import { labelFor } from "@/lib/labels";

/**
 * One lead.
 *
 * The three actions here are the ones a phone is genuinely better at than a
 * desktop: ring the contact, log what was said, and move the lead along. Full
 * record editing (people, commercial profile, satisfaction, payment terms)
 * stays on the website — those fields are read in bulk, not on a doorstep.
 */
export default function CrmLeadDetailScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { contacts, opportunities, activities, orgId, isLoading } = useCrmData({
    opportunities: true,
    activities: true,
  });

  const contact = useMemo(() => contacts.find((c) => c.id === id), [contacts, id]);
  const deals = useMemo(
    () => opportunities.filter((o) => o.contactId === id),
    [opportunities, id]
  );
  const logged = useMemo(
    () =>
      activities
        .filter((a) => a.contactId === id)
        .sort((a, b) => ((a.dueDate ?? "") < (b.dueDate ?? "") ? 1 : -1))
        .slice(0, 5),
    [activities, id]
  );

  const [busy, setBusy] = useState(false);

  const [activitySheet, setActivitySheet] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>("call");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDue, setActivityDue] = useState("");
  const [activityNotes, setActivityNotes] = useState("");

  const [dealSheet, setDealSheet] = useState(false);
  const [dealTitle, setDealTitle] = useState("");
  const [dealTrack, setDealTrack] = useState<OpportunityTrack>("tender");
  const [dealValue, setDealValue] = useState("");
  const [dealClose, setDealClose] = useState("");

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.cta} />
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={t.crm.leads} showBack />
        <View style={styles.center}>
          <Feather name="alert-circle" size={28} color={colors.outline} />
          <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
            {t.errors.notFound}
          </Text>
        </View>
      </View>
    );
  }

  const tint = leadStatusColor(contact.status, colors);

  const handleCall = () => {
    if (!contact.phone) {
      Alert.alert(t.crm.call, t.crm.noPhone);
      return;
    }
    Linking.openURL(`tel:${contact.phone}`);
  };

  const handleStatus = async (status: LeadStatus) => {
    if (status === contact.status || busy) return;
    setBusy(true);
    try {
      await setLeadStatus(contact.id, status);
    } catch (e: any) {
      console.warn("[CrmLead] status:", e?.message);
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
        contactId: contact.id,
        contactName: contact.name,
        dueDate: activityDue || null,
        notes: activityNotes || null,
        ownerId: user?.uid ?? null,
        ownerName: user?.displayName ?? null,
      });
      setActivitySheet(false);
      setActivityTitle("");
      setActivityDue("");
      setActivityNotes("");
      setActivityType("call");
    } catch (e: any) {
      console.warn("[CrmLead] activity:", e?.message);
      Alert.alert(t.common.error, t.crm.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateDeal = async () => {
    if (!dealTitle.trim()) {
      Alert.alert(t.common.error, t.crm.titleRequired);
      return;
    }
    if (!orgId) return;
    setBusy(true);
    try {
      const parsed = parseFloat(dealValue.replace(/,/g, ""));
      const newId = await createOpportunity({
        orgId,
        contactId: contact.id,
        contactName: contact.name,
        title: dealTitle,
        track: dealTrack,
        value: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
        expectedCloseDate: dealClose || null,
        ownerId: user?.uid ?? null,
        ownerName: user?.displayName ?? null,
      });
      setDealSheet(false);
      setDealTitle("");
      setDealValue("");
      setDealClose("");
      setDealTrack("tender");
      router.push(`/(crm)/opportunities/${newId}` as never);
    } catch (e: any) {
      console.warn("[CrmLead] deal:", e?.message);
      Alert.alert(t.common.error, t.crm.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={contact.name} subtitle={t.crm.leads} showBack />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: scrollBottomPadding(insets.bottom, false) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity */}
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.identityRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.avatar, { backgroundColor: tint + "1A" }]}>
              <Text style={[styles.avatarText, { color: tint }]}>
                {contact.name.trim().charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                style={[styles.identityName, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
              >
                {contact.name}
              </Text>
              <Text
                style={[styles.identityMeta, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                numberOfLines={2}
              >
                {[contact.company, contact.city, partyRoles(contact).map((r) => labelFor(t.crm.roles, r)).join(" · ")]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
            {contact.tier && (
              <View style={[styles.tierPill, { backgroundColor: tierColor(contact.tier, colors) + "18" }]}>
                <Text style={[styles.tierText, { color: tierColor(contact.tier, colors) }]}>
                  {contact.tier}
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.actionRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <TouchableOpacity
              onPress={handleCall}
              accessibilityRole="button"
              style={[styles.action, { backgroundColor: colors.cta, flexDirection: isRTL ? "row-reverse" : "row" }]}
            >
              <Feather name="phone" size={16} color={colors.ctaForeground} />
              <Text style={[styles.actionText, { color: colors.ctaForeground }]}>{t.crm.call}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActivitySheet(true)}
              accessibilityRole="button"
              style={[styles.action, { backgroundColor: colors.muted, flexDirection: isRTL ? "row-reverse" : "row" }]}
            >
              <Feather name="clipboard" size={16} color={colors.foreground} />
              <Text style={[styles.actionText, { color: colors.foreground }]}>{t.crm.logActivity}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status */}
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <CrmChoice
            label={t.crm.status}
            options={LEAD_STATUSES.map((s) => ({ value: s, label: t.crm.leadStatuses[s] }))}
            value={contact.status ?? "new"}
            onChange={handleStatus}
            scroll
          />
        </View>

        {/* Deals */}
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.panelHead, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text style={[styles.panelTitle, { color: colors.foreground }]}>{t.crm.opportunities}</Text>
            <TouchableOpacity
              onPress={() => setDealSheet(true)}
              accessibilityRole="button"
              accessibilityLabel={t.crm.newOpportunity}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="plus-circle" size={20} color={colors.cta} />
            </TouchableOpacity>
          </View>
          {deals.length === 0 ? (
            <Text style={[styles.emptyLine, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
              {t.crm.noOpportunities}
            </Text>
          ) : (
            deals.map((d) => (
              <TouchableOpacity
                key={d.id}
                onPress={() => router.push(`/(crm)/opportunities/${d.id}` as never)}
                accessibilityRole="button"
                style={[styles.dealRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
              >
                <View style={[styles.dot, { backgroundColor: stageColor(d.stage, colors) }]} />
                <Text
                  style={[styles.dealTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={1}
                >
                  {d.title}
                </Text>
                <Text style={[styles.dealValue, { color: colors.mutedForeground }]}>
                  {formatSarCompact(d.value, isRTL)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Recent activity */}
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
            {t.crm.activities}
          </Text>
          {logged.length === 0 ? (
            <Text style={[styles.emptyLine, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
              {t.crm.noActivities}
            </Text>
          ) : (
            logged.map((a) => (
              <View
                key={a.id}
                style={[styles.activityRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
              >
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
                <Text style={[styles.activityDate, { color: colors.outline }]}>
                  {a.dueDate || t.crm.noDate}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Log activity */}
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
        <Input
          label={`${t.crm.dueDate} (${t.crm.optional})`}
          value={activityDue}
          onChangeText={setActivityDue}
          placeholder="YYYY-MM-DD"
          isRTL={isRTL}
        />
        <Input
          label={`${t.crm.notes} (${t.crm.optional})`}
          value={activityNotes}
          onChangeText={setActivityNotes}
          multiline
          isRTL={isRTL}
        />
      </CrmSheet>

      {/* New deal */}
      <CrmSheet
        visible={dealSheet}
        title={t.crm.newOpportunity}
        onClose={() => setDealSheet(false)}
        onSubmit={handleCreateDeal}
        submitLabel={t.common.save}
        submitting={busy}
      >
        <Input label={t.crm.newOpportunity} value={dealTitle} onChangeText={setDealTitle} required isRTL={isRTL} />
        <CrmChoice
          label={t.crm.track}
          options={OPPORTUNITY_TRACKS.map((tr) => ({ value: tr, label: t.crm.tracks[tr] }))}
          value={dealTrack}
          onChange={setDealTrack}
          required
        />
        <Input
          label={t.crm.value}
          value={dealValue}
          onChangeText={setDealValue}
          keyboardType="numeric"
          isRTL={isRTL}
        />
        <Input
          label={`${t.crm.expectedClose} (${t.crm.optional})`}
          value={dealClose}
          onChangeText={setDealClose}
          placeholder="YYYY-MM-DD"
          isRTL={isRTL}
        />
      </CrmSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  panel: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  panelHead: { alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  panelTitle: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  identityRow: { alignItems: "center", gap: 12, marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 24, lineHeight: 40, fontFamily: "Inter_600SemiBold" },
  identityName: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
  identityMeta: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  tierPill: { paddingHorizontal: 8, paddingVertical: 8, borderRadius: 12 },
  tierText: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  actionRow: { gap: 8 },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
  },
  actionText: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  emptyLine: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", paddingVertical: 8 },
  dealRow: { alignItems: "center", gap: 8, minHeight: 44 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dealTitle: { flex: 1, fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  dealValue: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  activityRow: { alignItems: "center", gap: 8, minHeight: 40 },
  activityTitle: { flex: 1, fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular" },
  activityDate: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
});
