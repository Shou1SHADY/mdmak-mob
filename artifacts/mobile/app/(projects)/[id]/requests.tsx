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
import { type Tone } from "@/lib/design";
import { useProject } from "@/hooks/useProjects";
import { useProjectSite, type PurchaseRequest } from "@/hooks/useProjectSite";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { decidePurchaseRequest } from "@/lib/project-site-writes";
import { db } from "@/lib/firebase";

/**
 * Purchase requests raised from this project, and the answer they are waiting
 * for.
 *
 * An approval is the classic thing a phone is for: someone on site needs
 * material, and the person who decides is rarely at a desk when asked. The
 * rules make the answer one-way — pending to approved or rejected, never back,
 * never edited — so the confirmation step here is not ceremony.
 *
 * Approving authorises the spend and nothing else. It moves no stock and raises
 * no tender; routing a need to the plant is a separate act, and one this
 * release leaves on the website.
 */
export default function ProjectRequestsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { project } = useProject(id);
  const { purchaseRequests, isLoading } = useProjectSite(id);
  const { can, isLoading: permsLoading } = useProjectPermissions(id);
  const [busy, setBusy] = useState<string | null>(null);

  const mayDecide = can("warehouses.manage");

  const sorted = useMemo(() => {
    const rank = (s: string) => (s === "pending" ? 0 : 1);
    return [...purchaseRequests].sort((a, b) => rank(a.status) - rank(b.status));
  }, [purchaseRequests]);

  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);

  const decide = (request: PurchaseRequest, decision: "approved" | "rejected") => {
    if (!user) return;
    Alert.alert(
      decision === "approved" ? t.site.approve : t.site.reject,
      request.title ?? "",
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: decision === "approved" ? t.site.approve : t.site.reject,
          style: decision === "rejected" ? "destructive" : "default",
          onPress: async () => {
            setBusy(request.id);
            try {
              await decidePurchaseRequest(db, id, request.id, decision, {
                uid: user.uid,
                name: user.displayName || user.email,
                organizationId: user.organizationId,
              });
              Alert.alert(t.site.decided);
            } catch {
              Alert.alert(t.site.failed);
            } finally {
              setBusy(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.site.requests} subtitle={project?.name ?? ""} showBack />

      {isLoading || permsLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
          renderItem={({ item }) => {
            const lines = item.items ?? [];
            const pending = item.status === "pending";
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.cardTop, { flexDirection: row }]}>
                  <Text style={[styles.ref, { color: colors.foreground, textAlign: align }]} numberOfLines={2}>
                    {item.title ?? ""}
                  </Text>
                  <StatusBadge label={statusLabel(t, item.status)} tone={statusTone(item.status)} size="sm" />
                </View>

                {lines.map((l, i) => (
                  <Text key={i} style={[styles.line, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={1}>
                    {l.name} · {l.quantity} {l.unit}
                  </Text>
                ))}

                {item.notes ? (
                  <Text style={[styles.note, { color: colors.outline, textAlign: align }]} numberOfLines={3}>
                    {item.notes}
                  </Text>
                ) : null}

                <View style={[styles.metaRow, { flexDirection: row }]}>
                  {item.requestedByUserName ? (
                    <Text style={[styles.by, { color: colors.outline }]} numberOfLines={1}>
                      {t.site.decidedBy.replace("{name}", item.requestedByUserName)}
                    </Text>
                  ) : null}
                  {item.mfgRequestId ? <StatusBadge label={t.site.routedToPlant} tone="purple" size="sm" /> : null}
                </View>

                {pending && mayDecide && (
                  <View style={[styles.actions, { flexDirection: row }]}>
                    <Button
                      title={t.site.reject}
                      size="sm"
                      variant="secondary"
                      onPress={() => decide(item, "rejected")}
                      loading={busy === item.id}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={t.site.approve}
                      size="sm"
                      onPress={() => decide(item, "approved")}
                      loading={busy === item.id}
                      style={{ flex: 1 }}
                    />
                  </View>
                )}
                {pending && !mayDecide && (
                  <Text style={[styles.note, { color: colors.outline, textAlign: align }]}>{t.site.cannotAct}</Text>
                )}
                {!pending && item.decidedByUserName ? (
                  <Text style={[styles.by, { color: colors.outline, textAlign: align }]} numberOfLines={1}>
                    {t.site.decidedBy.replace("{name}", item.decidedByUserName)}
                  </Text>
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={<EmptyState icon="inbox" title={t.site.noRequests} subtitle={t.site.noRequestsHint} />}
        />
      )}
    </View>
  );
}

function statusLabel(t: ReturnType<typeof useT>, status: string): string {
  return status === "approved" ? t.site.approved : status === "rejected" ? t.site.rejected : t.site.pending;
}

function statusTone(status: string): Tone {
  return status === "approved" ? "success" : status === "rejected" ? "destructive" : "warning";
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 6 },
  cardTop: { alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  ref: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 24 },
  line: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  note: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  metaRow: { alignItems: "center", gap: 8, flexWrap: "wrap" },
  by: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  actions: { gap: 10, marginTop: 4 },
});
