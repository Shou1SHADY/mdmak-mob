import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { type } from "@/lib/design";
import type { OfferMarks as Marks } from "@/lib/offer-buyer-view";

/**
 * The buyer's decisions on one offer, as chips (website Portal.Procurement.offerLabel): excluded — with its
 * reason under it — shortlisted, a better price asked (by when) and its answer, a price confirmation asked.
 * Read-only: every one of them is decided on the website (/api/procurement/offers/decide).
 */
export function OfferMarks({ marks }: { marks: Marks }) {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const chips: Array<{ key: string; label: string; tone: "destructive" | "success" | "warning" | "accent" | "neutral" }> = [];

  if (marks.exclusion) chips.push({ key: "excluded", label: t.cards.excluded, tone: "destructive" });
  if (marks.shortlisted) chips.push({ key: "shortlisted", label: t.cards.shortlisted, tone: "success" });
  if (marks.bafo.open) {
    chips.push({ key: "bafo", label: marks.bafoReplyBy ? t.cards.bafoAsked.replace("{date}", marks.bafoReplyBy) : t.cards.bafoAskedNoDate, tone: "warning" });
  } else if (marks.bafo.answered) {
    chips.push({ key: "bafo", label: marks.bafo.answered.kind === "lowered" ? t.cards.bafoLowered : t.cards.bafoKept, tone: marks.bafo.answered.kind === "lowered" ? "success" : "neutral" });
  }
  if (marks.revalOpen) chips.push({ key: "reval", label: t.cards.revalAsked, tone: "accent" });
  else if (marks.revalAnswered) chips.push({ key: "reval", label: t.cards.revalAnswered, tone: "neutral" });

  if (chips.length === 0) return null;
  const reasons = t.cards.exclusionReasons as Record<string, string>;
  const reason = marks.exclusion
    ? [reasons[marks.exclusion.code] ?? reasons.other, marks.exclusion.text && marks.exclusion.text !== "—" ? marks.exclusion.text : null].filter(Boolean).join(" — ")
    : null;

  return (
    <View style={styles.wrap}>
      <View style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {chips.map((c) => (
          <StatusBadge key={c.key} label={c.label} tone={c.tone} size="sm" />
        ))}
      </View>
      {reason ? (
        <Text style={[styles.reason, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>
          {reason}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  row: { flexWrap: "wrap", gap: 6 },
  reason: { ...type.caption },
});
