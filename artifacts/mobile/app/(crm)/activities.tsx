import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
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
import { deleteActivity, logActivity, setActivityDone, updateActivity } from "@/lib/crm-writes";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/context/ToastContext";
import { Input } from "@/components/ui/Input";
import { DateField } from "@/components/ui/DateField";
import { CrmSheet } from "@/components/crm/CrmSheet";
import { CrmChoice } from "@/components/crm/CrmChoice";
import { MIN_TOUCH, radius } from "@/lib/design";
import { ACTIVITY_TYPES, type ActivityType, type CrmActivity } from "@/lib/crm";
import { activityIcon, daysUntil } from "@/lib/crm-display";

type Bucket = "overdue" | "today" | "upcoming" | "nodate" | "done";

/**
 * The follow-up inbox.
 *
 * Grouped by when something is due rather than by contact or type, because the
 * only question this screen answers on a phone is "what have I let slip?".
 * Ticking a task off is the single write — everything else about an activity is
 * edited on the website.
 */
export default function CrmActivitiesScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { activities, contacts, orgId, isLoading } = useCrmData({ activities: true });
  const { user } = useAuth();
  const { can } = usePermissions();
  const { showToast } = useToast();
  const canManage = can("crm.manage");

  const [typeFilter, setTypeFilter] = useState<ActivityType | "all">("all");
  const [showDone, setShowDone] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // One sheet for new and edit; `editing` is the record being corrected.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CrmActivity | null>(null);
  const [formType, setFormType] = useState<ActivityType>("call");
  const [formTitle, setFormTitle] = useState("");
  const [formDue, setFormDue] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formContact, setFormContact] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditing(null);
    setFormType("call"); setFormTitle(""); setFormDue(""); setFormNotes("");
    setFormContact(contacts[0]?.id ?? null);
    setSheetOpen(true);
  };
  const openEdit = (a: CrmActivity) => {
    setEditing(a);
    setFormType(a.type); setFormTitle(a.title); setFormDue(a.dueDate ?? ""); setFormNotes(a.notes ?? "");
    setFormContact(a.contactId ?? null);
    setSheetOpen(true);
  };
  const saveSheet = async () => {
    if (!formTitle.trim()) { Alert.alert(t.common.error, t.crm.titleRequired); return; }
    setSaving(true);
    try {
      if (editing) {
        await updateActivity(editing.id, { type: formType, title: formTitle, dueDate: formDue || null, notes: formNotes || null });
      } else {
        const contact = contacts.find((c) => c.id === formContact);
        if (!orgId || !contact) { Alert.alert(t.common.error, t.crm.selectContact); return; }
        await logActivity({
          orgId, type: formType, title: formTitle, contactId: contact.id, contactName: contact.name,
          dueDate: formDue || null, notes: formNotes || null, ownerId: user?.uid ?? null, ownerName: user?.displayName ?? null,
        });
      }
      showToast(t.crm.saved, "success");
      setSheetOpen(false);
    } catch {
      Alert.alert(t.common.error, t.crm.saveFailed);
    } finally {
      setSaving(false);
    }
  };
  const removeActivity = () => {
    if (!editing) return;
    Alert.alert(t.crm.deleteActivity, t.crm.deleteActivityConfirm, [
      { text: t.common.cancel, style: "cancel" },
      { text: t.crm.deleteActivity, style: "destructive", onPress: async () => {
        try { await deleteActivity(editing.id); showToast(t.crm.deleted, "success"); setSheetOpen(false); }
        catch { Alert.alert(t.common.error, t.crm.saveFailed); }
      } },
    ]);
  };

  const sections = useMemo(() => {
    const filtered = activities.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (!showDone && a.done) return false;
      return true;
    });

    const buckets: Record<Bucket, CrmActivity[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      nodate: [],
      done: [],
    };

    for (const a of filtered) {
      if (a.done) {
        buckets.done.push(a);
        continue;
      }
      const days = daysUntil(a.dueDate);
      if (days === null) buckets.nodate.push(a);
      else if (days < 0) buckets.overdue.push(a);
      else if (days === 0) buckets.today.push(a);
      else buckets.upcoming.push(a);
    }

    const byDue = (a: CrmActivity, b: CrmActivity) => ((a.dueDate ?? "") < (b.dueDate ?? "") ? -1 : 1);
    buckets.overdue.sort(byDue);
    buckets.today.sort(byDue);
    buckets.upcoming.sort(byDue);

    const titles: Record<Bucket, string> = {
      overdue: t.crm.overdueTasks,
      today: t.crm.dueToday,
      upcoming: t.crm.activities,
      nodate: t.crm.noDate,
      done: t.crm.markDone,
    };

    return (["overdue", "today", "upcoming", "nodate", "done"] as Bucket[])
      .filter((key) => buckets[key].length > 0)
      .map((key) => ({ key, title: titles[key], data: buckets[key] }));
  }, [activities, typeFilter, showDone, t]);

  const toggleDone = async (activity: CrmActivity) => {
    if (!canManage) { Alert.alert(t.errors.noPermissionTitle, t.crm.readOnly); return; }
    setBusyId(activity.id);
    try {
      await setActivityDone(activity.id, !activity.done);
    } catch (e: any) {
      if (__DEV__) console.warn("[CrmActivities] toggle:", e?.message);
      Alert.alert(t.common.error, t.crm.saveFailed);
    } finally {
      setBusyId(null);
    }
  };

  const chips: { value: ActivityType | "all"; label: string }[] = [
    { value: "all", label: t.common.all },
    ...ACTIVITY_TYPES.map((a) => ({ value: a as ActivityType | "all", label: t.crm.activityTypes[a] })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.crm.activities}
        subtitle={t.crm.title}
        showBack
        right={
          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 4 }}>
            <TouchableOpacity
              onPress={() => setShowDone((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ selected: showDone }}
              accessibilityLabel={showDone ? t.crm.markNotDone : t.crm.markDone}
              style={[styles.toggle, { backgroundColor: showDone ? colors.cta : colors.muted }]}
            >
              <Feather name="check-circle" size={18} color={showDone ? colors.ctaForeground : colors.mutedForeground} />
            </TouchableOpacity>
            {canManage && (
              <TouchableOpacity
                onPress={openNew}
                accessibilityRole="button"
                accessibilityLabel={t.crm.newActivity}
                style={[styles.toggle, { backgroundColor: colors.ctaSoft }]}
              >
                <Feather name="plus" size={18} color={colors.cta} />
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* The wrapper is load-bearing. A horizontal ScrollView placed directly
          in this flex column claims the remaining height and stretches every
          chip into a full-height box — which is what the type filter was doing.
          A content-sized parent pins it, matching the other filtered lists. */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
        >
          {chips.map((chip) => {
            const active = typeFilter === chip.value;
            return (
              <TouchableOpacity
                key={chip.value}
                onPress={() => setTypeFilter(chip.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.cta : colors.card,
                    borderColor: active ? colors.cta : colors.border,
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
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: tabScreenBottomPadding(insets.bottom),
          }}
          renderSectionHeader={({ section }) => (
            <Text
              style={[
                styles.sectionHeader,
                {
                  color: section.key === "overdue" ? colors.destructive : colors.mutedForeground,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            >
              {section.title} · {section.data.length}
            </Text>
          )}
          renderItem={({ item }) => {
            const days = daysUntil(item.dueDate);
            const overdue = !item.done && days !== null && days < 0;
            return (
              <View
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    flexDirection: isRTL ? "row-reverse" : "row",
                    opacity: busyId === item.id ? 0.5 : 1,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => toggleDone(item)}
                  disabled={busyId === item.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: !!item.done }}
                  accessibilityLabel={item.done ? t.crm.markNotDone : t.crm.markDone}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={[
                    styles.check,
                    {
                      borderColor: item.done ? colors.success : colors.border,
                      backgroundColor: item.done ? colors.success : "transparent",
                    },
                  ]}
                >
                  {item.done && <Feather name="check" size={13} color={colors.successForeground} />}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rowBody}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={canManage ? `${item.title}: ${t.crm.editActivity}` : item.title}
                  onPress={() =>
                    canManage
                      ? openEdit(item)
                      : item.contactId && router.push(`/(crm)/leads/${item.contactId}` as never)
                  }
                >
                  <View style={[styles.rowTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Feather
                      name={activityIcon(item.type) as keyof typeof Feather.glyphMap}
                      size={14}
                      color={colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.title,
                        {
                          color: colors.foreground,
                          textAlign: isRTL ? "right" : "left",
                          textDecorationLine: item.done ? "line-through" : "none",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                  </View>
                  <Text
                    style={[styles.meta, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                    numberOfLines={1}
                  >
                    {[item.contactName, item.opportunityTitle].filter(Boolean).join(" · ") ||
                      t.crm.noDeal}
                  </Text>
                </TouchableOpacity>

                <Text
                  style={[
                    styles.due,
                    { color: overdue ? colors.destructive : colors.outline },
                  ]}
                >
                  {item.dueDate || "—"}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="clipboard"
              title={t.crm.noActivities}
              subtitle={t.crm.noActivitiesHint}
              actionLabel={canManage ? t.crm.newActivity : t.crm.leads}
              onAction={canManage ? openNew : () => router.push("/(crm)/leads")}
            />
          }
        />
      )}

      <CrmSheet
        visible={sheetOpen}
        title={editing ? t.crm.editActivity : t.crm.newActivity}
        onClose={() => setSheetOpen(false)}
        onSubmit={saveSheet}
        submitLabel={t.common.save}
        submitting={saving}
      >
        {!editing && (
          <CrmChoice
            label={t.crm.selectContact}
            options={contacts.map((c) => ({ value: c.id, label: c.name }))}
            value={formContact}
            onChange={setFormContact}
            scroll
            required
          />
        )}
        <CrmChoice
          label={t.crm.activityType}
          options={ACTIVITY_TYPES.map((a) => ({ value: a, label: t.crm.activityTypes[a] }))}
          value={formType}
          onChange={setFormType}
          scroll
          required
        />
        <Input label={t.crm.logActivity} value={formTitle} onChangeText={setFormTitle} required isRTL={isRTL} containerStyle={{ marginBottom: 12 }} />
        <DateField label={`${t.crm.dueDate} (${t.crm.optional})`} value={formDue} onChange={setFormDue} isRTL={isRTL} containerStyle={{ marginBottom: 12 }} />
        <Input label={`${t.crm.notes} (${t.crm.optional})`} value={formNotes} onChangeText={setFormNotes} multiline isRTL={isRTL} containerStyle={{ marginBottom: 12 }} />
        {editing && (
          <TouchableOpacity onPress={removeActivity} accessibilityRole="button" style={styles.deleteRow}>
            <Feather name="trash-2" size={16} color={colors.destructive} />
            <Text style={[styles.deleteText, { color: colors.destructive }]}>{t.crm.deleteActivity}</Text>
          </TouchableOpacity>
        )}
      </CrmSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: MIN_TOUCH },
  deleteText: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  chipRow: { alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: {
    // 44px minimum touch target, per the project accessibility rule.
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  sectionHeader: {
    fontSize: 12, lineHeight: 20,
    fontFamily: "Inter_600SemiBold",
    marginTop: 12,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  row: {
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    minHeight: 56,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBody: { flex: 1, gap: 4 },
  rowTop: { alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  due: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
});
