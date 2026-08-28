import React, { useMemo, useState } from "react";
import { View, Text, SectionList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { scrollBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { Input } from "@/components/ui/Input";
import { CrmSheet } from "@/components/crm/CrmSheet";
import { db } from "@/lib/firebase";
import { useOrgCollection } from "@/hooks/useOrgCollection";
import { confirmDelivery, type DeliveryDoc } from "@/lib/delivery-writes";

/**
 * Delivery notices awaiting confirmation.
 *
 * The strongest phone case in the app after the request inbox: someone is
 * standing at a gate with a lorry, and confirming there is the point.
 *
 * Confirming runs the mirrored `confirmDelivery`, which also receives the stock
 * into a warehouse and notifies the supplier — the same three steps, in the same
 * order, with the same best-effort semantics as the website.
 */
export default function GoodsReceivedScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  // Deliveries name the contractor's ORG, not their uid.
  const { items: deliveries, isLoading } = useOrgCollection<DeliveryDoc>(
    "deliveries",
    "contractorOrgId"
  );

  const [target, setTarget] = useState<DeliveryDoc | null>(null);
  const [receiver, setReceiver] = useState("");
  const [busy, setBusy] = useState(false);

  const sections = useMemo(() => {
    const awaiting = deliveries.filter((d) => d.status !== "confirmed");
    const confirmed = deliveries.filter((d) => d.status === "confirmed");
    return [
      { key: "awaiting", title: t.goods.awaiting, data: awaiting },
      { key: "confirmed", title: t.goods.confirmed, data: confirmed.slice(0, 15) },
    ].filter((s) => s.data.length > 0);
  }, [deliveries, t]);

  const openConfirm = (delivery: DeliveryDoc) => {
    setTarget(delivery);
    // The person confirming is the obvious default receiver; still editable,
    // because a storekeeper often confirms on someone else's behalf.
    setReceiver(user?.displayName || "");
  };

  const doConfirm = async () => {
    if (!target || !user) return;
    if (!receiver.trim()) {
      Alert.alert(t.common.error, t.goods.receiverRequired);
      return;
    }
    setBusy(true);
    try {
      await confirmDelivery({
        firestore: db,
        delivery: target,
        receiverName: receiver,
        uid: user.uid,
        centralLabels: {
          name: t.goods.centralName,
          location: t.goods.centralLocation,
          description: t.goods.centralDesc,
        },
      });
      setTarget(null);
      setReceiver("");
      Alert.alert(t.common.success, t.goods.confirmedToast);
    } catch (e: any) {
      console.warn("[GoodsReceived] confirm:", e?.message);
      Alert.alert(t.common.error, t.goods.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.goods.title} showBack />

      {isLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
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
            paddingBottom: scrollBottomPadding(insets.bottom, false),
          }}
          renderSectionHeader={({ section }) => (
            <Text
              style={[
                styles.sectionHeader,
                {
                  color: section.key === "awaiting" ? colors.warning : colors.mutedForeground,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            >
              {section.title} · {section.data.length}
            </Text>
          )}
          renderItem={({ item }) => {
            const isConfirmed = item.status === "confirmed";
            const tint = isConfirmed ? colors.success : colors.warning;
            const itemCount = item.items?.length ?? 0;
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.cardTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text
                    style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                    numberOfLines={2}
                  >
                    {item.rfqTitle || t.goods.title}
                  </Text>
                  <View style={[styles.pill, { backgroundColor: tint + "18", borderColor: tint + "30" }]}>
                    <Text style={[styles.pillText, { color: tint }]}>
                      {isConfirmed ? t.goods.confirmed : t.goods.awaiting}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[styles.meta, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={1}
                >
                  {[item.supplierName, itemCount > 0 ? `${itemCount} ${t.goods.itemsCount}` : null]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </Text>

                {item.items && item.items.length > 0 && (
                  <View style={styles.itemList}>
                    {item.items.slice(0, 3).map((line, idx) => (
                      <Text
                        key={idx}
                        style={[styles.itemLine, { color: colors.outline, textAlign: isRTL ? "right" : "left" }]}
                        numberOfLines={1}
                      >
                        • {line.name} — {line.quantity} {line.unitOfMeasure || line.unit || ""}
                      </Text>
                    ))}
                    {item.items.length > 3 && (
                      <Text style={[styles.itemLine, { color: colors.outline, textAlign: isRTL ? "right" : "left" }]}>
                        +{item.items.length - 3}
                      </Text>
                    )}
                  </View>
                )}

                {!isConfirmed && (
                  <TouchableOpacity
                    onPress={() => openConfirm(item)}
                    accessibilityRole="button"
                    style={[styles.action, { backgroundColor: colors.success, flexDirection: isRTL ? "row-reverse" : "row" }]}
                  >
                    <Feather name="check" size={15} color={colors.successForeground} />
                    <Text style={[styles.actionText, { color: colors.successForeground }]}>
                      {t.goods.confirmReceipt}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="package"
              title={t.goods.noDeliveries}
              subtitle={t.goods.noDeliveriesHint}
            />
          }
        />
      )}

      <CrmSheet
        visible={!!target}
        title={t.goods.confirmTitle}
        onClose={() => setTarget(null)}
        onSubmit={doConfirm}
        submitLabel={t.goods.confirmReceipt}
        submitting={busy}
      >
        <Text
          style={[styles.sheetLine, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
        >
          {target?.rfqTitle || ""}
          {target?.supplierName ? ` · ${target.supplierName}` : ""}
        </Text>
        <Input
          label={t.goods.receiverName}
          value={receiver}
          onChangeText={setReceiver}
          required
          isRTL={isRTL}
        />
        <View style={[styles.notice, { backgroundColor: colors.accent + "12", flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Feather name="box" size={14} color={colors.accent} />
          <Text style={[styles.noticeText, { color: colors.accent }]}>{t.goods.intoWarehouse}</Text>
        </View>
      </CrmSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 12, lineHeight: 20,
    fontFamily: "Inter_600SemiBold",
    marginTop: 16,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 8, gap: 8 },
  cardTop: { alignItems: "flex-start", gap: 8 },
  title: { flex: 1, fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  pillText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  itemList: { gap: 4 },
  itemLine: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
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
  notice: { alignItems: "center", gap: 8, borderRadius: 12, padding: 8, minHeight: 44 },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
});
