import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { useBooks } from "@/hooks/useBooks";
import { BooksGate, Kpi, PeriodBar, StatementTree } from "@/components/acc/AccBits";
import { balanceSheetTree, cashFlowTree, defaultExpandedIds, incomeStatementTree } from "@/lib/accounting/statement-tree";

/**
 * One renderer for all three statements.
 *
 * The engine returns the same node shape from `incomeStatementTree`,
 * `balanceSheetTree` and `cashFlowTree`, so the three screens differ only in
 * which function they call, which balance window they read, and the handful of
 * figures they headline. Keeping them in one component is what stops the
 * balance sheet from quietly acquiring a different row style than the income
 * statement six months from now.
 *
 * The balance sheet and the cash flow both carry a `difference` the engine
 * computes on every render: anything but zero means the ledger is broken, and
 * the phone says so rather than printing a statement that silently does not add
 * up.
 */
export type StatementKind = "income" | "balance" | "cashflow";

export function StatementScreen({ kind }: { kind: StatementKind }) {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const books = useBooks();

  const built = useMemo(() => {
    if (kind === "income") return incomeStatementTree(books.windows.movement);
    if (kind === "balance") return balanceSheetTree(books.windows.closing);
    return cashFlowTree(books.windows);
  }, [kind, books.windows]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const expanded = useMemo(() => {
    const open = new Set(defaultExpandedIds(built.nodes));
    for (const id of collapsed) open.delete(id);
    return open;
  }, [built.nodes, collapsed]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const title = kind === "income" ? t.acc.income : kind === "balance" ? t.acc.balance : t.acc.cashflow;
  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);
  const gate = <BooksGate books={books} />;

  // Non-zero on either statement means the books do not add up — the engine
  // recomputes it from the entries every render, so it cannot go stale.
  const difference =
    kind === "balance"
      ? (built as ReturnType<typeof balanceSheetTree>).statement.difference
      : kind === "cashflow"
        ? (built as ReturnType<typeof cashFlowTree>).statement.difference
        : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={title} subtitle={t.acc.title} showBack />
      <PeriodBar books={books} />

      {books.isLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : gate ? (
        gate
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: tabScreenBottomPadding(insets.bottom) }}>
          {Math.abs(difference) > 0.005 && (
            <View
              style={[
                styles.alert,
                { flexDirection: row, borderColor: colors.destructive, backgroundColor: colors.destructiveSoft },
              ]}
            >
              <Feather name="alert-triangle" size={16} color={colors.destructive} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: colors.destructive, textAlign: align }]}>
                  {t.acc.unbalanced}
                </Text>
                <Text style={[styles.alertBody, { color: colors.mutedForeground, textAlign: align }]}>
                  {t.acc.unbalancedHint.replace("{value}", books.money(difference))}
                </Text>
              </View>
            </View>
          )}

          <Headline kind={kind} built={built} books={books} />

          <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <StatementTree nodes={built.nodes} money={books.money} expanded={expanded} onToggle={toggle} />
          </View>

          <Text style={[styles.footnote, { color: colors.outline, textAlign: align }]}>{t.acc.postedOnly}</Text>
        </ScrollView>
      )}
    </View>
  );
}

/** The two or three figures worth reading before the statement itself. */
function Headline({
  kind,
  built,
  books,
}: {
  kind: StatementKind;
  built: ReturnType<typeof incomeStatementTree> | ReturnType<typeof balanceSheetTree> | ReturnType<typeof cashFlowTree>;
  books: ReturnType<typeof useBooks>;
}) {
  const t = useT();
  const { isRTL } = useLanguage();
  const row = isRTL ? ("row-reverse" as const) : ("row" as const);

  if (kind === "income") {
    const totals = (built as ReturnType<typeof incomeStatementTree>).statement.totals;
    const revenue = totals.revenue || 0;
    const net = totals.netProfit || 0;
    const pct = revenue === 0 ? "—" : `${Math.round((net / revenue) * 100)}%`;
    return (
      <View style={[styles.grid, { flexDirection: row }]}>
        <Kpi label={t.acc.revenue} value={books.compact(revenue)} />
        <Kpi
          label={t.acc.netProfit}
          value={books.compact(net)}
          hint={t.acc.margin.replace("{value}", pct)}
          tone={net >= 0 ? "good" : "bad"}
        />
      </View>
    );
  }

  if (kind === "balance") {
    const s = (built as ReturnType<typeof balanceSheetTree>).statement;
    return (
      <View style={[styles.grid, { flexDirection: row }]}>
        <Kpi label={t.acc.totalAssets} value={books.compact(s.totalAssets)} />
        <Kpi label={t.acc.totalLiabEquity} value={books.compact(s.totalLiabilitiesAndEquity)} />
      </View>
    );
  }

  const s = (built as ReturnType<typeof cashFlowTree>).statement;
  return (
    <View style={[styles.grid, { flexDirection: row }]}>
      <Kpi
        label={t.acc.netChange}
        value={books.compact(s.netChange)}
        tone={s.netChange >= 0 ? "good" : "bad"}
      />
      <Kpi label={t.acc.closingCash} value={books.compact(s.closingCash)} />
    </View>
  );
}

const styles = StyleSheet.create({
  alert: { alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, margin: 16, marginBottom: 0 },
  alertTitle: { fontSize: 13.5, fontFamily: "Inter_700Bold" },
  alertBody: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 18 },
  grid: { gap: 12, padding: 16 },
  sheet: { borderTopWidth: 1, borderBottomWidth: 1, marginHorizontal: 0 },
  footnote: { fontSize: 11.5, fontFamily: "Inter_400Regular", lineHeight: 18, padding: 16 },
});
