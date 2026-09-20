import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { db } from "@/lib/firebase";
import { labelFor } from "@/lib/labels";
import {
  DEFECT_KINDS,
  CAUSE_MATERIAL,
  CAUSE_UNKNOWN,
  canDo,
  isQcStation,
  materialNeed,
  materialOpen,
  materialReceived,
  roundNeed,
  type DefectKind,
} from "@/lib/manufacturing-engine";
import {
  STOP_KINDS,
  confirmMaterialReceipt,
  qcDecide,
  recordOutput,
  recordStop,
  requestStationMaterials,
  type StopKind,
} from "@/lib/manufacturing-writes";
import { mfgLinks } from "@/lib/mfg-events";
import type { OrderView } from "@/lib/manufacturing-view";
import { useMfgNotify } from "@/hooks/useMfgNotify";
import type { MfgWorldState } from "@/hooks/useMfgWorld";

/**
 * The five acts a phone performs on the floor.
 *
 * Each one calls the website's own write function — the validation, the
 * transaction and the conservation rules are the engine's, not a second
 * implementation. The forms only collect what that function's parameters ask
 * for, and render the code it throws back in the operator's language.
 *
 * `actorIsQc` is the one thing the write layer trusts the caller about: it
 * decides whether recording at a QC station is allowed at all. It is passed
 * straight from the resolved permission, never from a screen's assumption.
 */
export type MfgActionKind = "output" | "qc_decision" | "request_materials" | "confirm_receipt" | "stop";

export interface MfgActionTarget {
  kind: MfgActionKind;
  view?: OrderView;
  index?: number;
  departmentId?: string;
  /** confirm_receipt: which withdrawal is being signed for. */
  requestNumber?: string;
}

const isNum = (s: string) => s.trim() !== "" && Number.isFinite(Number(s));
const n = (s: string) => Number(s);

