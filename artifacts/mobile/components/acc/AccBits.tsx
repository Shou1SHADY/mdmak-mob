import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { MONEY_SCALES } from "@/lib/accounting/display";
import { type TreeNode } from "@/lib/accounting/statement-tree";
import { type Books } from "@/hooks/useBooks";
import { MIN_TOUCH } from "@/lib/design";

/**
 * The parts every accounting screen shares: the gate that decides whether the
 * books may be shown at all, the period bar that decides which books, and the
 * renderer for a statement tree.
 *
 * Every label on a statement row arrives bilingual from the chart of accounts —
 * `labelAr` and `labelEn` are written once, in the engine — so nothing here
 * translates an account name. It only picks a side.
 */

/** Picks the reader's side of a row the engine labelled in both languages. */
export function useSide() {
  const { isRTL } = useLanguage();
  return (node: { labelAr: string; labelEn: string }) => (isRTL ? node.labelAr : node.labelEn);
}

/**
 * Why the books are not on screen, when they are not.
 *
 * Three different silences, and telling them apart is the whole point: the
 * module was never switched on, this person's role does not include it, or the
 * period simply has nothing in it. Returns null when there is something to show.
 */
export function BooksGate({ books }: { books: Books }) {
  const t = useT();
  if (books.isLoading) return null;
  if (!books.canView) return <EmptyState icon="lock" title={t.acc.noAccess} subtitle={t.acc.noAccessHint} />;
  if (!books.isEnabled) return <EmptyState icon="power" title={t.acc.off} subtitle={t.acc.offHint} />;
  if (books.entries.length === 0) return <EmptyState icon="book-open" title={t.acc.empty} subtitle={t.acc.emptyHint} />;
  return null;
}

/** Which books: the fiscal year, the period inside it, and the money scale. */
export function PeriodBar({ books }: { books: Books }) {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const side = useSide();
  const row = isRTL ? ("row-reverse" as const) : ("row" as const);

  const chip = (label: string, active: boolean, onPress: () => void, key: string) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        { backgroundColor: active ? colors.cta : colors.card, borderColor: active ? colors.cta : colors.border },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? colors.ctaForeground : colors.mutedForeground }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.bar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
      {books.fiscalYears.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.strip, { flexDirection: row }]}>
          {books.fiscalYears.map((y) =>
            chip(String(y), y === books.fiscalYear, () => books.setFiscalYear(y), `fy${y}`)
          )}
        </ScrollView>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.strip, { flexDirection: row }]}>
        {books.periodOptions.map((p) => chip(side(p), p.key === books.period.key, () => books.setPeriodKey(p.key), p.key))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.strip, { flexDirection: row }]}>
        {MONEY_SCALES.map((s) => chip(t.acc.scales[s], s === books.scale, () => books.setScale(s), s))}
      </ScrollView>
    </View>
  );
}

/** A KPI tile: one figure, its caption, and the sentence that qualifies it. */
export function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "bad";
}) {
  const colors = useColors();
  const { isRTL } = useLanguage();
  const align = isRTL ? ("right" as const) : ("left" as const);
  const valueColor = tone === "good" ? colors.success : tone === "bad" ? colors.destructive : colors.foreground;
  return (
    <View style={[styles.kpi, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.kpiLabel, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.kpiValue, { color: valueColor, textAlign: align }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={[styles.kpiHint, { color: colors.outline, textAlign: align }]} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * A statement, as the engine shaped it.
 *
 * `incomeStatementTree`, `balanceSheetTree` and `cashFlowTree` all return the
 * same node shape, so all three statements render through this one component
 * and cannot drift apart in presentation. Groups collapse; the engine says
 * which ones start open, and which of them print a subtotal after their
 * children rather than on their own row.
 */
export function StatementTree({
  nodes,
  money,
  expanded,
  onToggle,
}: {
  nodes: TreeNode[];
  money: (v: number) => string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const colors = useColors();
  const { isRTL } = useLanguage();
  const side = useSide();
  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);

  const render = (node: TreeNode, depth: number): React.ReactNode[] => {
    const open = expanded.has(node.id);
    const isGroup = node.kind === "group" && (node.children?.length ?? 0) > 0;
    const strong = node.kind === "total" || node.kind === "group";
    const out: React.ReactNode[] = [];

    out.push(
      <Pressable
        key={node.id}
        onPress={isGroup ? () => onToggle(node.id) : undefined}
        disabled={!isGroup}
        accessibilityRole={isGroup ? "button" : undefined}
        accessibilityState={isGroup ? { expanded: open } : undefined}
        style={[
          styles.treeRow,
          {
            flexDirection: row,
            borderBottomColor: colors.border,
            backgroundColor: node.kind === "total" ? colors.muted : "transparent",
            paddingStart: 14 + depth * 14,
          },
        ]}
      >
        <Text
          style={[
            styles.treeLabel,
            { color: strong ? colors.foreground : colors.mutedForeground, textAlign: align },
            strong && styles.treeLabelStrong,
          ]}
          numberOfLines={2}
        >
          {isGroup ? (open ? "− " : "+ ") : ""}
          {side(node)}
        </Text>
        <Text
          style={[styles.treeValue, { color: colors.foreground }, strong && styles.treeValueStrong]}
          numberOfLines={1}
        >
          {node.value === null ? "" : money(node.value)}
        </Text>
      </Pressable>
    );

    if (isGroup && open) {
      for (const child of node.children!) out.push(...render(child, depth + 1));
      // A group that names its subtotal prints it after the children it sums;
      // collapsed, the figure sits on the group's own row instead.
      if (node.totalLabelEn && node.value !== null) {
        out.push(
          <View
            key={`${node.id}:total`}
            style={[
              styles.treeRow,
              { flexDirection: row, borderBottomColor: colors.border, backgroundColor: colors.muted, paddingStart: 14 + depth * 14 },
            ]}
          >
            <Text style={[styles.treeLabel, styles.treeLabelStrong, { color: colors.foreground, textAlign: align }]}>
              {isRTL ? node.totalLabelAr : node.totalLabelEn}
            </Text>
            <Text style={[styles.treeValue, styles.treeValueStrong, { color: colors.foreground }]}>
              {money(node.value)}
            </Text>
          </View>
        );
      }
    }
    return out;
  };

  return <View>{nodes.flatMap((n) => render(n, 0))}</View>;
}

const styles = StyleSheet.create({
  bar: { borderBottomWidth: 1, paddingVertical: 6, gap: 2 },
  strip: { paddingHorizontal: 16, gap: 8, paddingVertical: 4 },
  chip: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, minHeight: MIN_TOUCH - 8, justifyContent: "center" },
  chipText: { fontSize: 12.5, fontFamily: "Inter_600SemiBold" },

  kpi: { flex: 1, minWidth: 150, borderWidth: 1, borderRadius: 14, padding: 12, gap: 3 },
  kpiLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  kpiValue: { fontSize: 19, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
  kpiHint: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },

  treeRow: { alignItems: "center", justifyContent: "space-between", gap: 10, borderBottomWidth: 1, paddingEnd: 14, minHeight: MIN_TOUCH },
  treeLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  treeLabelStrong: { fontFamily: "Inter_600SemiBold" },
  treeValue: { fontSize: 13.5, fontFamily: "Inter_500Medium", fontVariant: ["tabular-nums"] },
  treeValueStrong: { fontFamily: "Inter_700Bold" },
});
