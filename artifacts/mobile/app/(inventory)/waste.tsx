import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { scrollBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CrmChoice } from "@/components/crm/CrmChoice";
import { db } from "@/lib/firebase";
import { useInventoryItems, useWarehouses } from "@/hooks/useInventory";
import { recordWasteConsumption, DEFAULT_WASTE_TARGET_PERCENT } from "@/lib/waste-writes";
import { WASTE_REASON_CODES, type WasteReasonCode } from "@/lib/waste-reasons";

/**
 * Issue stock from a warehouse and record what was wasted doing it.
 *
 * One line at a time, deliberately: the website's page issues a whole batch,
 * which is right at a desk with a delivery note in front of you, but on site you
 * are recording one material as you finish with it.
 *
 * The write goes through the mirrored `recordWasteConsumption`, so the stock
 * deduction and the waste record land in ONE batch — a failure cannot leave
 * stock deducted with no record of where it went.
 *
 * Piece-tracked items (`trackingMode === "unit"`) are excluded: consuming them
 * means flipping specific barcoded units, which needs a scanner flow this screen
 * does not have.
 */
export default function WasteScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { warehouses, isLoading: whLoading } = useWarehouses();

  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const effectiveWarehouseId = warehouseId ?? warehouses[0]?.id ?? null;
  const { items } = useInventoryItems(effectiveWarehouseId);

  const [itemId, setItemId] = useState<string | null>(null);
  const [taken, setTaken] = useState("");
  const [used, setUsed] = useState("");
  const [reason, setReason] = useState<WasteReasonCode | null>(null);
  const [note, setNote] = useState("");
  const [exceptionReason, setExceptionReason] = useState("");
  const [busy, setBusy] = useState(false);

  const issuable = useMemo(
    () => items.filter((i) => i.trackingMode !== "unit" && i.quantity > 0),
    [items]
  );
  const item = useMemo(() => issuable.find((i) => i.id === itemId) ?? null, [issuable, itemId]);

  const takenNum = parseFloat(taken) || 0;
  const usedNum = used.trim() ? parseFloat(used) || 0 : takenNum;
  const wasted = Math.max(0, takenNum - usedNum);
  const wastePercent = takenNum > 0 ? (wasted / takenNum) * 100 : 0;
  const overTarget = wastePercent > DEFAULT_WASTE_TARGET_PERCENT;

  const reset = () => {
    setItemId(null);
    setTaken("");
    setUsed("");
    setReason(null);
    setNote("");
    setExceptionReason("");
  };

  const submit = async () => {
    if (!item || !effectiveWarehouseId || !user) return;
    if (takenNum <= 0 || usedNum < 0 || usedNum > takenNum) {
      Alert.alert(t.common.error, t.waste.invalidQuantities);
      return;
    }
    if (takenNum > item.quantity) {
      Alert.alert(t.common.error, t.inventory.errors.insufficient_stock);
      return;
    }
    setBusy(true);
    try {
      await recordWasteConsumption(db, {
        rows: [
          {
            inventoryItemId: item.id,
            itemName: item.name,
            quantityTaken: takenNum,
            quantityUsed: usedNum,
            unit: item.unit,
            reasonCode: wasted > 0 ? reason : null,
            reasonNote: wasted > 0 && note.trim() ? note.trim() : null,
          },
        ],
        warehouseId: effectiveWarehouseId,
        // No project on this screen — the record lands on the warehouse, which
        // is what the standalone waste page does on the website too.
        scope: { warehouseId: effectiveWarehouseId },
        exceptionReason: overTarget ? exceptionReason.trim() || null : null,
        wasteTargetPercent: DEFAULT_WASTE_TARGET_PERCENT,
        userId: user.uid,
        userName: user.displayName || user.email,
      });
      reset();
      Alert.alert(t.common.success, t.waste.recorded);
    } catch (e: any) {
      const message = e?.message === "too_many_writes" ? t.waste.tooManyWrites : t.waste.failed;
      Alert.alert(t.common.error, message);
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    !!item && takenNum > 0 && usedNum <= takenNum && (!overTarget || !!exceptionReason.trim());

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.waste.title} subtitle={t.inventory.title} showBack />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: scrollBottomPadding(insets.bottom, false) }}
        keyboardShouldPersistTaps="handled"
      >
        {!whLoading && warehouses.length > 1 && (
          <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <CrmChoice
              label={t.waste.selectWarehouse}
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
              value={effectiveWarehouseId}
              onChange={(v) => {
                setWarehouseId(v);
                setItemId(null);
              }}
              scroll
            />
          </View>
        )}

        {issuable.length === 0 ? (
          <EmptyState icon="box" title={t.waste.noItems} subtitle={t.waste.noItemsHint} />
        ) : (
          <>
            <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <CrmChoice
                label={t.waste.selectItem}
                options={issuable.map((i) => ({
                  value: i.id,
                  label: `${i.name} (${i.quantity} ${i.unit})`,
                }))}
                value={itemId}
                onChange={setItemId}
                scroll
                required
              />
            </View>

            {item && (
              <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Input
                  label={t.waste.quantityTaken}
                  value={taken}
                  onChangeText={setTaken}
                  keyboardType="numeric"
                  isRTL={isRTL}
                  helperText={`${item.quantity} ${item.unit}`}
                  required
                />
                <Input
                  label={t.waste.quantityUsed}
                  value={used}
                  onChangeText={setUsed}
                  keyboardType="numeric"
                  isRTL={isRTL}
                  helperText={t.crm.optional}
                />

                {takenNum > 0 && (
                  <View
                    style={[
                      styles.summary,
                      {
                        backgroundColor: (overTarget ? colors.destructive : colors.muted) + "14",
                        flexDirection: isRTL ? "row-reverse" : "row",
                      },
                    ]}
                  >
                    <Feather
                      name={overTarget ? "alert-triangle" : "info"}
                      size={15}
                      color={overTarget ? colors.destructive : colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.summaryText,
                        { color: overTarget ? colors.destructive : colors.mutedForeground },
                      ]}
                    >
                      {t.waste.wasted}: {wasted} {item.unit} · {wastePercent.toFixed(1)}%
                      {overTarget ? ` · ${t.waste.overTarget}` : ""}
                    </Text>
                  </View>
                )}

                {wasted > 0 && (
                  <>
                    <CrmChoice
                      label={t.waste.reason}
                      options={WASTE_REASON_CODES.map((c) => ({
                        value: c,
                        label: t.waste.reasons[c],
                      }))}
                      value={reason}
                      onChange={setReason}
                      scroll
                    />
                    <Input
                      label={t.waste.reasonNote}
                      value={note}
                      onChangeText={setNote}
                      isRTL={isRTL}
                    />
                  </>
                )}

                {overTarget && (
                  <Input
                    label={t.waste.exceptionReason}
                    value={exceptionReason}
                    onChangeText={setExceptionReason}
                    multiline
                    isRTL={isRTL}
                    required
                  />
                )}

                <Button
                  title={t.waste.record}
                  onPress={submit}
                  disabled={!canSubmit || busy}
                  loading={busy}
                  fullWidth
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  summary: {
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    minHeight: 44,
  },
  summaryText: { flex: 1, fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
});
