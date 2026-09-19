import React, { useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, StyleSheet, Alert } from "react-native";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { type Tone } from "@/lib/design";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { StatsCard } from "@/components/StatsCard";
import { useOrgCollection } from "@/hooks/useOrgCollection";
import {
  calculateGrandTotal,
  calculateInvoiceTotal,
  resolveInvoiceStatus,
  type InvoiceItem,
  type InvoiceStatus,
} from "@/lib/invoice-utils";
import { labelFor } from "@/lib/labels";
import { formatSarCompact } from "@/lib/crm-display";

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientName?: string;
  issueDate?: string;
  dueDate?: string;
  items?: InvoiceItem[];
  vatPercent?: number;
  organizationId: string;
}

/**
 * Invoices. One write — marking an invoice paid, the website's
 * handleStatusChange(inv, "paid") — behind `invoices.manage`; drafting and
 * editing an invoice stay on the desktop.
 *
 * Totals are computed with the mirrored `invoice-utils` — the same VAT rounding
 * the website applies — rather than a local sum, so a figure read on a phone can
 * be quoted against one read on a desktop.
 *
 * `resolveInvoiceStatus` is what decides "overdue": the stored status stays
 * whatever was saved, and the due date promotes it at read time. That is the
 * website's behaviour, and recomputing it the same way here keeps a phone from
 * calling an invoice current that the website is already chasing.
 */
export default function InvoicesScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { items: invoices, isLoading } = useOrgCollection<Invoice>("invoices");
  const { can } = usePermissions();
  const { showToast } = useToast();
  const canManage = can("invoices.manage");

  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const markPaid = (inv: Invoice) => {
    if (!canManage) { Alert.alert(t.errors.noPermissionTitle, t.errors.noPermission); return; }
    Alert.alert(t.finance.markPaid, t.finance.markPaidConfirm.replace("{number}", inv.invoiceNumber), [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.finance.markPaid,
        onPress: async () => {
          setBusyId(inv.id);
          try {
            // The website's write, field for field.
            await updateDoc(doc(db, "invoices", inv.id), { status: "paid", updatedAt: serverTimestamp() });
            showToast(t.finance.markedPaid, "success");
          } catch {
            Alert.alert(t.common.error, t.finance.saveFailed);
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const withTotals = useMemo(
    () =>
      invoices.map((inv) => {
        const net = calculateInvoiceTotal(inv.items ?? []);
        const grand = calculateGrandTotal(net, inv.vatPercent ?? 15);
        const status = resolveInvoiceStatus(inv.dueDate ?? "", inv.status ?? "draft");
        return { ...inv, grand, status };
      }),
    [invoices]
  );

  const summary = useMemo(() => {
    let total = 0;
    let outstanding = 0;
    let overdue = 0;
    for (const inv of withTotals) {
      total += inv.grand;
      if (inv.status !== "paid") outstanding += inv.grand;
      if (inv.status === "overdue") overdue += inv.grand;
    }
    return { total, outstanding, overdue };
  }, [withTotals]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withTotals
      .filter((inv) =>
        q
          ? inv.invoiceNumber?.toLowerCase().includes(q) ||
            inv.clientName?.toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => (b.issueDate ?? "").localeCompare(a.issueDate ?? ""));
  }, [withTotals, search]);

  const statusTone = (status: InvoiceStatus): Tone =>
    status === "paid" ? "success" : status === "overdue" ? "destructive" : status === "sent" ? "cta" : "neutral";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.finance.invoices} subtitle={t.finance.title} showBack />

      <View style={styles.controls}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <Feather name="search" size={16} color={colors.outline} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.finance.searchInvoices}
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
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: tabScreenBottomPadding(insets.bottom),
          }}
          ListHeaderComponent={
            invoices.length > 0 ? (
              <View style={[styles.statRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={{ flex: 1 }}>
                  <StatsCard
                    title={t.finance.outstanding}
                    value={formatSarCompact(summary.outstanding, isRTL)}
                    icon="clock"
                    tone="warning"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <StatsCard
                    title={t.finance.overdue}
                    value={formatSarCompact(summary.overdue, isRTL)}
                    icon="alert-circle"
                    tone="destructive"
                  />
                </View>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const payable = canManage && (item.status === "sent" || item.status === "overdue");
            return (
              <View
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.cardTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text
                    style={[styles.number, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                    numberOfLines={1}
                  >
                    {item.invoiceNumber}
                  </Text>
                  <Text style={[styles.amount, { color: colors.foreground }]}>
                    {formatSarCompact(item.grand, isRTL)}
                  </Text>
                </View>
                <Text
                  style={[styles.client, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={1}
                >
                  {item.clientName || "—"}
                </Text>
                <View style={[styles.metaRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <StatusBadge label={labelFor(t.finance.invoiceStatuses, item.status)} tone={statusTone(item.status)} size="sm" />
                  {item.dueDate ? (
                    <Text style={[styles.due, { color: colors.outline }]}>
                      {t.finance.dueDate} {item.dueDate}
                    </Text>
                  ) : null}
                </View>
                {payable && (
                  <View style={[styles.actions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Button
                      title={t.finance.markPaid}
                      size="sm"
                      variant="secondary"
                      loading={busyId === item.id}
                      onPress={() => markPaid(item)}
                    />
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="file-text"
              title={t.finance.noInvoices}
              subtitle={t.finance.noInvoicesHint}
            />
          }
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
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  statRow: { gap: 12, marginBottom: 12 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 8, gap: 8 },
  cardTop: { alignItems: "center", gap: 8 },
  number: { flex: 1, fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
  amount: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  client: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  metaRow: { alignItems: "center", gap: 8, marginTop: 4 },
  actions: { gap: 8, marginTop: 4 },
  due: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
});
