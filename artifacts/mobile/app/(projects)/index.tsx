import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { Input } from "@/components/ui/Input";
import { CrmSheet } from "@/components/crm/CrmSheet";
import { CrmChoice } from "@/components/crm/CrmChoice";
import { useProjects, type Project } from "@/hooks/useProjects";
import { createProject } from "@/lib/project-writes";
import { PROJECT_STATUSES, resolveProjectStatus, type ProjectStatus } from "@/lib/project-status";
import { formatSarCompact } from "@/lib/crm-display";
import { projectStatusColor } from "@/lib/project-display";

export default function ProjectsListScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { projects, orgId, isLoading } = useProjects();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("todo");

  const canCreate = can("projects.edit");

  const counts = useMemo(() => {
    const map = new Map<ProjectStatus | "all", number>();
    map.set("all", projects.length);
    for (const s of PROJECT_STATUSES) {
      map.set(s, projects.filter((p) => resolveProjectStatus(p.status as string) === s).length);
    }
    return map;
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects
      .filter((p) =>
        statusFilter === "all" ? true : resolveProjectStatus(p.status as string) === statusFilter
      )
      .filter((p) => {
        if (!q) return true;
        return (
          p.name?.toLowerCase().includes(q) ||
          p.clientName?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [projects, search, statusFilter]);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert(t.common.error, t.projects.nameRequired);
      return;
    }
    if (!orgId || !user) return;
    setSaving(true);
    try {
      const parsed = parseFloat(budget.replace(/,/g, ""));
      const id = await createProject({
        orgId,
        uid: user.uid,
        name,
        clientName: clientName || null,
        location: location || null,
        budget: Number.isFinite(parsed) ? Math.max(0, parsed) : null,
        status,
      });
      setSheetOpen(false);
      setName("");
      setClientName("");
      setLocation("");
      setBudget("");
      setStatus("todo");
      router.push(`/(projects)/${id}` as never);
    } catch (e: any) {
      console.warn("[Projects] create:", e?.message);
      Alert.alert(t.common.error, t.projects.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const chips: { value: ProjectStatus | "all"; label: string }[] = [
    { value: "all", label: t.common.all },
    ...PROJECT_STATUSES.map((s) => ({ value: s as ProjectStatus | "all", label: t.projects.statuses[s] })),
  ];

  const renderProject = ({ item }: { item: Project }) => {
    const resolved = resolveProjectStatus(item.status as string);
    const tint = projectStatusColor(resolved, colors);
    const tenderCount = item.rfqIds?.length ?? 0;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/(projects)/${item.id}` as never)}
        activeOpacity={0.8}
        accessibilityRole="button"
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            flexDirection: isRTL ? "row-reverse" : "row",
          },
        ]}
      >
        <View style={[styles.statusBar, { backgroundColor: tint }]} />
        <View style={styles.cardBody}>
          <View style={[styles.cardTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text
              style={[styles.name, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            {item.budget != null && (
              <Text style={[styles.budget, { color: colors.foreground }]}>
                {formatSarCompact(item.budget, isRTL)}
              </Text>
            )}
          </View>

          <Text
            style={[styles.meta, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
            numberOfLines={1}
          >
            {[item.clientName, item.location].filter(Boolean).join(" · ") || "—"}
          </Text>

          <View style={[styles.cardMeta, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.pill, { backgroundColor: tint + "18", borderColor: tint + "30" }]}>
              <Text style={[styles.pillText, { color: tint }]}>{t.projects.statuses[resolved]}</Text>
            </View>
            {tenderCount > 0 && (
              <View style={[styles.pill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Text style={[styles.pillText, { color: colors.mutedForeground }]}>
                  {tenderCount} {t.projects.tenders}
                </Text>
              </View>
            )}
            {item.handover?.status === "pending" && (
              <Feather name="clock" size={13} color={colors.warning} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.projects.title}
        showBack
        right={
          canCreate ? (
            <TouchableOpacity
              onPress={() => setSheetOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t.projects.newProject}
              style={[styles.addBtn, { backgroundColor: colors.cta }]}
            >
              <Feather name="plus" size={20} color={colors.ctaForeground} />
            </TouchableOpacity>
          ) : undefined
        }
      />

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
            placeholder={t.projects.searchProjects}
            placeholderTextColor={colors.outline}
            style={[styles.searchInput, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
        >
          {chips.map((chip) => {
            const active = statusFilter === chip.value;
            const count = counts.get(chip.value) ?? 0;
            if (count === 0 && chip.value !== "all" && !active) return null;
            return (
              <TouchableOpacity
                key={chip.value}
                onPress={() => setStatusFilter(chip.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.cta : colors.card,
                    borderColor: active ? colors.cta : colors.border,
                    flexDirection: isRTL ? "row-reverse" : "row",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? colors.ctaForeground : colors.mutedForeground },
                  ]}
                >
                  {chip.label}
                </Text>
                <Text
                  style={[styles.filterCount, { color: active ? colors.ctaForeground : colors.outline }]}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderProject}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: (insets.bottom || 0) + 96,
          }}
          ListEmptyComponent={
            <EmptyState
              icon="folder"
              title={t.projects.noProjects}
              subtitle={t.projects.noProjectsHint}
              actionLabel={canCreate ? t.projects.newProject : undefined}
              onAction={canCreate ? () => setSheetOpen(true) : undefined}
            />
          }
        />
      )}

      <CrmSheet
        visible={sheetOpen}
        title={t.projects.newProject}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleCreate}
        submitLabel={t.common.save}
        submitting={saving}
      >
        <Input label={t.projects.title} value={name} onChangeText={setName} required isRTL={isRTL} />
        <Input label={t.projects.client} value={clientName} onChangeText={setClientName} isRTL={isRTL} />
        <Input label={t.projects.location} value={location} onChangeText={setLocation} isRTL={isRTL} />
        <Input
          label={t.projects.budget}
          value={budget}
          onChangeText={setBudget}
          keyboardType="numeric"
          isRTL={isRTL}
        />
        <CrmChoice
          label={t.projects.changeStatus}
          options={PROJECT_STATUSES.map((s) => ({ value: s, label: t.projects.statuses[s] }))}
          value={status}
          onChange={setStatus}
          scroll
          required
        />
      </CrmSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  controls: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  searchBox: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  chipRow: { gap: 8, paddingBottom: 10 },
  filterChip: {
    alignItems: "center",
    gap: 6,
    // 44px minimum touch target, per the project accessibility rule.
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  filterCount: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  card: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: "hidden", flexDirection: "row" },
  statusBar: { width: 4 },
  cardBody: { flex: 1, padding: 14, gap: 6 },
  cardTop: { alignItems: "flex-start", gap: 10 },
  name: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 24 },
  budget: { fontSize: 13, lineHeight: 21, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardMeta: { alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  pillText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
