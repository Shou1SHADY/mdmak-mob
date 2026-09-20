import React, { useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { formatDay } from "@/lib/time";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useOrgCollection } from "@/hooks/useOrgCollection";
import { type Tone } from "@/lib/design";
import { labelFor } from "@/lib/labels";
import { formatSarCompact } from "@/lib/crm-display";
import { siteUrl } from "@/lib/site-api";
import { isFullyPaid, paidSoFar } from "@/lib/sales-installments";
import type { CrmQuotation } from "@/lib/crm";

/**
 * Quotations, tracked from the phone. Writing one is the web composer's job
 * (a live A4 document has no phone shape) — the button opens it in the
 * browser; the list, statuses and payment progress live here, derived with
 * the same mirrored calculus the website runs.
 */
export default function SalesQuotationsScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { items: quotations, isLoading, error: loadError } = useOrgCollection<CrmQuotation>("crmQuotations");

  const [search, setSearch] = useState("");

  const rolePrefix = user?.role === "Supplier" ? "/supplier" : "/contractor";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return quotations
      .filter((quo) =>
        q
          ? quo.quotationNumber?.toLowerCase().includes(q) || (quo.contactName || "").toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [quotations, search]);

  const statusTone = (status: string): Tone =>
    status === "accepted" ? "success" : status === "sent" ? "cta" : status === "rejected" ? "destructive" : "neutral";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.sales.quotations}
        subtitle={t.sales.title}
        showBack
        right={
          can("sales.manage") ? (
            <Button
              title={t.sales.composeOnWeb}
              size="sm"
              variant="secondary"
              onPress={() => WebBrowser.openBrowserAsync(siteUrl(`${rolePrefix}/sales/quotations/new`))}
            />
          ) : undefined
        }
      />

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
            placeholder={t.sales.searchQuotations}
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
          renderItem={({ item }) => {
            const paid = item.status === "accepted" ? paidSoFar(item) : 0;
            const fully = item.status === "accepted" && isFullyPaid(item);
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.cardTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text style={[styles.number, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
                    {item.quotationNumber}
                  </Text>
                  <Text style={[styles.amount, { color: colors.foreground }]}>
                    {formatSarCompact(item.amount, isRTL)}
                  </Text>
                </View>
                <Text
                  style={[styles.client, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={1}
                >
                  {item.contactName || "—"}
                </Text>
                <View style={[styles.metaRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <StatusBadge label={labelFor(t.sales.quotationStatuses, item.status)} tone={statusTone(item.status)} size="sm" />
                  {item.status === "accepted" && (
                    <Text style={[styles.paidLine, { color: fully ? colors.success : colors.mutedForeground }]}>
                      {fully
                        ? t.sales.paidInFull
                        : t.sales.paidOf
                            .replace("{paid}", formatSarCompact(paid, isRTL))
                            .replace("{total}", formatSarCompact(item.amount, isRTL))}
                    </Text>
                  )}
                  {item.date ? <Text style={[styles.date, { color: colors.outline }]}>{formatDay(item.date, isRTL)}</Text> : null}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={loadError ? (
            <EmptyState variant="error" icon="alert-circle" title={t.errors.loadFailed} subtitle={t.errors.loadFailedHint} />
          ) : (
            <EmptyState icon="file-text" title={t.sales.noQuotations} subtitle={t.sales.noQuotationsHint} />
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
  paidLine: { fontSize: 12, fontFamily: "Inter_500Medium" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular", marginStart: "auto" },
});
