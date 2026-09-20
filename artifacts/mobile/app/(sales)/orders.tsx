import React, { useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { formatDay } from "@/lib/time";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useOrgCollection } from "@/hooks/useOrgCollection";
import { type Tone } from "@/lib/design";
import { labelFor } from "@/lib/labels";
import { formatSarCompact } from "@/lib/crm-display";
import { orderGross, type SalesOrder } from "@/lib/sales-orders";

/**
 * Sales orders — the backbone between a quotation and the cash, read the way
 * the website derives it: the gross comes from the mirrored money functions,
 * and "awaiting the advance" is the state the Payments tab resolves by
 * reporting the client's transfer.
 */
export default function SalesOrdersScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { items: orders, isLoading, error: loadError } = useOrgCollection<SalesOrder>("salesOrders");

  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .filter((o) =>
        q
          ? String(o.orderNumber).includes(q) ||
            (o.contactName || "").toLowerCase().includes(q) ||
            (o.quotationNumber || "").toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => (b.orderNumber || 0) - (a.orderNumber || 0));
  }, [orders, search]);

  const statusTone = (status: string): Tone =>
    status === "running" ? "cta" : status === "closed" ? "success" : status === "cancelled" ? "destructive" : "warning";

  const paymentLabel = (o: SalesOrder): string => {
    if (o.payment?.kind === "deposit")
      return t.sales.orderPaymentDeposit.replace("{percent}", String(o.payment.depositPercent ?? 0));
    if (o.payment?.kind === "credit")
      return t.sales.orderPaymentCredit.replace("{days}", String(o.payment.creditDays ?? 30));
    return t.sales.orderPaymentCash;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.sales.orders} subtitle={t.sales.title} showBack />

      <View style={styles.controls}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <Feather name="search" size={16} color={colors.outline} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.sales.searchOrders}
            placeholderTextColor={colors.outline}
            style={[styles.searchInput, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <FlatList keyboardShouldPersistTaps="handled"
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.cardTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Text style={[styles.number, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
                  #{item.orderNumber}
                  {item.quotationNumber ? `  ·  ${item.quotationNumber}` : ""}
                </Text>
                <Text style={[styles.amount, { color: colors.foreground }]}>
                  {formatSarCompact(orderGross(item), isRTL)}
                </Text>
              </View>
              <Text
                style={[styles.client, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                numberOfLines={1}
              >
                {item.contactName || item.projectName || "—"}
              </Text>
              <View style={[styles.metaRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <StatusBadge label={labelFor(t.sales.orderStatuses, item.status)} tone={statusTone(item.status)} size="sm" />
                <Text style={[styles.payLine, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {paymentLabel(item)}
                </Text>
                {item.promiseDate ? (
                  <Text style={[styles.due, { color: colors.outline }]}>
                    {t.sales.promise} {formatDay(item.promiseDate, isRTL)}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
          ListEmptyComponent={loadError ? (
              <EmptyState variant="error" icon="alert-circle" title={t.errors.loadFailed} subtitle={t.errors.loadFailedHint} />
            ) : (
              <EmptyState icon="clipboard" title={t.sales.noOrders} subtitle={t.sales.noOrdersHint} />
            )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBox: {
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 10 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 6 },
  cardTop: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  number: { flex: 1, fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  amount: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"] },
  client: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular" },
  metaRow: { alignItems: "center", gap: 8, flexWrap: "wrap" },
  payLine: { fontSize: 12, fontFamily: "Inter_400Regular", flexShrink: 1 },
  due: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
