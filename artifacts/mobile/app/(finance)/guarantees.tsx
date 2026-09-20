import React, { useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, Alert, Linking, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { formatDay } from "@/lib/time";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { Button } from "@/components/ui/Button";
import { useGuarantees } from "@/hooks/useOrgCollection";
import { usePermissions } from "@/hooks/usePermissions";
import { canAnswerGuarantee, reviewGuarantee } from "@/lib/guarantee-writes";
import { daysUntil } from "@/lib/crm-display";
import { labelFor } from "@/lib/labels";
import { db } from "@/lib/firebase";

type GuaranteeStatus = "none" | "pending_review" | "accepted" | "rejected";

interface Guarantee {
  id: string;
  status: GuaranteeStatus;
  hasGuarantee?: boolean;
  expirationDate?: string | null;
  rfqTitle?: string | null;
  supplierName?: string | null;
  itemName?: string | null;
  itemNameEn?: string | null;
  fileUrl?: string | null;
  contractorOrgId?: string;
  supplierOrgId?: string;
}

/**
 * Guarantees — spot the expiry, and give the answer.
 *
 * The list sorts on what a phone is best at noticing: an expiry before it
 * bites. It now also carries the contractor's decision, which was left off
 * earlier on the grounds that reviewing needs the file in hand. That was one
 * step too cautious — having the file open is the reviewer's option, not a
 * precondition, so the file is a tap away and the answer sits beside it.
 *
 * Only the contractor side of a guarantee may answer, and only with
 * `deliveries.confirm`, which is what the rules require. Submitting one stays
 * with the supplier on the website: it is a file upload with an expiry date,
 * not a decision.
 */
export default function GuaranteesScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { items, isLoading, orgId, error: loadError } = useGuarantees<Guarantee>();
  const { can } = usePermissions();
  const [busy, setBusy] = useState<string | null>(null);

  const mayReview = can("deliveries.confirm");

  const decide = (g: Guarantee, decision: "accepted" | "rejected") => {
    if (!user) return;
    Alert.alert(
      decision === "accepted" ? t.guarantee.confirmAccept : t.guarantee.confirmReject,
      decision === "accepted" ? t.guarantee.onceAccepted : undefined,
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: decision === "accepted" ? t.guarantee.accept : t.guarantee.reject,
          style: decision === "rejected" ? "destructive" : "default",
          onPress: async () => {
            setBusy(g.id);
            try {
              await reviewGuarantee(db, g.id, decision, user.uid);
              Alert.alert(t.guarantee.reviewDone);
            } catch {
              Alert.alert(t.guarantee.reviewFailed);
            } finally {
              setBusy(null);
            }
          },
        },
      ]
    );
  };

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        // Soonest expiry first; undated ones sink to the bottom.
        const da = daysUntil(a.expirationDate);
        const dbb = daysUntil(b.expirationDate);
        if (da === null && dbb === null) return 0;
        if (da === null) return 1;
        if (dbb === null) return -1;
        return da - dbb;
      }),
    [items]
  );

  const statusColor = (status: GuaranteeStatus): string => {
    switch (status) {
      case "accepted":
        return colors.success;
      case "rejected":
        return colors.destructive;
      case "pending_review":
        return colors.warning;
      default:
        return colors.mutedForeground;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.finance.guarantees} subtitle={t.finance.title} showBack />

      {isLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: tabScreenBottomPadding(insets.bottom),
          }}
          renderItem={({ item }) => {
            const tint = statusColor(item.status);
            const days = daysUntil(item.expirationDate);
            const expired = days !== null && days < 0;
            const expiring = days !== null && days >= 0 && days <= 30;
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text
                  style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={2}
                >
                  {item.rfqTitle || "—"}
                </Text>
                <Text
                  style={[styles.meta, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={1}
                >
                  {item.supplierName || "—"}
                </Text>
                <View style={[styles.metaRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.pill, { backgroundColor: tint + "18", borderColor: tint + "30" }]}>
                    <Text style={[styles.pillText, { color: tint }]}>
                      {labelFor(t.finance.guaranteeStatuses, item.status)}
                    </Text>
                  </View>
                  {item.expirationDate ? (
                    <Text
                      style={[
                        styles.expiry,
                        { color: expired ? colors.destructive : expiring ? colors.warning : colors.outline },
                      ]}
                    >
                      {expired ? t.guarantee.expired : `${t.finance.expires} ${formatDay(item.expirationDate, isRTL)}`}
                    </Text>
                  ) : null}
                </View>

                {item.fileUrl ? (
                  <Pressable
                    onPress={() => Linking.openURL(item.fileUrl as string).catch(() => {})}
                    accessibilityRole="link"
                    style={[styles.fileRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
                  >
                    <Feather name="paperclip" size={14} color={colors.cta} />
                    <Text style={[styles.fileText, { color: colors.cta }]}>{t.guarantee.openFile}</Text>
                  </Pressable>
                ) : null}

                {item.status === "pending_review" && item.contractorOrgId === orgId && (
                  canAnswerGuarantee(item, orgId, mayReview) ? (
                    <View style={[styles.actions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                      <Button
                        title={t.guarantee.reject}
                        size="sm"
                        variant="secondary"
                        onPress={() => decide(item, "rejected")}
                        loading={busy === item.id}
                        style={{ flex: 1 }}
                      />
                      <Button
                        title={t.guarantee.accept}
                        size="sm"
                        onPress={() => decide(item, "accepted")}
                        loading={busy === item.id}
                        style={{ flex: 1 }}
                      />
                    </View>
                  ) : (
                    <Text style={[styles.hint, { color: colors.outline, textAlign: isRTL ? "right" : "left" }]}>
                      {t.guarantee.cannotReview}
                    </Text>
                  )
                )}
              </View>
            );
          }}
          ListEmptyComponent={loadError ? (
              <EmptyState variant="error" icon="alert-circle" title={t.errors.loadFailed} subtitle={t.errors.loadFailedHint} />
            ) : (
              <EmptyState
              icon="shield"
              title={t.finance.noGuarantees}
              subtitle={t.finance.noGuaranteesHint}
            />
            )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 8, gap: 8 },
  title: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  metaRow: { alignItems: "center", gap: 8, marginTop: 4 },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  pillText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  expiry: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  fileRow: { alignItems: "center", gap: 6, marginTop: 2, minHeight: 32 },
  fileText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  actions: { gap: 10, marginTop: 6 },
  hint: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular", marginTop: 4 },
});
