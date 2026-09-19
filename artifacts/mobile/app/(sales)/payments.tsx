import React, { useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, Modal, Pressable, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/context/ToastContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DateField } from "@/components/ui/DateField";
import { useOrgCollection } from "@/hooks/useOrgCollection";
import { db } from "@/lib/firebase";
import { type Tone } from "@/lib/design";
import { labelFor } from "@/lib/labels";
import { formatSar, formatSarCompact } from "@/lib/crm-display";
import type { CrmQuotation } from "@/lib/crm";
import type { SalesOrder } from "@/lib/sales-orders";
import { collectInstallments, type InstallmentDue } from "@/lib/sales-installments";
import {
  answerTransferNotice,
  installmentNoticeState,
  loadPermissionRecipients,
  reportTransfer,
  reportableInstallments,
  validateTransferReport,
  type InstallmentNoticeState,
  type TransferNotice,
} from "@/lib/sales-transfers";

/**
 * The seller reports, Finance verifies — on a phone, where both moments
 * actually happen. Every state and every write is the website's, through the
 * mirrored sales-transfers layer: reporting creates the numbered notice and
 * nothing else; a confirmed answer records the payment on the quotation
 * through the same path the website uses (the accounting hook posts the
 * advance) and releases a deposit-gated order under the scoped rule.
 */
