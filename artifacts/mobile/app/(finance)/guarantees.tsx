import React, { useMemo } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { scrollBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { useGuarantees } from "@/hooks/useOrgCollection";
import { daysUntil } from "@/lib/crm-display";
import { labelFor } from "@/lib/labels";

type GuaranteeStatus = "none" | "pending_review" | "accepted" | "rejected";

interface Guarantee {
  id: string;
  status: GuaranteeStatus;
  hasGuarantee?: boolean;
  expirationDate?: string | null;
  rfqTitle?: string | null;
  supplierName?: string | null;
  contractorOrgId?: string;
  supplierOrgId?: string;
}

/**
 * Guarantees, read-only.
 *
 * Accepting or rejecting one is a contractor decision the website gates behind
 * `deliveries.confirm`, and submitting one is a supplier upload — both need a
 * file in hand, so neither belongs here. What a phone is good for is spotting an
 * expiry before it bites, which is what the list sorts on.
 */
export default function GuaranteesScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { items, isLoading } = useGuarantees<Guarantee>();

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        // Soonest expiry first; undated ones sink to the bottom.
        const da = daysUntil(a.expirationDate);
        const dbb = daysUntil(b.expirationDate);
        if (da === null && dbb === null) return 0;
        if (da === null) return 1;
        if (dbb === null) return -1;
        return da - dbb;
      }),
    [items]
  );

  const statusColor = (status: GuaranteeStatus): string => {
    switch (status) {
      case "accepted":
        return colors.success;
      case "rejected":
        return colors.destructive;
      case "pending_review":
        return colors.warning;
      default:
        return colors.mutedForeground;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.finance.guarantees} subtitle={t.finance.title} showBack />

      {isLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: scrollBottomPadding(insets.bottom, false),
          }}
          renderItem={({ item }) => {
            const tint = statusColor(item.status);
            const days = daysUntil(item.expirationDate);
            const expiring = days !== null && days <= 30;
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text
                  style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={2}
                >
                  {item.rfqTitle || "—"}
                </Text>
                <Text
                  style={[styles.meta, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={1}
                >
                  {item.supplierName || "—"}
                </Text>
                <View style={[styles.metaRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.pill, { backgroundColor: tint + "18", borderColor: tint + "30" }]}>
                    <Text style={[styles.pillText, { color: tint }]}>
                      {labelFor(t.finance.guaranteeStatuses, item.status)}
                    </Text>
                  </View>
                  {item.expirationDate ? (
                    <Text
                      style={[
                        styles.expiry,
                        { color: expiring ? colors.destructive : colors.outline },
                      ]}
                    >
                      {t.finance.expires} {item.expirationDate}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="shield"
              title={t.finance.noGuarantees}
              subtitle={t.finance.noGuaranteesHint}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 8, gap: 8 },
  title: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  metaRow: { alignItems: "center", gap: 8, marginTop: 4 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  pillText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  expiry: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
});
