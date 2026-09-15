import React, { useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, Modal, Pressable, Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
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
import { useOrgCollection } from "@/hooks/useOrgCollection";
import { db } from "@/lib/firebase";
import { labelFor } from "@/lib/labels";
import { siteUrl } from "@/lib/site-api";
import {
  QUOTE_DECLINE_REASONS,
  declineQuoteRequest,
  type QuoteDeclineReason,
  type QuoteRequest,
} from "@/lib/sales-transfers";

/**
 * The quote-request inbox — CRM's one door into Sales. Declining sends one of
 * the five factual reasons back (the mirrored write, notification included);
 * pricing opens the website's composer with the request pre-filled, because
 * a live A4 document is a desk job.
 */
export default function SalesRequestsScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { showToast } = useToast();
  const { items: requests, isLoading } = useOrgCollection<QuoteRequest>("salesQuoteRequests");

  const canQuote = can("sales.manage");
  const rolePrefix = user?.role === "Supplier" ? "/supplier" : "/contractor";
  const today = new Date().toLocaleDateString("en-CA");

  const [segment, setSegment] = useState<"new" | "answered">("new");
  const [declining, setDeclining] = useState<QuoteRequest | null>(null);
  const [reason, setReason] = useState<QuoteDeclineReason | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const list = requests.filter((r) => (segment === "new" ? r.status === "new" : r.status !== "new"));
    return list.sort((a, b) => {
      const aLate = a.dueDate && a.dueDate < today ? 0 : 1;
      const bLate = b.dueDate && b.dueDate < today ? 0 : 1;
      return aLate - bLate || (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
    });
  }, [requests, segment, today]);

  const submitDecline = async () => {
    if (!declining || !reason || !user || busy) return;
    setBusy(true);
    try {
      await declineQuoteRequest(db, {
        request: declining,
        reason,
        note,
        actor: { id: user.uid, name: user.displayName || user.email },
        notification: {
          title: isRTL ? "تعذّر تسعير طلبك" : "Your quote request could not be priced",
          message: (isRTL ? "أعادت المبيعات الطلب {number}: {reason}" : "Sales returned request {number}: {reason}")
            .replace("{number}", declining.requestNumber)
            .replace("{reason}", labelFor(t.sales.declineReasons, reason)),
        },
      });
      showToast(t.sales.declinedToast, "success");
      setDeclining(null);
    } catch {
      Alert.alert(t.common.error, t.sales.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.sales.requests} subtitle={t.sales.title} showBack />

      <View style={[styles.segments, { flexDirection: row }]}>
        {(["new", "answered"] as const).map((s) => (
          <Pressable
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
              {s === "new" ? t.sales.newRequests : t.sales.answeredRequests}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
          renderItem={({ item }) => {
            const late = !!item.dueDate && item.dueDate < today && item.status === "new";
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.cardTop, { flexDirection: row }]}>
                  <Text style={[styles.number, { color: colors.foreground, textAlign: align }]} numberOfLines={1}>
                    {item.requestNumber}
                  </Text>
                  <StatusBadge
                    label={labelFor(t.sales.requestStatuses, item.status)}
                    tone={item.status === "new" ? (late ? "destructive" : "cta") : item.status === "quoted" ? "success" : "neutral"}
                    size="sm"
                  />
                </View>
                <Text style={[styles.client, { color: colors.foreground, textAlign: align }]} numberOfLines={1}>
                  {item.contactName || "—"}
                </Text>
                <Text style={[styles.lines, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={2}>
                  {item.lines.map((l) => `${l.quantity} ${l.unit} ${l.name}`).join(" · ")}
                </Text>
                <Text style={[styles.meta, { color: late ? colors.destructive : colors.outline, textAlign: align }]}>
                  {t.sales.requestedBy.replace("{name}", item.requestedByUserName)}
                  {item.dueDate
                    ? " · " + (late ? t.sales.overdue : t.sales.dueBy).replace("{date}", item.dueDate)
                    : ""}
                </Text>
                {item.status === "new" && canQuote && (
                  <View style={[styles.actions, { flexDirection: row }]}>
                    <Button
                      title={t.sales.decline}
                      size="sm"
                      variant="secondary"
                      onPress={() => { setDeclining(item); setReason(null); setNote(""); }}
                    />
                    <Button
                      title={t.sales.priceOnWeb}
                      size="sm"
                      onPress={() =>
                        WebBrowser.openBrowserAsync(siteUrl(`${rolePrefix}/sales/quotations/new?request=${item.id}`))
                      }
                    />
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={<EmptyState icon="inbox" title={t.sales.noRequests} subtitle={t.sales.noRequestsHint} />}
        />
      )}

      <Modal visible={!!declining} transparent animationType="slide" onRequestClose={() => setDeclining(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => !busy && setDeclining(null)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ alignItems: "center", paddingBottom: 8 }}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground, textAlign: align }]}>
              {t.sales.declineTitle.replace("{number}", declining?.requestNumber ?? "")}
            </Text>
            <Text style={[styles.modalHint, { color: colors.mutedForeground, textAlign: align }]}>
              {t.sales.declineHint}
            </Text>
            {QUOTE_DECLINE_REASONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => setReason(r)}
                style={[
                  styles.reason,
                  {
                    borderColor: reason === r ? colors.cta : colors.border,
                    backgroundColor: reason === r ? colors.ctaSoft ?? colors.card : colors.card,
                  },
                ]}
              >
                <Text style={[styles.reasonText, { color: colors.foreground, textAlign: align }]}>
                  {labelFor(t.sales.declineReasons, r)}
                </Text>
              </Pressable>
            ))}
            <Input label={t.sales.note} value={note} onChangeText={setNote} isRTL={isRTL} />
            <Button
              title={t.sales.declineConfirm}
              onPress={submitDecline}
              loading={busy}
              disabled={!reason}
              fullWidth
              style={{ marginTop: 8 }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  segments: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 8 },
  segment: { flex: 1, minHeight: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  segmentText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 6 },
  cardTop: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  number: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  client: { fontSize: 14, fontFamily: "Inter_500Medium" },
  lines: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { gap: 8, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(11,26,43,0.45)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "88%", gap: 8 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  modalTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  modalHint: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 4 },
  reason: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, minHeight: 44, justifyContent: "center" },
  reasonText: { fontSize: 13.5, fontFamily: "Inter_500Medium" },
});