export default function SalesPaymentsScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { showToast } = useToast();

  const { items: quotations, isLoading: qLoading } = useOrgCollection<CrmQuotation>("crmQuotations");
  const { items: notices, isLoading: nLoading } = useOrgCollection<TransferNotice>("salesTransferNotices");
  const { items: orders } = useOrgCollection<SalesOrder>("salesOrders");
  const isLoading = qLoading || nLoading;

  const canReport = can("sales.manage") || can("sales.approve");
  const canAnswer = can("invoices.manage") || can("accounting.post") || can("sales.approve");

  const [segment, setSegment] = useState<"due" | "notices">("due");
  const [report, setReport] = useState<InstallmentDue | null>(null);
  const [answer, setAnswer] = useState<TransferNotice | null>(null);
  const [amount, setAmount] = useState("");
  const [transferDate, setTransferDate] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"report" | "confirmed" | "not_found" | null>(null);

  const { due } = useMemo(() => collectInstallments(quotations), [quotations]);
  const noticesOf = (quotationId: string) => notices.filter((n) => n.quotationId === quotationId);
  const orderOf = (quotationId: string) =>
    orders.find((o) => o.quotationId === quotationId) ?? null;

  /** Only the next unreported instalment carries the button (and any "not
   * found") — the website's PAY-05 rule, from the same mirrored function. */
  const reportable = (d: InstallmentDue): boolean => {
    if (!canReport) return false;
    const states = collectInstallments([d.quotation]).due.map((x) => x.installment);
    return reportableInstallments(states, noticesOf(d.quotation.id)).some((s) => s.id === d.installment.id);
  };

  const stateOf = (d: InstallmentDue): InstallmentNoticeState =>
    installmentNoticeState(d.installment, noticesOf(d.quotation.id));

  const stateTone: Record<InstallmentNoticeState, Tone> = {
    not_reported: "neutral",
    awaiting_finance: "cta",
    confirmed: "success",
    not_found: "destructive",
  };

  const openReport = (d: InstallmentDue) => {
    setReport(d);
    setAmount(String(d.installment.remaining));
    setTransferDate(new Date().toLocaleDateString("en-CA"));
    setBankRef("");
    setNote("");
  };

  const submitReport = async () => {
    if (!report || !user || busy) return;
    const parsed = parseFloat(amount);
    const error = validateTransferReport({
      amount: parsed,
      transferDate,
      today: new Date().toLocaleDateString("en-CA"),
    });
    if (error) {
      Alert.alert(t.common.error, error === "bad_amount" ? t.sales.errorAmount : t.sales.errorFutureDate);
      return;
    }
    setBusy("report");
    try {
      const recipients = await loadPermissionRecipients(db, user.organizationId, user.uid, ["invoices.manage"]);
      await reportTransfer(db, {
        quotation: {
          id: report.quotation.id,
          quotationNumber: report.quotation.quotationNumber,
          contactId: report.quotation.contactId,
          contactName: report.quotation.contactName ?? null,
          organizationId: user.organizationId,
        },
        order: orderOf(report.quotation.id),
        installment: { id: report.installment.id, label: report.installment.label },
        amountStated: parsed,
        transferDate,
        bankRef,
        note,
        actor: { id: user.uid, name: user.displayName || user.email },
        recipients,
        notification: {
          i18n: {
            title: "sales_tn_notif_reported_title",
            message: "sales_tn_notif_reported_msg",
            params: { contact: report.quotation.contactName || "—", amount: formatSar(parsed, false), number: report.quotation.quotationNumber },
          },
          title: isRTL ? "إشعار حوالة جديد" : "New transfer notice",  // ui-ok: fallback text for push; readers get i18n
          message: (isRTL
            ? "{contact} يقول إنه حوّل {amount} على {number} — تحقق من الإيداع وردّ بالنتيجة"  // ui-ok: fallback text for push; readers get i18n
            : "{contact} says they transferred {amount} on {number} — verify the deposit and answer"
          )
            .replace("{contact}", report.quotation.contactName || "—")
            .replace("{amount}", formatSar(parsed, isRTL))
            .replace("{number}", report.quotation.quotationNumber),
        },
      });
      showToast(t.sales.noticeSent, "success");
      setReport(null);
    } catch {
      Alert.alert(t.common.error, t.sales.saveFailed);
    } finally {
      setBusy(null);
    }
  };

  const submitAnswer = async (result: "confirmed" | "not_found") => {
    if (!answer || !user || busy) return;
    if (result === "not_found" && !message.trim()) {
      Alert.alert(t.common.error, t.sales.messageRequired);
      return;
    }
    setBusy(result);
    try {
      const quotation = quotations.find((q) => q.id === answer.quotationId) ?? null;
      await answerTransferNotice(db, {
        notice: answer,
        quotation,
        order: orderOf(answer.quotationId),
        result,
        message,
        actor: { id: user.uid, name: user.displayName || user.email },
        notification: {
          i18n: {
            title: result === "confirmed" ? "sales_tn_notif_confirmed_title" : "sales_tn_notif_not_found_title",
            message: result === "confirmed" ? "sales_tn_notif_confirmed_msg" : "sales_tn_notif_not_found_msg",
            params: { amount: formatSar(answer.amountStated, false), number: answer.quotationNumber },
          },
          title:
            result === "confirmed"
              ? isRTL ? "المالية أكّدت الإيداع" : "Finance confirmed the deposit"  // ui-ok: fallback text for push; readers get i18n
              : isRTL ? "المالية لم تجد الإيداع" : "Finance could not find the deposit",  // ui-ok: fallback text for push; readers get i18n
          message: (result === "confirmed"
            ? isRTL
              ? "أكّدت المالية إيداع {amount} على {number}"  // ui-ok: fallback text for push; readers get i18n
              : "Finance confirmed the {amount} deposit on {number}"
            : isRTL
              ? "لم تجد المالية حوالة {amount} على {number} — راجع العميل وأعد الإبلاغ"  // ui-ok: fallback text for push; readers get i18n
              : "Finance found no {amount} transfer on {number} — check with the client and report again"
          )
            .replace("{amount}", formatSar(answer.amountStated, isRTL))
            .replace("{number}", answer.quotationNumber),
        },
      });
      showToast(result === "confirmed" ? t.sales.confirmedToast : t.sales.notFoundToast, "success");
      setAnswer(null);
      setMessage("");
    } catch {
      Alert.alert(t.common.error, t.sales.saveFailed);
    } finally {
      setBusy(null);
    }
  };

  const sortedNotices = useMemo(
    () =>
      [...notices].sort(
        (a, b) =>
          (a.status === "reported" ? 0 : 1) - (b.status === "reported" ? 0 : 1) ||
          (b.reportedAt || "").localeCompare(a.reportedAt || "")
      ),
    [notices]
  );

  const label = (l: string) => l || t.sales.instalmentFull;
  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.sales.payments} subtitle={t.sales.title} showBack />

      <View style={[styles.segments, { flexDirection: row }]}>
        {(["due", "notices"] as const).map((s) => (
          <Pressable accessibilityRole="button"
            key={s}
            onPress={() => setSegment(s)}
            style={[
              styles.segment,
              {
                backgroundColor: segment === s ? colors.cta : colors.card,
                borderColor: segment === s ? colors.cta : colors.border,
              },
            ]}
          >
            <Text style={[styles.segmentText, { color: segment === s ? colors.ctaForeground : colors.mutedForeground }]}>
              {s === "due" ? t.sales.due : t.sales.notices}
              {"  "}
              {s === "due" ? due.length : notices.length}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : segment === "due" ? (
        <FlatList keyboardShouldPersistTaps="handled"
          data={due}
          keyExtractor={(d) => `${d.quotation.id}:${d.installment.id}`}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
          renderItem={({ item }) => {
            const state = stateOf(item);
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.cardTop, { flexDirection: row }]}>
                  <Text style={[styles.number, { color: colors.foreground, textAlign: align }]} numberOfLines={1}>
                    {item.quotation.quotationNumber}
                  </Text>
                  <Text style={[styles.amount, { color: colors.foreground }]}>
                    {formatSarCompact(item.installment.remaining, isRTL)}
                  </Text>
                </View>
                <Text style={[styles.client, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={1}>
                  {item.quotation.contactName || "—"} · {label(item.installment.label)} · {item.installment.percent}%
                </Text>
                <View style={[styles.metaRow, { flexDirection: row }]}>
                  {state !== "not_reported" && (
                    <StatusBadge label={labelFor(t.sales.tnStates, state)} tone={stateTone[state]} size="sm" />
                  )}
                  {reportable(item) && (
                    <Button title={t.sales.reportTransfer} size="sm" variant="secondary" onPress={() => openReport(item)} />
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<EmptyState icon="check-circle" title={t.sales.noDue} subtitle={t.sales.noticesHint} />}
        />
      ) : (
        <FlatList keyboardShouldPersistTaps="handled"
          data={sortedNotices}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.cardTop, { flexDirection: row }]}>
                <Text style={[styles.number, { color: colors.foreground, textAlign: align }]} numberOfLines={1}>
                  {item.noticeNumber} · {item.quotationNumber}
                </Text>
                <Text style={[styles.amount, { color: colors.foreground }]}>
                  {formatSarCompact(item.amountStated, isRTL)}
                </Text>
              </View>
              <Text style={[styles.client, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={1}>
                {item.contactName || "—"} · {label(item.installmentLabel)}
              </Text>
              <Text style={[styles.reportedLine, { color: colors.outline, textAlign: align }]}>
                {t.sales.reportedLine
                  .replace("{date}", (item.reportedAt || "").slice(0, 10))
                  .replace("{name}", item.createdByUserName)}
              </Text>
              {item.financeMessage ? (
                <Text style={[styles.financeMsg, { color: colors.destructive, textAlign: align }]}>
                  {item.financeMessage}
                </Text>
              ) : null}
              <View style={[styles.metaRow, { flexDirection: row }]}>
                <StatusBadge
                  label={labelFor(t.sales.noticeStatuses, item.status)}
                  tone={item.status === "confirmed" ? "success" : item.status === "not_found" ? "destructive" : "cta"}
                  size="sm"
                />
                {item.status === "reported" && canAnswer && (
                  <Button title={t.sales.verifyAnswer} size="sm" variant="secondary" onPress={() => { setAnswer(item); setMessage(""); }} />
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={<EmptyState icon="inbox" title={t.sales.noNotices} subtitle={t.sales.noticesHint} />}
        />
      )}

      {/* ── Report a transfer ── */}
      <Modal visible={!!report} transparent animationType="slide" onRequestClose={() => setReport(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable accessible={false} style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => !busy && setReport(null)}>
            <Pressable accessible={false}
              style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={{ alignItems: "center", paddingBottom: 8 }}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text style={[styles.modalTitle, { color: colors.foreground, textAlign: align }]}>
                  {t.sales.reportTransferTitle}
                </Text>
                <Text style={[styles.modalHint, { color: colors.mutedForeground, textAlign: align }]}>
                  {report?.quotation.quotationNumber} · {report?.quotation.contactName || "—"} —{" "}
                  {t.sales.reportTransferHint}
                </Text>
                <Input
                  label={t.sales.amountStated}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  isRTL={isRTL}
                />
                {report && parseFloat(amount) > 0 && Math.abs(parseFloat(amount) - report.installment.remaining) > 0.005 && (
                  <Text style={[styles.mismatch, { color: colors.warning, textAlign: align }]}>
                    {t.sales.amountMismatch.replace("{amount}", formatSar(report.installment.remaining, isRTL))}
                  </Text>
                )}
                <DateField label={t.sales.transferDate} value={transferDate} onChange={setTransferDate} isRTL={isRTL} />
                <Input label={t.sales.bankRef} value={bankRef} onChangeText={setBankRef} isRTL={isRTL} />
                <Input label={t.sales.note} value={note} onChangeText={setNote} isRTL={isRTL} />
                <Button
                  title={t.sales.sendNotice}
                  onPress={submitReport}
                  loading={busy === "report"}
                  fullWidth
                  style={{ marginTop: 12 }}
                />
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Finance answers ── */}
      <Modal visible={!!answer} transparent animationType="slide" onRequestClose={() => setAnswer(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable accessible={false} style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => !busy && setAnswer(null)}>
            <Pressable accessible={false}
              style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={{ alignItems: "center", paddingBottom: 8 }}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.foreground, textAlign: align }]}>
                {t.sales.answerTitle.replace("{number}", answer?.noticeNumber ?? "")}
              </Text>
              <Text style={[styles.modalHint, { color: colors.mutedForeground, textAlign: align }]}>
                {answer?.contactName || "—"} · {formatSar(answer?.amountStated ?? 0, isRTL)} ·{" "}
                {(answer?.transferDate || "").slice(0, 10)}
                {answer?.bankRef ? ` · ${answer.bankRef}` : ""}
                {"\n"}
                {t.sales.answerHint}
              </Text>
              <Input label={t.sales.financeMessage} value={message} onChangeText={setMessage} isRTL={isRTL} />
              <View style={[styles.answerRow, { flexDirection: row }]}>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t.sales.notFound}
                    variant="secondary"
                    loading={busy === "not_found"}
                    onPress={() => submitAnswer("not_found")}
                    fullWidth
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title={t.sales.confirmDeposit}
                    loading={busy === "confirmed"}
                    onPress={() => submitAnswer("confirmed")}
                    fullWidth
                  />
                </View>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  segments: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  segment: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  segmentText: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 6 },
  cardTop: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  number: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  amount: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"] },
  client: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular" },
  reportedLine: { fontSize: 12, fontFamily: "Inter_400Regular" },
  financeMsg: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_500Medium" },
  metaRow: { alignItems: "center", gap: 8, flexWrap: "wrap" },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "88%", gap: 10 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  modalHint: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 24, marginBottom: 8 },
  mismatch: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_500Medium", marginBottom: 6 },
  answerRow: { gap: 10, marginTop: 12 },
});
