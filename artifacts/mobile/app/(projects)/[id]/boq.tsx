import React, { useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, StyleSheet, Pressable, Modal, ScrollView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateField } from "@/components/ui/DateField";
import { MIN_TOUCH } from "@/lib/design";
import { useProject, type BoqItem } from "@/hooks/useProjects";
import { useProjectSite } from "@/hooks/useProjectSite";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { recordMeasurement } from "@/lib/project-site-writes";
import { computeProgress } from "@/lib/ipc";
import { db } from "@/lib/firebase";

/**
 * The bill of quantities, and the act it exists for: recording what was built.
 *
 * This is the one screen in the app that is genuinely better on a phone than at
 * a desk, because the person who knows the quantity is standing in front of it
 * with a tape measure. So the whole screen is arranged around one button per
 * line.
 *
 * A line drawn into a tender is marked but still measurable — being committed
 * commercially does not stop work on site, and the rules agree. An overrun past
 * the contracted quantity is allowed and flagged rather than blocked: it is a
 * fact about the job, and the claim will show it either way.
 */
export default function ProjectBoqScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { project, boqItems, isLoading } = useProject(id);
  const { measurements } = useProjectSite(id);
  const { can, isLoading: permsLoading } = useProjectPermissions(id);

  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<BoqItem | null>(null);

  const mayMeasure = can("projects.edit") || can("projects.publish");

  const progress = useMemo(
    () =>
      computeProgress(
        boqItems.map((i) => ({
          id: i.id,
          quantity: Number(i.quantity) || 0,
          unitPrice: Number(i.unitPrice) || 0,
          executedQuantity: Number(i.executedQuantity) || 0,
        }))
      ),
    [boqItems]
  );

  const countByLine = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of measurements) map.set(m.boqItemId, (map.get(m.boqItemId) ?? 0) + 1);
    return map;
  }, [measurements]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return boqItems;
    return boqItems.filter(
      (i) =>
        (i.itemNo ?? "").toLowerCase().includes(q) ||
        (i.descriptionAr ?? "").toLowerCase().includes(q) ||
        (i.descriptionEn ?? "").toLowerCase().includes(q)
    );
  }, [boqItems, search]);

  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);
  const describe = (i: BoqItem) => (isRTL ? i.descriptionAr || i.descriptionEn : i.descriptionEn || i.descriptionAr) || "";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.site.boq}
        subtitle={project?.name ?? ""}
        showBack
        right={
          <Text style={[styles.progress, { color: colors.cta }]}>
            {t.site.progress.replace("{value}", `${Math.round(progress.percent)}%`)}
          </Text>
        }
      />

      <View style={styles.controls}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: row }]}>
          <Feather name="search" size={16} color={colors.outline} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.site.boqSearch}
            placeholderTextColor={colors.outline}
            style={[styles.searchInput, { color: colors.foreground, textAlign: align }]}
          />
        </View>
      </View>

      {isLoading || permsLoading ? (
        <View style={{ paddingHorizontal: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
          renderItem={({ item }) => {
            const contracted = Number(item.quantity) || 0;
            const executed = Number(item.executedQuantity) || 0;
            const over = executed > contracted && contracted > 0;
            const pct = contracted > 0 ? Math.min(100, (executed / contracted) * 100) : 0;
            const count = countByLine.get(item.id) ?? 0;
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.cardTop, { flexDirection: row }]}>
                  <Text style={[styles.ref, { color: colors.foreground, textAlign: align }]} numberOfLines={2}>
                    {item.itemNo ? `${item.itemNo} · ` : ""}
                    {describe(item)}
                  </Text>
                  {item.isEditable === false && <StatusBadge label={t.site.locked} tone="neutral" size="sm" />}
                </View>

                <View style={[styles.figures, { flexDirection: row }]}>
                  <Figure label={t.site.contracted} value={`${contracted} ${item.unit ?? ""}`} />
                  <Figure label={t.site.executed} value={`${executed} ${item.unit ?? ""}`} tone={over ? "bad" : undefined} />
                  <Figure label={t.site.remaining} value={`${Math.max(0, contracted - executed)} ${item.unit ?? ""}`} />
                </View>

                <View style={[styles.track, { backgroundColor: colors.muted }]}>
                  <View
                    style={[styles.fill, { width: `${pct}%`, backgroundColor: over ? colors.destructive : colors.success }]}
                  />
                </View>

                <View style={[styles.actions, { flexDirection: row }]}>
                  {count > 0 && (
                    <Text style={[styles.count, { color: colors.outline }]}>
                      {t.site.history.replace("{count}", String(count))}
                    </Text>
                  )}
                  {mayMeasure && (
                    <Button
                      title={t.site.measure}
                      size="sm"
                      variant="secondary"
                      onPress={() => setTarget(item)}
                      style={{ marginStart: "auto" }}
                    />
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<EmptyState icon="list" title={t.site.noBoq} subtitle={t.site.noBoqHint} />}
        />
      )}

      <MeasureSheet
        target={target}
        projectId={id}
        actor={user ? { uid: user.uid, name: user.displayName || user.email, organizationId: user.organizationId } : null}
        onClose={() => setTarget(null)}
      />
    </View>
  );
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: "bad" }) {
  const colors = useColors();
  const { isRTL } = useLanguage();
  const align = isRTL ? ("right" as const) : ("left" as const);
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.figureLabel, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[styles.figureValue, { color: tone === "bad" ? colors.destructive : colors.foreground, textAlign: align }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * One measurement, against one line.
 *
 * The date defaults to today in the reader's own calendar day rather than UTC's
 * — a measurement taken at 1 AM in Riyadh belongs to the day the person thinks
 * it is.
 */
function MeasureSheet({
  target,
  projectId,
  actor,
  onClose,
}: {
  target: BoqItem | null;
  projectId: string;
  actor: { uid: string; name: string; organizationId: string } | null;
  onClose: () => void;
}) {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const [quantity, setQuantity] = useState("");
  const [measuredAt, setMeasuredAt] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const close = () => {
    setQuantity("");
    setNote("");
    setMeasuredAt(new Date().toLocaleDateString("en-CA"));
    onClose();
  };

  if (!target) return null;

  const qty = Number(quantity);
  const contracted = Number(target.quantity) || 0;
  const executed = Number(target.executedQuantity) || 0;
  const overrun = qty > 0 && contracted > 0 && executed + qty > contracted;
  const valid = !!qty && !Number.isNaN(qty);

  const submit = async () => {
    if (!actor || !valid) return;
    setBusy(true);
    try {
      await recordMeasurement(db, projectId, target, { quantity: qty, measuredAt, note }, actor);
      close();
      Alert.alert(t.site.measureDone);
    } catch {
      Alert.alert(t.site.failed);
    } finally {
      setBusy(false);
    }
  };

  const describe = (isRTL ? target.descriptionAr || target.descriptionEn : target.descriptionEn || target.descriptionAr) || "";
  const align = isRTL ? ("right" as const) : ("left" as const);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel={t.common.close} />
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
            <Text style={[styles.sheetTitle, { color: colors.foreground, textAlign: align }]}>
              {t.site.measureFor.replace("{item}", describe)}
            </Text>

            <Input
              label={t.site.quantityDone}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              isRTL={isRTL}
              required
              helperText={t.site.correction}
            />

            <DateField label={t.site.measuredAt} value={measuredAt} onChange={setMeasuredAt} isRTL={isRTL} required />

            <Input
              label={t.site.note}
              value={note}
              onChangeText={setNote}
              multiline
              isRTL={isRTL}
              helperText={t.site.noteHint}
            />

            {overrun && (
              <View style={[styles.warn, { borderColor: colors.warning, backgroundColor: colors.warningSoft }]}>
                <Text style={[styles.warnTitle, { color: colors.warning, textAlign: align }]}>
                  {t.site.overrun.replace("{contracted}", String(contracted)).replace("{unit}", target.unit ?? "")}
                </Text>
                <Text style={[styles.warnBody, { color: colors.mutedForeground, textAlign: align }]}>
                  {t.site.overrunHint}
                </Text>
              </View>
            )}

            <Button title={t.site.measureSave} onPress={submit} loading={busy} disabled={!valid} fullWidth />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBox: { alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: MIN_TOUCH },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 10 },
  progress: { fontSize: 13, fontFamily: "Inter_700Bold" },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 10 },
  cardTop: { alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  ref: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  figures: { gap: 10 },
  figureLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  figureValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"] },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3 },
  actions: { alignItems: "center", gap: 10 },
  count: { fontSize: 11.5, fontFamily: "Inter_400Regular" },

  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopWidth: 1, borderTopStartRadius: 20, borderTopEndRadius: 20, maxHeight: "88%" },
  sheetTitle: { fontSize: 16, lineHeight: 26, fontFamily: "Inter_700Bold" },
  warn: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  warnTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  warnBody: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
