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
import { type Tone } from "@/lib/design";
import { labelFor } from "@/lib/labels";
import { useMfgWorld } from "@/hooks/useMfgWorld";
import { groupDecisions, type DecisionItem } from "@/lib/manufacturing-view";
import { MfgActionSheet, type MfgActionTarget } from "@/components/mfg/MfgActionSheet";
import { actionForCandidate, severityTone } from "@/components/mfg/MfgBits";

/**
 * Today — what is waiting on the person holding the phone.
 *
 * The list is the engine's: `buildDecisions` answers for the chosen persona,
 * and only candidates `ownsCandidate` accepts appear. A lead sees their
 * stations, Quality sees rejects and releases, and neither sees the other's
 * work. The persona switcher exists because one person often wears two hats —
 * the same switcher the website shows.
 *
 * Rows whose act belongs at a desk (releasing an order, closing production,
 * issuing a note) are shown but not tappable: knowing it is waiting is the
 * useful half on a phone, and doing it needs a screen this release does not
 * carry.
 */
export default function MfgTodayScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const state = useMfgWorld();
  const [target, setTarget] = useState<MfgActionTarget | null>(null);

  const groups = useMemo(() => groupDecisions(state.decisions), [state.decisions]);
  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);

  const labelOf = (item: DecisionItem): string => {
    if (item.kind === "order") return labelFor(t.mfg.candidates, item.candidate.key);
    if (item.kind === "request") return t.mfg.candidates.request_materials;
    if (item.kind === "variance") return t.mfg.candidates.scrap_review;
    return t.mfg.candidates.close;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.mfg.today} subtitle={t.mfg.title} showBack />

      {state.personas.length > 1 && (
        <View style={[styles.personas, { flexDirection: row }]}>
          {state.personas.map((p) => (
            <Pressable
              key={p}
              onPress={() => state.setPersona(p)}
              style={[
                styles.persona,
                {
                  backgroundColor: state.persona === p ? colors.cta : colors.card,
                  borderColor: state.persona === p ? colors.cta : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.personaText,
                  { color: state.persona === p ? colors.ctaForeground : colors.mutedForeground },
                ]}
              >
                {labelFor(t.mfg.personas, p)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {state.isLoading ? (
        <View style={{ paddingHorizontal: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g, i) => (g.kind === "order" ? `o:${g.view.id}` : `s:${i}`)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
          renderItem={({ item: group }) => {
            if (group.kind === "solo") {
              return (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.foreground, textAlign: align }]}>
                    {labelOf(group.item)}
                  </Text>
                </View>
              );
            }
            const v = group.view;
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.cardTop, { flexDirection: row }]}>
                  <Text style={[styles.ref, { color: colors.foreground, textAlign: align }]} numberOfLines={1}>
                    {v.ref} · {v.product.name}
                  </Text>
                  <StatusBadge label={labelFor(t.mfg.stages, v.stage)} tone={stageTone(v.stage)} size="sm" />
                </View>
                <Text style={[styles.meta, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={1}>
                  {v.quantity} {v.unit} · {v.sourceName}
                  {v.late ? ` · ${t.mfg.late.replace("{days}", String(v.lateDays))}` : ""}
                  {v.rush ? ` · ${t.mfg.rush}` : ""}
                </Text>
                {group.items.map((item, i) => {
                  const action = actionForCandidate(item.candidate, v);
                  const label = labelFor(t.mfg.candidates, item.candidate.key);
                  const tone = severityTone(item.severity);
                  return action ? (
                    <Pressable
                      key={i}
                      onPress={() => setTarget(action)}
                      style={[styles.action, { flexDirection: row, borderColor: colors.cta, backgroundColor: colors.ctaSoft }]}
                    >
                      <Text style={[styles.actionText, { color: colors.cta, textAlign: align }]}>{label}</Text>
                    </Pressable>
                  ) : (
                    <View key={i} style={[styles.waiting, { flexDirection: row }]}>
                      <StatusBadge label={label} tone={tone} size="sm" />
                    </View>
                  );
                })}
              </View>
            );
          }}
          ListEmptyComponent={
            state.outsider ? (
              <EmptyState icon="lock" title={t.mfg.noRole} subtitle={t.mfg.noRoleHint} />
            ) : (
              <EmptyState icon="check-circle" title={t.mfg.noDecisions} subtitle={t.mfg.noDecisionsHint} />
            )
          }
        />
      )}

      <MfgActionSheet target={target} onClose={() => setTarget(null)} state={state} />
    </View>
  );
}

function stageTone(stage: string): Tone {
  if (stage === "done" || stage === "ready") return "success";
  if (stage === "cancel") return "destructive";
  if (stage === "pay" || stage === "wait") return "warning";
  return "cta";
}

const styles = StyleSheet.create({
  personas: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8, flexWrap: "wrap" },
  persona: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, minHeight: 40, justifyContent: "center" },
  personaText: { fontSize: 12.5, fontFamily: "Inter_600SemiBold" },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 8 },
  cardTop: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  ref: { flex: 1, fontSize: 14.5, fontFamily: "Inter_600SemiBold" },
  cardTitle: { fontSize: 14, fontFamily: "Inter_500Medium" },
  meta: { fontSize: 12.5, fontFamily: "Inter_400Regular" },
  action: { alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, minHeight: 44 },
  actionText: { fontSize: 13.5, fontFamily: "Inter_600SemiBold" },
  waiting: { alignItems: "center", gap: 8 },
});
