import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { CrmSheet } from "@/components/crm/CrmSheet";
import { CrmChoice } from "@/components/crm/CrmChoice";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/context/ToastContext";
import { type, space, radius, MIN_TOUCH } from "@/lib/design";
import { db } from "@/lib/firebase";
import { labelFor } from "@/lib/labels";
import {
  useWarehouses,
  useWarehouseRequests,
  useInventoryItems,
  type WarehouseRequest,
} from "@/hooks/useInventory";
import { collection, getDocs } from "firebase/firestore";
import {
  confirmWarehouseRequestReceipt,
  createWarehouseRequest,
  itemMergeKey,
  releaseWarehouseRequest,
} from "@/lib/warehouse-requests";

/**
 * The withdrawal-request inbox — releasing stock and confirming it arrived.
 *
 * This is the strongest case in the whole app for doing something on a phone
 * rather than a desktop: both halves happen at a warehouse door, not at a desk.
 *
 * Both actions call the transaction functions mirrored verbatim from the
 * website, so the stock arithmetic, the status guards and the audit fields are
 * identical. Nothing here recomputes a quantity locally — the transaction
 * re-reads and re-validates the source item inside the transaction, which is
 * what makes two people releasing at once safe.
 */
export default function WarehouseRequestsScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { warehouses, central, isLoading: whLoading } = useWarehouses();
  const { requests, isLoading } = useWarehouseRequests(central?.id);
  const { can } = usePermissions();
  const { showToast } = useToast();
  const canManage = can("warehouses.manage");

  const [busy, setBusy] = useState(false);
  // Raising a request: pick where from, what, how much, where to.
  const [newOpen, setNewOpen] = useState(false);
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [qty, setQty] = useState("");
  const [receiver, setReceiver] = useState("");
  const { items: sourceItems } = useInventoryItems(fromId);
  const [releaseTarget, setReleaseTarget] = useState<WarehouseRequest | null>(null);
  const [releaseQty, setReleaseQty] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<WarehouseRequest | null>(null);
  const [confirmNote, setConfirmNote] = useState("");

  const nameFor = (id: string) => warehouses.find((w) => w.id === id)?.name ?? id;

  const sections = useMemo(() => {
    const pending = requests.filter((r) => r.status === "pending");
    const released = requests.filter((r) => r.status === "released");
    const closed = requests.filter((r) => r.status === "received" || r.status === "cancelled");
    return [
      { key: "pending", title: t.inventory.statuses.pending, data: pending },
      { key: "released", title: t.inventory.statuses.released, data: released },
      { key: "closed", title: t.inventory.statuses.received, data: closed.slice(0, 10) },
    ].filter((s) => s.data.length > 0);
  }, [requests, t]);

  /** The transactions throw bare codes; map them to the localized reason. */
  const explain = (message: string): string => {
    const known = t.inventory.errors as Record<string, string>;
    return known[message] ?? t.inventory.failed;
  };

  const doRelease = async () => {
    if (!releaseTarget || !central || !user) return;
    const parsed = releaseQty.trim() ? parseFloat(releaseQty) : releaseTarget.quantity;
    setBusy(true);
    try {
      await releaseWarehouseRequest({
        firestore: db,
        centralWarehouseId: central.id,
        requestId: releaseTarget.id,
        byUserId: user.uid,
        byUserName: user.displayName || user.email,
        releasedQuantity: parsed,
      });
      setReleaseTarget(null);
      setReleaseQty("");
    } catch (e: any) {
      Alert.alert(t.common.error, explain(e?.message ?? ""));
    } finally {
      setBusy(false);
    }
  };

  const doCreate = async () => {
    if (!central || !user || !fromId || !toId || !itemId) { Alert.alert(t.common.error, t.inventory.requestItem); return; }
    const source = sourceItems.find((i) => i.id === itemId);
    const quantity = parseFloat(qty);
    if (!source || !Number.isFinite(quantity) || quantity <= 0) { Alert.alert(t.common.error, t.inventory.requestQuantity); return; }
    const to = warehouses.find((w) => w.id === toId);
    setBusy(true);
    try {
      await createWarehouseRequest({
        firestore: db,
        centralWarehouseId: central.id,
        fromWarehouseId: fromId,
        toWarehouseId: toId,
        itemId,
        sourceItem: { quantity: source.quantity, trackingMode: source.trackingMode ?? null },
        quantity,
        organizationId: user.organizationId,
        byUserId: user.uid,
        byUserName: user.displayName || user.email,
        expectedReceiverName: receiver.trim() || user.displayName || user.email,
        toProjectId: to?.projectId ?? null,
        toProjectName: to?.projectName ?? null,
      });
      showToast(t.inventory.requestCreated, "success");
      setNewOpen(false);
      setItemId(null); setQty(""); setReceiver("");
    } catch (e: any) {
      Alert.alert(t.common.error, explain(e?.message ?? ""));
    } finally {
      setBusy(false);
    }
  };

  const doConfirm = async () => {
    if (!confirmTarget || !central || !user) return;
    setBusy(true);
    try {
      // Top up the row already holding this material rather than adding a
      // second one: the BOM, the transfers and the low-stock alert all find an
      // item by name and unit, so a duplicate row hides half the stock from
      // each of them. Same lookup the website's confirmation performs.
      const destItems = await getDocs(collection(db, "warehouses", confirmTarget.toWarehouseId, "inventoryItems"));
      const key = itemMergeKey({ name: confirmTarget.itemName, unit: confirmTarget.unit });
      const match = destItems.docs.find((d) => {
        const data = d.data() as { name?: string; unit?: string; trackingMode?: string | null; lot?: string | null; remnant?: boolean | null };
        return !!data.name && !!data.unit && data.trackingMode !== "unit"
          && itemMergeKey({ name: data.name, unit: data.unit, lot: data.lot, remnant: data.remnant }) === key;
      });
      await confirmWarehouseRequestReceipt({
        firestore: db,
        centralWarehouseId: central.id,
        requestId: confirmTarget.id,
        byUserId: user.uid,
        byUserName: user.displayName || user.email,
        note: confirmNote.trim() || null,
        existingDestItemId: match?.id ?? null,
      });
      setConfirmTarget(null);
      setConfirmNote("");
    } catch (e: any) {
      Alert.alert(t.common.error, explain(e?.message ?? ""));
    } finally {
      setBusy(false);
    }
  };

  if (whLoading || isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={t.inventory.requests} subtitle={t.inventory.title} showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.cta} />
        </View>
      </View>
    );
  }

  // Requests live on the central warehouse. Without one there is nowhere for
  // them to be, and saying so beats rendering a permanently empty inbox.
  if (!central) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={t.inventory.requests} subtitle={t.inventory.title} showBack />
        <EmptyState
          icon="alert-circle"
          title={t.inventory.noCentral}
          subtitle={t.inventory.noCentralHint}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.inventory.requests}
        subtitle={central.name}
        showBack
        right={canManage ? (
          <TouchableOpacity
            onPress={() => { setFromId(central.id); setToId(null); setNewOpen(true); }}
            style={[styles.headerBtn, { backgroundColor: colors.ctaSoft }]}
            accessibilityRole="button"
            accessibilityLabel={t.inventory.newRequest}
          >
            <Feather name="plus" size={18} color={colors.cta} />
          </TouchableOpacity>
        ) : undefined}
      />

      <SectionList keyboardShouldPersistTaps="handled"
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
              { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
            ]}
          >
            {section.title} · {section.data.length}
          </Text>
        )}
        renderItem={({ item }) => {
          const tint =
            item.status === "pending"
              ? colors.warning
              : item.status === "released"
                ? colors.cta
                : item.status === "received"
                  ? colors.success
                  : colors.outline;
          return (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.cardTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Text
                  style={[styles.itemName, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={1}
                >
                  {item.itemName}
                </Text>
                <Text style={[styles.qty, { color: colors.foreground }]}>
                  {item.releasedQuantity ?? item.quantity} {item.unit}
                </Text>
              </View>

              <Text
                style={[styles.route, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                numberOfLines={1}
              >
                {nameFor(item.fromWarehouseId)} → {item.toProjectName || nameFor(item.toWarehouseId)}
              </Text>

              <View style={[styles.metaRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.pill, { backgroundColor: tint + "18", borderColor: tint + "30" }]}>
                  <Text style={[styles.pillText, { color: tint }]}>
                    {labelFor(t.inventory.statuses, item.status)}
                  </Text>
                </View>
                <Text style={[styles.who, { color: colors.outline }]} numberOfLines={1}>
                  {item.requestNumber} · {item.requestedByName}
                </Text>
              </View>

              {item.status === "pending" && (
                <TouchableOpacity
                  onPress={() => {
                    setReleaseTarget(item);
                    setReleaseQty(String(item.quantity));
                  }}
                  accessibilityRole="button"
                  style={[styles.action, { backgroundColor: colors.cta, flexDirection: isRTL ? "row-reverse" : "row" }]}
                >
                  <Feather name="arrow-up-right" size={15} color={colors.ctaForeground} />
                  <Text style={[styles.actionText, { color: colors.ctaForeground }]}>
                    {t.inventory.release}
                  </Text>
                </TouchableOpacity>
              )}

              {item.status === "released" && (
                <TouchableOpacity
                  onPress={() => setConfirmTarget(item)}
                  accessibilityRole="button"
                  style={[styles.action, { backgroundColor: colors.success, flexDirection: isRTL ? "row-reverse" : "row" }]}
                >
                  <Feather name="check" size={15} color={colors.successForeground} />
                  <Text style={[styles.actionText, { color: colors.successForeground }]}>
                    {t.inventory.confirmReceipt}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="clipboard"
            title={t.inventory.noRequests}
            subtitle={t.inventory.noRequestsHint}
            actionLabel={canManage ? t.inventory.newRequest : undefined}
            onAction={canManage ? () => { setFromId(central.id); setNewOpen(true); } : undefined}
          />
        }
      />

      <CrmSheet visible={newOpen} title={t.inventory.requestTitle} onClose={() => setNewOpen(false)} onSubmit={doCreate} submitLabel={t.inventory.newRequest} submitting={busy}>
        <CrmChoice
          label={t.inventory.requestFrom}
          options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
          value={fromId}
          onChange={(v) => { setFromId(v); setItemId(null); }}
          scroll
          required
        />
        <CrmChoice
          label={t.inventory.requestItem}
          options={sourceItems.filter((i) => i.trackingMode !== "unit").map((i) => ({ value: i.id, label: `${i.name} · ${i.quantity} ${i.unit}` }))}
          value={itemId}
          onChange={setItemId}
          scroll
          required
        />
        {fromId && sourceItems.length === 0 ? (
          <Text style={[type.caption, { color: colors.warning, textAlign: isRTL ? "right" : "left", marginBottom: space.md }]}>{t.inventory.noSourceItems}</Text>
        ) : null}
        <Input label={t.inventory.requestQuantity} value={qty} onChangeText={setQty} keyboardType="numeric" required isRTL={isRTL} containerStyle={{ marginBottom: space.md }} />
        <CrmChoice
          label={t.inventory.requestTo}
          options={warehouses.filter((w) => w.id !== fromId).map((w) => ({ value: w.id, label: w.projectName ? `${w.name} · ${w.projectName}` : w.name }))}
          value={toId}
          onChange={setToId}
          scroll
          required
        />
        <Input label={`${t.inventory.receiverName} (${t.common.optional})`} value={receiver} onChangeText={setReceiver} isRTL={isRTL} />
      </CrmSheet>

      <CrmSheet
        visible={!!releaseTarget}
        title={t.inventory.releaseTitle}
        onClose={() => setReleaseTarget(null)}
        onSubmit={doRelease}
        submitLabel={t.inventory.release}
        submitting={busy}
      >
        <Text style={[styles.sheetLine, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
          {releaseTarget?.itemName} · {t.inventory.from} {releaseTarget ? nameFor(releaseTarget.fromWarehouseId) : ""}
        </Text>
        <Input
          label={t.inventory.releasedQuantity}
          value={releaseQty}
          onChangeText={setReleaseQty}
          keyboardType="numeric"
          isRTL={isRTL}
          helperText={releaseTarget ? `${releaseTarget.quantity} ${releaseTarget.unit}` : undefined}
        />
      </CrmSheet>

      <CrmSheet
        visible={!!confirmTarget}
        title={t.inventory.confirmTitle}
        onClose={() => setConfirmTarget(null)}
        onSubmit={doConfirm}
        submitLabel={t.inventory.confirmReceipt}
        submitting={busy}
      >
        <Text style={[styles.sheetLine, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
          {confirmTarget?.itemName} ·{" "}
          {confirmTarget?.releasedQuantity ?? confirmTarget?.quantity} {confirmTarget?.unit}
        </Text>
        <Input
          label={t.inventory.receiveNote}
          value={confirmNote}
          onChangeText={setConfirmNote}
          multiline
          isRTL={isRTL}
        />
      </CrmSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerBtn: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  sectionHeader: {
    fontSize: 12, lineHeight: 20,
    fontFamily: "Inter_600SemiBold",
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 8, gap: 8 },
  cardTop: { alignItems: "center", gap: 8 },
  itemName: { flex: 1, fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
  qty: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  route: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  metaRow: { alignItems: "center", gap: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  pillText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  who: { flex: 1, fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  action: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
    marginTop: 4,
  },
  actionText: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  sheetLine: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", marginBottom: 16 },
});
