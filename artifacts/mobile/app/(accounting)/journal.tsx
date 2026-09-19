import React, { useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { type Tone } from "@/lib/design";
import { labelFor } from "@/lib/labels";
import { useBooks } from "@/hooks/useBooks";
import { BooksGate, PeriodBar } from "@/components/acc/AccBits";
import { accountName } from "@/lib/accounting/accounts";
import { type JournalEntry, type EntryStatus } from "@/lib/accounting/journal";

/**
 * The journal — every entry in the chosen period, newest first.
 *
 * This is where a figure on a statement gets explained: tap an entry and it
 * opens into its lines, each naming its account, its side and the project it
 * was charged to. Drafts appear, marked as such, because a reader wondering why
 * a statement looks light deserves to see the voucher nobody has posted yet —
 * but they are excluded from every statement, and the footnote says so.
 *
 * Read-only. Posting, reversing and deleting a draft stay on the website.
 */
export default function JournalScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const books = useBooks();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const visible = useMemo(() => {
    const from = books.period.from;
    const to = books.period.to;
    const q = search.trim().toLowerCase();
    return books.entries
      .filter((e) => e.date >= from && e.date <= to)
      .filter(
        (e) =>
          !q ||
          e.description?.toLowerCase().includes(q) ||
          String(e.entryNumber).includes(q) ||
          e.reference?.toLowerCase().includes(q)
      )
      .sort((a, b) => (a.date === b.date ? b.entryNumber - a.entryNumber : a.date < b.date ? 1 : -1));
  }, [books.entries, books.period.from, books.period.to, search]);

  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);
  const gate = <BooksGate books={books} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.acc.journal} subtitle={t.acc.title} showBack />
      <PeriodBar books={books} />

      <View style={styles.controls}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: row }]}>
          <Feather name="search" size={16} color={colors.outline} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.acc.journalSearch}
            placeholderTextColor={colors.outline}
            style={[styles.searchInput, { color: colors.foreground, textAlign: align }]}
          />
        </View>
      </View>

      {books.isLoading ? (
        <View style={{ paddingHorizontal: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : gate ? (
        gate
      ) : (
        <FlatList keyboardShouldPersistTaps="handled"
          data={visible}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
          renderItem={({ item: e }) => {
            const isOpen = open === e.id;
            return (
              <Pressable
                onPress={() => setOpen(isOpen ? null : e.id)}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.cardTop, { flexDirection: row }]}>
                  <Text style={[styles.ref, { color: colors.foreground, textAlign: align }]} numberOfLines={1}>
                    {t.acc.entryNumber.replace("{number}", String(e.entryNumber))}
                  </Text>
                  <StatusBadge label={labelFor(t.acc.statuses, e.status)} tone={statusTone(e.status)} size="sm" />
                </View>
                <Text style={[styles.desc, { color: colors.foreground, textAlign: align }]} numberOfLines={2}>
                  {e.description}
                </Text>
                <View style={[styles.metaRow, { flexDirection: row }]}>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>{e.date}</Text>
                  <Text style={[styles.meta, { color: colors.outline }]}>{labelFor(t.acc.kinds, e.kind)}</Text>
                  <Text style={[styles.meta, { color: colors.outline }]}>
                    {t.acc.lines.replace("{count}", String(e.lines.length))}
                  </Text>
                  <Text style={[styles.amount, { color: colors.foreground }]}>{books.money(e.totalDebit)}</Text>
                </View>

                {isOpen && (
                  <View style={[styles.lines, { borderTopColor: colors.border }]}>
                    {e.lines.map((l, i) => (
                      <View key={i} style={[styles.line, { flexDirection: row }]}>
                        <Text style={[styles.lineName, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={2}>
                          {accountName(l.account, isRTL ? "ar" : "en")}
                          {l.projectName ? ` · ${l.projectName}` : ""}
                        </Text>
                        <Text style={[styles.lineNum, { color: colors.foreground }]}>
                          {l.debit ? books.money(l.debit) : ""}
                        </Text>
                        <Text style={[styles.lineNum, { color: colors.foreground }]}>
                          {l.credit ? books.money(l.credit) : ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            );
          }}
          ListFooterComponent={
            visible.length > 0 ? (
              <Text style={[styles.footnote, { color: colors.outline, textAlign: align }]}>{t.acc.postedOnly}</Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

function statusTone(status: EntryStatus): Tone {
  return status === "posted" ? "success" : status === "reversed" ? "destructive" : "warning";
}

const styles = StyleSheet.create({
  controls: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBox: { alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 44 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 10 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 6 },
  cardTop: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  ref: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  desc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 24 },
  metaRow: { alignItems: "center", gap: 10, flexWrap: "wrap" },
  meta: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  amount: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold", marginStart: "auto", fontVariant: ["tabular-nums"] },
  lines: { borderTopWidth: 1, paddingTop: 8, marginTop: 2, gap: 6 },
  line: { alignItems: "center", gap: 8 },
  lineName: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  lineNum: { width: 84, fontSize: 12, fontFamily: "Inter_500Medium", textAlign: "right", fontVariant: ["tabular-nums"] },  // ui-ok: numbers align on their units digit in both languages
  footnote: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 20, paddingVertical: 12 },
});
