import React, { useMemo } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useProject } from "@/hooks/useProjects";
import { useProjectSite } from "@/hooks/useProjectSite";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Who is seated on this project.
 *
 * "Who is on site today" is a field question, so the roster is here. Seating
 * someone is not: a project seat REPLACES the member's usual group inside this
 * project rather than adding to it, in both directions — a member with broad
 * org rights can be seated here as a viewer, and one with almost none can be
 * seated as its manager. Getting that wrong quietly changes what somebody can
 * do, so the assignment stays on the website where the permission matrix is
 * visible next to it.
 *
 * A member with no seat is not missing; they simply work under their usual
 * group, which is what the empty state says.
 */
export default function ProjectTeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { project } = useProject(id);
  const { members, isLoading } = useProjectSite(id);
  const { groups } = usePermissions();

  const groupName = useMemo(() => {
    const map = new Map(groups.map((g) => [g.id, g.name]));
    return (groupId: string | null | undefined) => (groupId ? (map.get(groupId) ?? groupId) : null);
  }, [groups]);

  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.site.team} subtitle={project?.name ?? ""} showBack />

      {isLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
          renderItem={({ item }) => {
            const group = groupName(item.groupId);
            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.cardTop, { flexDirection: row }]}>
                  <Text style={[styles.name, { color: colors.foreground, textAlign: align }]} numberOfLines={1}>
                    {item.name || item.email || item.userId || item.id}
                  </Text>
                  {item.viaHandover && <StatusBadge label={t.site.viaHandover} tone="purple" size="sm" />}
                </View>
                <Text style={[styles.seat, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={1}>
                  {group ? t.site.seatedAs.replace("{group}", group) : t.site.defaultGroup}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={<EmptyState icon="users" title={t.site.noMembers} subtitle={t.site.noMembersHint} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 4 },
  cardTop: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { flex: 1, fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  seat: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
});
