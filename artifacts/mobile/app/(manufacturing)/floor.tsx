import React, { useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { labelFor } from "@/lib/labels";
import { useMfgWorld } from "@/hooks/useMfgWorld";
import { stationQueue } from "@/lib/manufacturing-view";
import { MfgActionSheet, type MfgActionTarget } from "@/components/mfg/MfgActionSheet";
import { actionForCandidate, severityTone } from "@/components/mfg/MfgBits";

/**
 * My station — the queue in front of the person holding the phone.
 *
 * `stationQueue` orders it the way the floor does: rush first, then late, then
 * by need date. Each row carries what the station has in hand and the one act
 * its lead can perform right now; a row that is blocked says which gate holds
 * it instead of offering a button that would be refused.
 *
 * Reporting a stop lives here rather than on an order, because hours are lost
 * by a station, not by a job.
 */
export default function MfgFloorScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const state = useMfgWorld();
  const [target, setTarget] = useState<MfgActionTarget | null>(null);

  const rows = useMemo(
    () =>
      state.persona
        ? stationQueue(state.world, state.stations, state.actor, state.departments, state.settings, state.persona)
        : [],
    [state.world, state.stations, state.actor, state.departments, state.settings, state.persona]
  );

  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);
  const stationName = (id: string) => state.departments.find((d) => d.id === id)?.name ?? id;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.mfg.floor}
        subtitle={state.stations.map(stationName).join(" · ") || t.mfg.title}
        showBack
        right={
          state.stations.length > 0 ? (
            <Button
              title={t.mfg.reportStop}
              size="sm"
              variant="secondary"
              onPress={() => setTarget({ kind: "stop", departmentId: state.stations[0] })}
            />
          ) : undefined
        }
      />

      {state.isLoading ? (
        <View style={{ paddingHorizontal: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => `${r.view.id}:${r.index}`}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
          renderItem={({ item }) => {
            const action = item.action ? actionForCandidate(item.action, item.view) : null;
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.cardTop, { flexDirection: row }]}>
                  <Text style={[styles.ref, { color: colors.foreground, textAlign: align }]} numberOfLines={1}>
                    {item.view.ref} · {item.view.product.name}
                  </Text>
                  <Text style={[styles.inHand, { color: colors.foreground }]}>
                    {item.inHand} {item.view.unit}
                  </Text>
                </View>
                <Text style={[styles.meta, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={1}>
                  {stationName(item.departmentId)}
                  {item.view.late ? ` · ${t.mfg.late.replace("{days}", String(item.view.lateDays))}` : ""}
                  {item.view.rush ? ` · ${t.mfg.rush}` : ""}
                  {item.view.neededBy ? ` · ${t.mfg.dueOn.replace("{date}", item.view.neededBy)}` : ""}
                </Text>

                {item.blocks.length > 0 && (
                  <View style={[styles.blocks, { flexDirection: row }]}>
                    {item.blocks.map((b) => (
                      <StatusBadge
                        key={b.key}
                        label={labelFor(t.mfg.blocks, b.key)}
                        tone={b.severity === "hard" ? "destructive" : "warning"}
                        size="sm"
                      />
                    ))}
                  </View>
                )}

                {action ? (
                  <Pressable accessibilityRole="button"
                    onPress={() => setTarget(action)}
                    style={[styles.action, { flexDirection: row, borderColor: colors.cta, backgroundColor: colors.ctaSoft }]}
                  >
                    <Text style={[styles.actionText, { color: colors.cta }]}>
                      {labelFor(t.mfg.candidates, item.action!.key)}
                    </Text>
                  </Pressable>
                ) : item.action ? (
                  <StatusBadge
                    label={labelFor(t.mfg.candidates, item.action.key)}
                    tone={severityTone(item.action.severity)}
                    size="sm"
                  />
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={
            state.stations.length === 0 ? (
              <EmptyState icon="user-x" title={t.mfg.noStations} subtitle={t.mfg.noStationsHint} />
            ) : (
              <EmptyState icon="check-circle" title={t.mfg.noQueue} subtitle={t.mfg.noQueueHint} />
            )
          }
        />
      )}

      <MfgActionSheet target={target} onClose={() => setTarget(null)} state={state} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 8 },
  cardTop: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  ref: { flex: 1, fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  inHand: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"] },
  meta: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  blocks: { gap: 6, flexWrap: "wrap" },
  action: { alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
  actionText: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
});
