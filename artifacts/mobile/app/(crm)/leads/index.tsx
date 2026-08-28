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
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { Input } from "@/components/ui/Input";
import { CrmSheet } from "@/components/crm/CrmSheet";
import { CrmChoice } from "@/components/crm/CrmChoice";
import { useCrmData } from "@/hooks/useCrmData";
import { createContact } from "@/lib/crm-writes";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  OPEN_LEAD_STATUSES,
  type CrmContact,
  type LeadSource,
  type LeadStatus,
} from "@/lib/crm";
import { labelFor } from "@/lib/labels";
import { leadStatusColor, tierColor } from "@/lib/crm-display";

type StatusFilter = LeadStatus | "all" | "open";

export default function CrmLeadsScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { contacts, orgId, isLoading } = useCrmData();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<LeadStatus>("new");
  const [source, setSource] = useState<LeadSource | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts
      .filter((c) => {
        if (statusFilter === "open") return OPEN_LEAD_STATUSES.includes(c.status ?? "new");
        if (statusFilter !== "all") return (c.status ?? "new") === statusFilter;
        return true;
      })
      .filter((c) => {
        if (!q) return true;
        return (
          c.name?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.city?.toLowerCase().includes(q) ||
          c.phone?.includes(q)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, search, statusFilter]);

  const resetForm = () => {
    setName("");
    setCompany("");
    setPhone("");
    setCity("");
    setStatus("new");
    setSource(null);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert(t.common.error, t.crm.nameRequired);
      return;
    }
    if (!orgId) return;
    setSaving(true);
    try {
      const id = await createContact({
        orgId,
        name,
        company: company || null,
        phone: phone || null,
        city: city || null,
        status,
        source,
        // The creating member owns the lead until it is reassigned on the web.
        ownerId: user?.uid ?? null,
        ownerName: user?.displayName ?? null,
      });
      setSheetOpen(false);
      resetForm();
      router.push(`/(crm)/leads/${id}` as never);
    } catch (e: any) {
      console.warn("[CrmLeads] create:", e?.message);
      Alert.alert(t.common.error, t.crm.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const statusChips: { value: StatusFilter; label: string }[] = [
    { value: "open", label: t.crm.openDeals },
    { value: "all", label: t.common.all },
    ...LEAD_STATUSES.map((s) => ({ value: s as StatusFilter, label: t.crm.leadStatuses[s] })),
  ];

  const renderLead = ({ item }: { item: CrmContact }) => {
    const tint = leadStatusColor(item.status, colors);
    return (
      <TouchableOpacity
        onPress={() => router.push(`/(crm)/leads/${item.id}` as never)}
        activeOpacity={0.8}
        accessibilityRole="button"
        style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={[styles.rowTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.dot, { backgroundColor: tint }]} />
          <Text
            style={[styles.name, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: tint + "18", borderColor: tint + "30" }]}>
            <Text style={[styles.statusText, { color: tint }]}>
              {labelFor(t.crm.leadStatuses, item.status ?? "new")}
            </Text>
          </View>
        </View>
        <View style={[styles.rowMeta, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Text
            style={[styles.meta, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
            numberOfLines={1}
          >
            {[item.company, item.city].filter(Boolean).join(" · ") || "—"}
          </Text>
          {item.tier && (
            <Text style={[styles.tier, { color: tierColor(item.tier, colors) }]}>
              {t.crm.tier} {item.tier}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.crm.leads}
        subtitle={t.crm.title}
        showBack
        right={
          <TouchableOpacity
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t.crm.newLead}
            style={[styles.addBtn, { backgroundColor: colors.cta }]}
          >
            <Feather name="plus" size={20} color={colors.ctaForeground} />
          </TouchableOpacity>
        }
      />

      <View style={styles.controls}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <Feather name="search" size={16} color={colors.outline} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.crm.searchLeads}
            placeholderTextColor={colors.outline}
            style={[styles.searchInput, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
          />
        </View>
        <ScrollView
          horizontal
          // Hug the content: a horizontal scroller left to flex would stretch
          // to the parent's height and stretch its chips with it.
          style={{ flexGrow: 0, flexShrink: 0 }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
        >
          {statusChips.map((chip) => {
            const active = statusFilter === chip.value;
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
          renderItem={renderLead}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: tabScreenBottomPadding(insets.bottom),
          }}
          ListEmptyComponent={
            <EmptyState
              icon="user-plus"
              title={t.crm.noLeads}
              subtitle={t.crm.noLeadsHint}
              actionLabel={t.crm.newLead}
              onAction={() => setSheetOpen(true)}
            />
          }
        />
      )}

      <CrmSheet
        visible={sheetOpen}
        title={t.crm.newLead}
        onClose={() => setSheetOpen(false)}
        onSubmit={handleCreate}
        submitLabel={t.common.save}
        submitting={saving}
      >
        <Input label={t.crm.selectContact} value={name} onChangeText={setName} required isRTL={isRTL} />
        <Input label={t.profile.companyName} value={company} onChangeText={setCompany} isRTL={isRTL} />
        <Input
          label={t.profile.phone}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          isRTL={isRTL}
        />
        <Input label={t.profile.city} value={city} onChangeText={setCity} isRTL={isRTL} />
        <CrmChoice
          label={t.crm.status}
          options={LEAD_STATUSES.map((s) => ({ value: s, label: t.crm.leadStatuses[s] }))}
          value={status}
          onChange={setStatus}
          required
        />
        <CrmChoice
          label={`${t.crm.source} (${t.crm.optional})`}
          options={LEAD_SOURCES.map((s) => ({ value: s, label: t.crm.sources[s] }))}
          value={source}
          onChange={setSource}
          scroll
        />
      </CrmSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  controls: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  searchBox: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  chipRow: { alignItems: "center", gap: 8, paddingBottom: 8, paddingHorizontal: 4 },
  filterChip: {
    // 44px minimum touch target, per the project accessibility rule.
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  row: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 8, gap: 8 },
  rowTop: { alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { flex: 1, fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  rowMeta: { alignItems: "center", justifyContent: "space-between", gap: 8 },
  meta: { flex: 1, fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  tier: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
});
