import React, { useMemo } from "react";
import { View, Text, FlatList, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useBooks } from "@/hooks/useBooks";
import { BooksGate, PeriodBar } from "@/components/acc/AccBits";
import { trialBalance } from "@/lib/accounting/balances";
import { accountName } from "@/lib/accounting/accounts";

/**
 * The trial balance — the one screen whose job is to prove the rest are honest.
 *
 * Its `difference` is closing debits minus closing credits. Zero is the only
 * acceptable answer, and the badge says which it is before a single row is
 * read; the movement columns are what changed in the chosen period, the closing
 * ones what the account stands at.
 *
 * Six numeric columns do not fit a phone, so the table scrolls sideways in its
 * own container rather than squeezing the digits — a misread figure is worse
 * than a swipe.
 */
export default function TrialBalanceScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const books = useBooks();

  const tb = useMemo(() => trialBalance(books.windows), [books.windows]);
  const balanced = Math.abs(tb.difference) < 0.005;
  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);
  const gate = <BooksGate books={books} />;

  const cell = (value: number, strong = false) => (
    <Text style={[styles.num, { color: colors.foreground }, strong && styles.numStrong]} numberOfLines={1}>
      {value === 0 ? "—" : books.money(value)}
    </Text>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.acc.trial}
        subtitle={t.acc.title}
        showBack
        right={
          <StatusBadge
            label={balanced ? t.acc.balanced : t.acc.difference.replace("{value}", books.money(tb.difference))}
            tone={balanced ? "success" : "destructive"}
            size="sm"
          />
        }
      />
      <PeriodBar books={books} />

      {books.isLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : gate ? (
        gate
      ) : (
        <ScrollView horizontal contentContainerStyle={{ minWidth: "100%" }}>
          <View style={{ flex: 1 }}>
            <View style={[styles.head, { flexDirection: row, backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
              <Text style={[styles.account, styles.headText, { color: colors.mutedForeground, textAlign: align }]}>
                {t.acc.account}
              </Text>
              <Text style={[styles.num, styles.headText, { color: colors.mutedForeground }]}>
                {t.acc.movement} {t.acc.debit}
              </Text>
              <Text style={[styles.num, styles.headText, { color: colors.mutedForeground }]}>
                {t.acc.movement} {t.acc.credit}
              </Text>
              <Text style={[styles.num, styles.headText, { color: colors.mutedForeground }]}>
                {t.acc.closing} {t.acc.debit}
              </Text>
              <Text style={[styles.num, styles.headText, { color: colors.mutedForeground }]}>
                {t.acc.closing} {t.acc.credit}
              </Text>
            </View>

            <FlatList
              data={tb.rows}
              keyExtractor={(r) => r.code}
              contentContainerStyle={{ paddingBottom: tabScreenBottomPadding(insets.bottom) }}
              renderItem={({ item }) => (
                <View style={[styles.row, { flexDirection: row, borderBottomColor: colors.border }]}>
                  <Text style={[styles.account, { color: colors.foreground, textAlign: align }]} numberOfLines={2}>
                    {item.code} · {accountName(item.code, isRTL ? "ar" : "en")}
                  </Text>
                  {cell(item.movementDebit)}
                  {cell(item.movementCredit)}
                  {cell(item.closingDebit)}
                  {cell(item.closingCredit)}
                </View>
              )}
              ListFooterComponent={
                <View style={[styles.row, { flexDirection: row, backgroundColor: colors.muted, borderBottomColor: colors.border }]}>
                  <Text style={[styles.account, styles.numStrong, { color: colors.foreground, textAlign: align }]}>
                    {t.acc.trial}
                  </Text>
                  {cell(tb.totals.movementDebit, true)}
                  {cell(tb.totals.movementCredit, true)}
                  {cell(tb.totals.closingDebit, true)}
                  {cell(tb.totals.closingCredit, true)}
                </View>
              }
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  headText: { fontSize: 10.5, fontFamily: "Inter_600SemiBold" },
  row: { alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  account: { width: 170, fontSize: 12, fontFamily: "Inter_400Regular" },
  num: { width: 92, fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "right", fontVariant: ["tabular-nums"] },
  numStrong: { fontFamily: "Inter_700Bold" },
});
