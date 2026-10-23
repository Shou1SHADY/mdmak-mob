import React, { useMemo } from "react";
import { View, Text, SectionList, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { useOrgCollection } from "@/hooks/useOrgCollection";
import * as WebBrowser from "expo-web-browser";
import { receivingPath, type DeliveryDoc } from "@/lib/delivery-writes";
import { siteUrl } from "@/lib/site-api";

/**
 * Delivery notices awaiting confirmation.
 *
 * The strongest phone case in the app after the request inbox: someone is
 * standing at a gate with a lorry, and seeing what is due is the point.
 *
 * Receiving is the website's (Procurement 2.0): the receiver counts blind, notes
 * the rejects and signs on its receiving desk, and one server act then numbers
 * the receipt, lands the stock, posts the books and tells the supplier. The
 * phone lists what is waiting and opens that desk on the delivery.
 */
export default function GoodsReceivedScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  // Deliveries name the contractor's ORG, not their uid.
  const { items: deliveries, isLoading, error: loadError } = useOrgCollection<DeliveryDoc>(
    "deliveries",
    "contractorOrgId"
  );

  const sections = useMemo(() => {
    const awaiting = deliveries.filter((d) => d.status !== "confirmed");
    const confirmed = deliveries.filter((d) => d.status === "confirmed");
    return [
      { key: "awaiting", title: t.goods.awaiting, data: awaiting },
      { key: "confirmed", title: t.goods.confirmed, data: confirmed.slice(0, 15) },
    ].filter((s) => s.data.length > 0);
  }, [deliveries, t]);

  // The rules refuse a device confirming a delivery (Procurement 2.0, G-09): the
  // receiver's count on the website IS the receipt — see lib/delivery-writes.ts.
  const openReceiving = (delivery: DeliveryDoc) => {
    Alert.alert(t.goods.receiveOnWeb, undefined, [
      { text: t.common.cancel, style: "cancel" },
      { text: t.goods.openReceiving, onPress: () => void WebBrowser.openBrowserAsync(siteUrl(receivingPath(delivery.id))) },
    ]);
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
                    onPress={() => openReceiving(item)}
                    accessibilityRole="button"
                    style={[styles.action, { backgroundColor: colors.success, flexDirection: isRTL ? "row-reverse" : "row" }]}
                  >
                    <Feather name="external-link" size={15} color={colors.successForeground} />
                    <Text style={[styles.actionText, { color: colors.successForeground }]}>
                      {t.goods.openReceiving}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
          ListEmptyComponent={loadError ? (
            <EmptyState variant="error" icon="alert-circle" title={t.errors.loadFailed} subtitle={t.errors.loadFailedHint} />
          ) : (
            <EmptyState
              icon="package"
              title={t.goods.noDeliveries}
              subtitle={t.goods.noDeliveriesHint}
            />
          )}
        />
      )}

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
});
