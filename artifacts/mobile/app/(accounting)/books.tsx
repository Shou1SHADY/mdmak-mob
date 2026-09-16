import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { useBooks } from "@/hooks/useBooks";
import { BooksGate, Kpi, PeriodBar, useSide } from "@/components/acc/AccBits";
import { ACC } from "@/lib/accounting/accounts";
import { integrityChecks, nodeNatural } from "@/lib/accounting/balances";
import { incomeStatementTree } from "@/lib/accounting/statement-tree";
import { agingReport, cashConversionCycle, expenseBreakdown, liquidity } from "@/lib/accounting/analytics";
import { elapsedDays } from "@/lib/accounting/periods";

/**
 * The books at a glance — the screen that answers "how are we doing" for
 * someone who is not at their desk.
 *
 * Every figure is the website's: the same tree, the same liquidity and aging
 * functions, over the same period. Nothing is computed here beyond picking a
 * tone for a number that can be negative.
 */
export default function BooksScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const books = useBooks();
  const side = useSide();

  const { windows, entries } = books;
  const income = useMemo(() => incomeStatementTree(windows.movement), [windows.movement]);
  const checks = useMemo(() => integrityChecks(entries, windows), [entries, windows]);
  const failing = useMemo(() => checks.filter((c) => !c.ok), [checks]);
  const liq = useMemo(() => liquidity(windows.closing), [windows.closing]);
  const days = elapsedDays(books.period.from, books.period.to);
  const ccc = useMemo(() => cashConversionCycle(windows, days), [windows, days]);
  const expenses = useMemo(() => expenseBreakdown(windows.movement), [windows.movement]);

  const receivableAging = useMemo(
    () => agingReport(entries, { accounts: [ACC.clientsReceivable], side: "debit", asOf: books.period.to }),
    [entries, books.period.to]
  );
  const payableAging = useMemo(
    () => agingReport(entries, { accounts: [ACC.suppliersPayable], side: "credit", asOf: books.period.to }),
    [entries, books.period.to]
  );

  const totals = income.statement.totals;
  const revenue = totals.revenue || 0;
  const gross = totals.grossProfit || 0;
  const net = totals.netProfit || 0;
  const receivables =
    nodeNatural(windows.closing, ACC.clientsReceivable) + nodeNatural(windows.closing, ACC.retentionReceivable);
  const payables =
    nodeNatural(windows.closing, ACC.suppliersPayable) + nodeNatural(windows.closing, ACC.subcontractorRetentionPayable);

  const pct = (value: number, of: number) => (of === 0 ? "—" : `${Math.round((value / of) * 100)}%`);
  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);
  const gate = <BooksGate books={books} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.acc.books} subtitle={t.acc.title} showBack />
      <PeriodBar books={books} />

      {books.isLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : gate ? (
        gate
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: tabScreenBottomPadding(insets.bottom), gap: 12 }}>
          {failing.length > 0 && (
            <View style={[styles.alert, { flexDirection: row, borderColor: colors.destructive, backgroundColor: colors.destructiveSoft }]}>
              <Feather name="alert-triangle" size={16} color={colors.destructive} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: colors.destructive, textAlign: align }]}>
                  {t.acc.checksFailing}
                </Text>
                <Text style={[styles.alertBody, { color: colors.mutedForeground, textAlign: align }]}>
                  {failing.map(side).join(" · ")}
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.grid, { flexDirection: row }]}>
            <Kpi label={t.acc.revenue} value={books.compact(revenue)} />
            <Kpi
              label={t.acc.grossProfit}
              value={books.compact(gross)}
              hint={t.acc.margin.replace("{value}", pct(gross, revenue))}
              tone={gross >= 0 ? "good" : "bad"}
            />
          </View>
          <View style={[styles.grid, { flexDirection: row }]}>
            <Kpi
              label={t.acc.netProfit}
              value={books.compact(net)}
              hint={t.acc.margin.replace("{value}", pct(net, revenue))}
              tone={net >= 0 ? "good" : "bad"}
            />
            <Kpi label={t.acc.cash} value={books.compact(liq.cash)} hint={t.acc.cashHint} />
          </View>
          <View style={[styles.grid, { flexDirection: row }]}>
            <Kpi
              label={t.acc.receivables}
              value={books.compact(receivables)}
              hint={t.acc.overdue.replace(
                "{value}",
                books.compact(receivableAging.buckets[2] + receivableAging.buckets[3])
              )}
            />
            <Kpi
              label={t.acc.payables}
              value={books.compact(payables)}
              hint={t.acc.overdue.replace(
                "{value}",
                books.compact(payableAging.buckets[2] + payableAging.buckets[3])
              )}
            />
          </View>
          <View style={[styles.grid, { flexDirection: row }]}>
            <Kpi
              label={t.acc.workingCapital}
              value={books.compact(liq.workingCapital)}
              hint={t.acc.ratio
                .replace("{ratio}", liq.currentRatio === null ? "—" : liq.currentRatio.toFixed(2))
                .replace("{quick}", liq.quickRatio === null ? "—" : liq.quickRatio.toFixed(2))}
            />
            <Kpi
              label={t.acc.ccc}
              value={ccc.ccc === null ? "—" : String(Math.round(ccc.ccc))}
              hint={ccc.ccc === null ? undefined : t.acc.cccHint.replace("{days}", String(Math.round(ccc.ccc)))}
            />
          </View>

          {expenses.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.foreground, textAlign: align }]}>
                {t.acc.expensesTitle}
              </Text>
              {expenses.slice(0, 6).map((e) => (
                <View key={e.code} style={[styles.expense, { flexDirection: row }]}>
                  <Text style={[styles.expenseName, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={1}>
                    {isRTL ? e.nameAr : e.nameEn}
                  </Text>
                  <Text style={[styles.expenseValue, { color: colors.foreground }]}>{books.money(e.value)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ gap: 8 }}>
            {(
              [
                ["/(accounting)/cashflow", "trending-up", t.acc.cashflow],
                ["/(accounting)/trial-balance", "check-square", t.acc.trial],
              ] as const
            ).map(([href, icon, label]) => (
              <Pressable
                key={href}
                onPress={() => router.push(href)}
                accessibilityRole="button"
                style={[styles.link, { flexDirection: row, backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Feather name={icon} size={16} color={colors.cta} />
                <Text style={[styles.linkText, { color: colors.foreground, textAlign: align }]}>{label}</Text>
                <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={colors.outline} />
              </Pressable>
            ))}
          </View>

          <Text style={[styles.footnote, { color: colors.outline, textAlign: align }]}>{t.acc.readOnlyHint}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  alert: { alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  alertTitle: { fontSize: 13.5, fontFamily: "Inter_700Bold" },
  alertBody: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 18 },
  grid: { gap: 12 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  expense: { alignItems: "center", justifyContent: "space-between", gap: 10 },
  expenseName: { flex: 1, fontSize: 12.5, fontFamily: "Inter_400Regular" },
  expenseValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"] },
  link: { alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: 52 },
  linkText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  footnote: { fontSize: 11.5, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 4 },
});