export function MfgActionSheet({
  target,
  onClose,
  state,
}: {
  target: MfgActionTarget | null;
  onClose: () => void;
  state: MfgWorldState;
}) {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showToast } = useToast();
  const notify = useMfgNotify();

  const [busy, setBusy] = useState(false);
  // output
  const [good, setGood] = useState("");
  const [rejected, setRejected] = useState("");
  const [hours, setHours] = useState("");
  const [remnant, setRemnant] = useState("");
  const [defect, setDefect] = useState<DefectKind | null>(null);
  const [cause, setCause] = useState<string>(CAUSE_UNKNOWN);
  const [photo, setPhoto] = useState(false);
  const [finalInspection, setFinalInspection] = useState(false);
  const [packingPhotos, setPackingPhotos] = useState(false);
  // qc
  const [qcKind, setQcKind] = useState<"rework" | "concession" | "remnant" | "scrap">("rework");
  const [qcQty, setQcQty] = useState("");
  const [toIndex, setToIndex] = useState<number | null>(null);
  const [consent, setConsent] = useState("");
  const [reason, setReason] = useState("");
  // materials
  const [consentNote, setConsentNote] = useState("");
  // stop
  const [stopHours, setStopHours] = useState("");
  const [stopKind, setStopKind] = useState<StopKind>("machine");
  const [note, setNote] = useState("");

  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);

  const view = target?.view;
  const index = target?.index ?? 0;
  const department = useMemo(
    () => state.departments.find((d) => d.id === (target?.departmentId ?? "")) ?? null,
    [state.departments, target?.departmentId]
  );
  const atQcStation = department ? isQcStation(department) : false;
  const allowed = view ? canDo(view.calc, index) : 0;
  // What is still OUTSTANDING, not the station's whole need: material already
  // received, or already requested and not yet received, must not be asked for
  // twice — the write appends rows verbatim, so a second full request issues
  // the quantity again. Same remainder the website's form pre-fills.
  const needLines = useMemo(() => {
    if (!view || target?.kind !== "request_materials") return [];
    const deptId = target.departmentId ?? "";
    return materialNeed(view.calc, index)
      .map((l) => ({
        ...l,
        qty: Math.max(
          0,
          roundNeed(l.unit, l.qty - materialReceived(view.calc.slice, deptId, l.itemName) - materialOpen(view.calc.slice, deptId, l.itemName))
        ),
      }))
      .filter((l) => l.qty > 0);
  }, [view, index, target?.kind, target?.departmentId]);
  const lostToday = useMemo(
    () => (department ? state.world.lost.get(department.id) ?? 0 : 0),
    [state.world.lost, department]
  );

  const reset = () => {
    setGood(""); setRejected(""); setHours(""); setRemnant("");
    setDefect(null); setCause(CAUSE_UNKNOWN); setPhoto(false);
    setFinalInspection(false); setPackingPhotos(false);
    setQcKind("rework"); setQcQty(""); setToIndex(null); setConsent(""); setReason("");
    setConsentNote(""); setStopHours(""); setStopKind("machine"); setNote("");
  };

  const close = () => { if (!busy) { reset(); onClose(); } };

  const fail = (e: any) => {
    const code = String(e?.message || "generic");
    Alert.alert(t.common.error, labelFor(t.mfg.errors, code) || t.mfg.errors.generic);
  };

  const actor = { id: user?.uid || "", name: state.actorName };

  const submitOutput = async () => {
    if (!view || !user) return;
    setBusy(true);
    try {
      await recordOutput(db, {
        orderId: view.id,
        product: view.product,
        departments: state.departments,
        settings: state.settings,
        index,
        good: isNum(good) ? n(good) : 0,
        rejected: isNum(rejected) ? n(rejected) : 0,
        defect,
        cause: isNum(rejected) && n(rejected) > 0 ? cause : null,
        photoAttached: photo,
        hours: state.settings.features.time && isNum(hours) ? n(hours) : null,
        remnantArea: isNum(remnant) && n(remnant) > 0 ? n(remnant) : null,
        finalInspection: atQcStation && finalInspection,
        photosBeforePacking: atQcStation && packingPhotos,
        // The write layer trusts this: it is the resolved permission, nothing else.
        actorIsQc: state.actor.qc,
        actor,
      });
      showToast(t.mfg.recorded, "success");
      if (isNum(rejected) && n(rejected) > 0) {
        await notify({
          kind: "rejected",
          to: [{ permission: "manufacturing.qc" }],
          workOrderId: view.id,
          link: mfgLinks.order(view.id),
          departments: state.departments,
          fallback: {
            title: t.mfg.qcDecide,
            message: `${view.ref} — ${rejected} ${view.unit}`,
          },
        });
      }
      close();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const submitQc = async () => {
    if (!view || !user) return;
    if (!defect) { Alert.alert(t.common.error, t.mfg.errors.defect_required); return; }
    setBusy(true);
    try {
      const { scrapValue } = await qcDecide(db, {
        orderId: view.id,
        product: view.product,
        departments: state.departments,
        settings: state.settings,
        index,
        kind: qcKind,
        quantity: isNum(qcQty) ? n(qcQty) : 0,
        defect,
        cause,
        toIndex: qcKind === "rework" ? toIndex : null,
        consent: qcKind === "concession" ? consent.trim() : null,
        remnantArea: qcKind === "remnant" && isNum(remnant) ? n(remnant) : null,
        reason: reason.trim(),
        actor,
      });
      showToast(
        qcKind === "scrap" && scrapValue > 0
          ? t.mfg.scrapValue.replace("{value}", String(Math.round(scrapValue)))
          : t.mfg.qcDecided,
        "success"
      );
      if (qcKind === "scrap") {
        await notify({
          kind: "scrap_raised",
          to: [{ permission: "manufacturing.manage" }, { permission: "manufacturing.cost" }],
          workOrderId: view.id,
          link: mfgLinks.order(view.id),
          departments: state.departments,
          fallback: { title: t.mfg.candidates.scrap_review, message: `${view.ref} — ${qcQty} ${view.unit}` },
        });
      }
      close();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const submitMaterials = async () => {
    if (!view || !user || !department) return;
    setBusy(true);
    try {
      const number = await requestStationMaterials(db, {
        orderId: view.id,
        organizationId: state.orgId,
        departmentId: department.id,
        lines: needLines.map((l) => ({
          itemName: l.itemName,
          unit: l.unit,
          quantity: l.qty,
          lot: null,
        })),
        consentNote: consentNote.trim() || null,
        actor,
      });
      showToast(t.mfg.requestSent.replace("{number}", number), "success");
      await notify({
        kind: "withdrawal_requested",
        to: [{ permission: "warehouses.manage" }],
        workOrderId: view.id,
        link: mfgLinks.inventoryDesk(),
        departments: state.departments,
        fallback: { title: t.mfg.requestMaterials, message: `${view.ref} — ${number}` },
      });
      close();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const submitReceipt = async () => {
    if (!view || !user || !target?.requestNumber) return;
    setBusy(true);
    try {
      await confirmMaterialReceipt(db, {
        orderId: view.id,
        requestNumber: target.requestNumber,
        note: note.trim() || null,
        actor,
        organizationId: state.orgId,
      });
      showToast(t.mfg.receiptSigned, "success");
      close();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const submitStop = async () => {
    if (!user || !department) return;
    setBusy(true);
    try {
      await recordStop(db, {
        organizationId: state.orgId,
        department,
        hours: isNum(stopHours) ? n(stopHours) : 0,
        alreadyLost: lostToday,
        kind: stopKind,
        note: note.trim() || null,
        actor,
      });
      showToast(t.mfg.stopRecorded, "success");
      close();
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const title =
    target?.kind === "output"
      ? atQcStation ? t.mfg.candidates.qc_release : t.mfg.recordOutput
      : target?.kind === "qc_decision"
      ? t.mfg.qcDecide
      : target?.kind === "request_materials"
      ? t.mfg.requestMaterials
      : target?.kind === "confirm_receipt"
      ? t.mfg.confirmReceipt
      : t.mfg.reportStop;

  const Chips = <T extends string>({
    values,
    value,
    onPick,
    label,
  }: { values: readonly T[]; value: T | null; onPick: (v: T) => void; label: (v: T) => string }) => (
    <View style={[styles.chips, { flexDirection: row }]}>
      {values.map((v) => (
        <Pressable accessibilityRole="button"
          key={v}
          onPress={() => onPick(v)}
          style={[
            styles.chip,
            { borderColor: value === v ? colors.cta : colors.border, backgroundColor: value === v ? colors.ctaSoft : colors.card },
          ]}
        >
          <Text style={[styles.chipText, { color: value === v ? colors.cta : colors.mutedForeground }]}>{label(v)}</Text>
        </Pressable>
      ))}
    </View>
  );

  const Check = ({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) => (
    <Pressable accessibilityRole="button" onPress={onToggle} style={[styles.check, { flexDirection: row, borderColor: colors.border }]}>
      <Feather name={on ? "check-square" : "square"} size={18} color={on ? colors.cta : colors.outline} />
      <Text style={[styles.checkText, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable accessible={false} style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={close}>
          <Pressable accessible={false}
            style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ alignItems: "center", paddingBottom: 8 }}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.title, { color: colors.foreground, textAlign: align }]}>{title}</Text>
              {view && (
                <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: align }]}>
                  {view.ref} · {view.product.name}
                  {department ? ` · ${department.name}` : ""}
                </Text>
              )}

              {target?.kind === "output" && (
                <>
                  <Text style={[styles.hint, { color: colors.outline, textAlign: align }]}>
                    {t.mfg.inHand}: {allowed} {view?.unit}
                  </Text>
                  <Input label={t.mfg.good} value={good} onChangeText={setGood} keyboardType="decimal-pad" isRTL={isRTL} />
                  <Input label={t.mfg.rejected} value={rejected} onChangeText={setRejected} keyboardType="decimal-pad" isRTL={isRTL} />
                  {isNum(rejected) && n(rejected) > 0 && (
                    <>
                      <Text style={[styles.label, { color: colors.mutedForeground, textAlign: align }]}>{t.mfg.defect}</Text>
                      <Chips values={DEFECT_KINDS} value={defect} onPick={setDefect} label={(v) => labelFor(t.mfg.defects, v)} />
                      <Text style={[styles.label, { color: colors.mutedForeground, textAlign: align }]}>{t.mfg.cause}</Text>
                      <Chips
                        values={[CAUSE_MATERIAL, CAUSE_UNKNOWN, ...state.departments.map((d) => d.id)] as string[]}
                        value={cause}
                        onPick={setCause}
                        label={(v) =>
                          v === CAUSE_MATERIAL
                            ? t.mfg.causeMaterial
                            : v === CAUSE_UNKNOWN
                            ? t.mfg.causeUnknown
                            : state.departments.find((d) => d.id === v)?.name ?? v
                        }
                      />
                      <Check on={photo} onToggle={() => setPhoto(!photo)} label={t.mfg.photoAttached} />
                    </>
                  )}
                  {state.settings.features.time && (
                    <Input label={t.mfg.hours} value={hours} onChangeText={setHours} keyboardType="decimal-pad" isRTL={isRTL} />
                  )}
                  {atQcStation && (
                    <>
                      <Check on={finalInspection} onToggle={() => setFinalInspection(!finalInspection)} label={t.mfg.finalInspection} />
                      <Check on={packingPhotos} onToggle={() => setPackingPhotos(!packingPhotos)} label={t.mfg.photosBeforePacking} />
                    </>
                  )}
                  <Input label={t.mfg.remnantArea} value={remnant} onChangeText={setRemnant} keyboardType="decimal-pad" isRTL={isRTL} />
                  <Button title={t.mfg.save} onPress={submitOutput} loading={busy} fullWidth style={{ marginTop: 12 }} />
                </>
              )}

              {target?.kind === "qc_decision" && (
                <>
                  <Chips
                    values={["rework", "concession", "remnant", "scrap"] as const}
                    value={qcKind}
                    onPick={setQcKind}
                    label={(v) => labelFor(t.mfg.qcKinds, v)}
                  />
                  <Input label={t.mfg.quantity} value={qcQty} onChangeText={setQcQty} keyboardType="decimal-pad" isRTL={isRTL} />
                  <Text style={[styles.label, { color: colors.mutedForeground, textAlign: align }]}>{t.mfg.defect}</Text>
                  <Chips values={DEFECT_KINDS} value={defect} onPick={setDefect} label={(v) => labelFor(t.mfg.defects, v)} />
                  {qcKind === "rework" && view && (
                    <>
                      <Text style={[styles.label, { color: colors.mutedForeground, textAlign: align }]}>{t.mfg.reworkTo}</Text>
                      <Chips
                        values={view.calc.route.slice(0, index + 1).map((_, i) => String(i))}
                        value={toIndex === null ? null : String(toIndex)}
                        onPick={(v) => setToIndex(Number(v))}
                        label={(v) =>
                          state.departments.find((d) => d.id === view.calc.route[Number(v)]?.departmentId)?.name ??
                          t.mfg.step.replace("{n}", String(Number(v) + 1))
                        }
                      />
                    </>
                  )}
                  {qcKind === "concession" && (
                    <Input label={t.mfg.consent} value={consent} onChangeText={setConsent} isRTL={isRTL} />
                  )}
                  {qcKind === "remnant" && (
                    <Input label={t.mfg.remnantArea} value={remnant} onChangeText={setRemnant} keyboardType="decimal-pad" isRTL={isRTL} />
                  )}
                  <Input label={t.mfg.reason} value={reason} onChangeText={setReason} isRTL={isRTL} />
                  <Button title={t.mfg.save} onPress={submitQc} loading={busy} fullWidth style={{ marginTop: 12 }} />
                </>
              )}

              {target?.kind === "request_materials" && (
                <>
                  <Text style={[styles.label, { color: colors.mutedForeground, textAlign: align }]}>{t.mfg.requestLines}</Text>
                  {needLines.map((l) => (
                    <View key={l.itemName} style={[styles.line, { flexDirection: row, borderColor: colors.border }]}>
                      <Text style={[styles.lineName, { color: colors.foreground, textAlign: align }]} numberOfLines={1}>
                        {l.itemName}
                      </Text>
                      <Text style={[styles.lineQty, { color: colors.foreground }]}>
                        {l.qty} {l.unit}
                      </Text>
                    </View>
                  ))}
                  <Input label={t.mfg.consentNote} value={consentNote} onChangeText={setConsentNote} isRTL={isRTL} />
                  <Button
                    title={t.mfg.requestMaterials}
                    onPress={submitMaterials}
                    loading={busy}
                    disabled={needLines.length === 0}
                    fullWidth
                    style={{ marginTop: 12 }}
                  />
                </>
              )}

              {target?.kind === "confirm_receipt" && (
                <>
                  <Text style={[styles.hint, { color: colors.mutedForeground, textAlign: align }]}>
                    {t.mfg.confirmReceiptHint}
                  </Text>
                  <Input label={t.mfg.receiptNote} value={note} onChangeText={setNote} isRTL={isRTL} />
                  <Button title={t.mfg.confirmReceipt} onPress={submitReceipt} loading={busy} fullWidth style={{ marginTop: 12 }} />
                </>
              )}

              {target?.kind === "stop" && (
                <>
                  {lostToday > 0 && (
                    <Text style={[styles.hint, { color: colors.outline, textAlign: align }]}>
                      {t.mfg.alreadyLost.replace("{hours}", String(lostToday))}
                    </Text>
                  )}
                  <Input label={t.mfg.stopHours} value={stopHours} onChangeText={setStopHours} keyboardType="decimal-pad" isRTL={isRTL} />
                  <Text style={[styles.label, { color: colors.mutedForeground, textAlign: align }]}>{t.mfg.stopKind}</Text>
                  <Chips values={STOP_KINDS} value={stopKind} onPick={setStopKind} label={(v) => labelFor(t.mfg.stopKinds, v)} />
                  <Input label={t.mfg.stopNote} value={note} onChangeText={setNote} isRTL={isRTL} />
                  <Button title={t.mfg.reportStop} onPress={submitStop} loading={busy} fullWidth style={{ marginTop: 12 }} />
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}


const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "90%", gap: 8 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  title: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  subtitle: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", marginBottom: 6 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 6, lineHeight: 20 },
  label: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_500Medium", marginTop: 8, marginBottom: 4 },
  chips: { flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, minHeight: 44, justifyContent: "center" },
  chipText: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_500Medium" },
  check: { alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 44, marginTop: 8 },
  checkText: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular" },
  line: { alignItems: "center", justifyContent: "space-between", gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 6 },
  lineName: { flex: 1, fontSize: 14, lineHeight: 24, fontFamily: "Inter_500Medium" },
  lineQty: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"] },
});
