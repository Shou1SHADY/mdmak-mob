import React, { useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useProject } from "@/hooks/useProjects";
import { useProjectSite, type IpcClaim } from "@/hooks/useProjectSite";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { markClaimCollected } from "@/lib/project-site-writes";
import { formatSarCompact } from "@/lib/crm-display";
import { db } from "@/lib/firebase";

/**
 * The claims (مستخلصات) this project has asked for, and the one thing a phone
 * should do with them: say the money arrived.
 *
 * Raising a claim is not here. A claim gathers every unclaimed measurement,
 * snapshots its lines against the bill, and applies the project's retention and
 * advance-recovery terms — a composition job with consequences, and one that
 * belongs at a desk. Marking one collected is the opposite: a single fact,
 * usually learned on the phone, from the bank.
 *
 * That single fact carries further than it looks. It writes the finance audit
 * log, and if the org keeps books it posts the collection to the ledger —
 * bank debited, the client's receivable cleared.
 */
export default function ProjectClaimsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { project } = useProject(id);
  const { claims, isLoading } = useProjectSite(id);
  const { can, isLoading: permsLoading } = useProjectPermissions(id);
  const [busy, setBusy] = useState<string | null>(null);

  const mayCollect = can("invoices.manage");

  const sorted = useMemo(
    () => [...claims].sort((a, b) => (b.claimNumber ?? 0) - (a.claimNumber ?? 0)),
    [claims]
  );

  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);

  const collect = (claim: IpcClaim) => {
    if (!user) return;
    Alert.alert(t.site.markCollected, t.site.claimNumber.replace("{number}", String(claim.claimNumber ?? "")), [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.site.markCollected,
        onPress: async () => {
          setBusy(claim.id);
          try {
            await markClaimCollected(
              db,
              id,
              { id: claim.id, claimNumber: claim.claimNumber, amount: claim.amount ?? 0 },
              project?.name ?? null,
              { uid: user.uid, name: user.displayName || user.email, organizationId: user.organizationId }
            );
            Alert.alert(t.site.collectedDone);
          } catch {
            Alert.alert(t.site.failed);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.site.claims} subtitle={project?.name ?? ""} showBack />

      {isLoading || permsLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
          renderItem={({ item }) => {
            const done = item.status === "collected";
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.cardTop, { flexDirection: row }]}>
                  <Text style={[styles.ref, { color: colors.foreground, textAlign: align }]} numberOfLines={1}>
                    {t.site.claimNumber.replace("{number}", String(item.claimNumber ?? "—"))}
                  </Text>
                  <StatusBadge
                    label={done ? t.site.collected : t.site.submitted}
                    tone={done ? "success" : "warning"}
                    size="sm"
                  />
                </View>

                {/* A manually entered claim has no breakdown — only its net.
                    Printing zeros for the parts it never had would be a lie. */}
                {item.totals ? (
                  <>
                    <Money label={t.site.gross} value={item.totals.gross} />
                    <Money label={t.site.retention} value={-item.totals.retention} />
                    {!!item.totals.advanceRecovery && <Money label={t.site.advance} value={-item.totals.advanceRecovery} />}
                    <Money label={t.site.vat} value={item.totals.vat} />
                  </>
                ) : item.description ? (
                  <Text style={[styles.by, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                <View style={[styles.netRow, { borderTopColor: colors.border, flexDirection: row }]}>
                  <Text style={[styles.netLabel, { color: colors.foreground, textAlign: align }]}>{t.site.net}</Text>
                  <Text style={[styles.netValue, { color: colors.foreground }]}>
                    {formatSarCompact(item.amount ?? 0, isRTL)}
                  </Text>
                </View>

                {!done && mayCollect && (
                  <Button
                    title={t.site.markCollected}
                    size="sm"
                    onPress={() => collect(item)}
                    loading={busy === item.id}
                    fullWidth
                  />
                )}
                {!done && !mayCollect && (
                  <Text style={[styles.note, { color: colors.outline, textAlign: align }]}>{t.site.cannotAct}</Text>
                )}
              </View>
            );
          }}
          ListEmptyComponent={<EmptyState icon="file-text" title={t.site.noClaims} subtitle={t.site.noClaimsHint} />}
          ListFooterComponent={
            sorted.length > 0 ? (
              <Text style={[styles.footnote, { color: colors.outline, textAlign: align }]}>{t.site.claimImmutable}</Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

function Money({ label, value }: { label: string; value: number }) {
  const colors = useColors();
  const { isRTL } = useLanguage();
  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);
  return (
    <View style={[styles.moneyRow, { flexDirection: row }]}>
      <Text style={[styles.moneyLabel, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.moneyValue, { color: colors.mutedForeground }]}>{formatSarCompact(value, isRTL)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 6 },
  cardTop: { alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 2 },
  ref: { flex: 1, fontSize: 14.5, fontFamily: "Inter_600SemiBold" },
  moneyRow: { alignItems: "center", justifyContent: "space-between", gap: 10 },
  moneyLabel: { flex: 1, fontSize: 12.5, fontFamily: "Inter_400Regular" },
  moneyValue: { fontSize: 12.5, fontFamily: "Inter_500Medium", fontVariant: ["tabular-nums"] },
  netRow: { alignItems: "center", justifyContent: "space-between", gap: 10, borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  netLabel: { flex: 1, fontSize: 13.5, fontFamily: "Inter_700Bold" },
  netValue: { fontSize: 14.5, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
  by: { fontSize: 11.5, fontFamily: "Inter_400Regular", marginTop: 2 },
  note: { fontSize: 11.5, fontFamily: "Inter_400Regular", marginTop: 4 },
  footnote: { fontSize: 11.5, fontFamily: "Inter_400Regular", lineHeight: 18, paddingVertical: 10 },
});
