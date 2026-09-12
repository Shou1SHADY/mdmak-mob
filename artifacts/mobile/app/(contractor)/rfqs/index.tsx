import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { tabScreenBottomPadding } from "@/lib/layout";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { RFQCard, RFQItem } from "@/components/RFQCard";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { RFQ_STATUSES, CATEGORIES, SAUDI_CITIES, displayCity, displayCategory, statusTone } from "@/constants/data";
import { ScreenHeader } from "@/components/ScreenHeader";
import { FilterSheet, FilterButton, FilterPill, type FilterSection } from "@/components/FilterSheet";
import { type, space, radius, toneColors, HIT_SLOP, type Tone } from "@/lib/design";

// The sheet's draft, keyed by section. "all" / "" are the no-filter values the
// screen has always used for status and for category/city respectively.
type FilterDraft = { status: string; category: string; city: string };
const NO_FILTERS: FilterDraft = { status: "all", category: "", city: "" };

export default function MyRFQsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const t = useT();
  const { isRTL } = useLanguage();
  const rowDirection = isRTL ? "row-reverse" : "row";
  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [filtered, setFiltered] = useState<RFQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(NO_FILTERS);

  const stats = {
    total: rfqs.length,
    active: rfqs.filter((r) => r.status === "New" || r.status === "Active" || r.status === "Under Review").length,
    closed: rfqs.filter((r) => r.status === "Closed").length,
  };

  const statusCounts: Record<string, number> = { all: rfqs.length };
  RFQ_STATUSES.forEach((s) => {
    statusCounts[s.id] = rfqs.filter((r) => r.status === s.id).length;
  });

  const fetchRFQs = async () => {
    const orgId = user?.organizationId;
    if (!orgId) { setLoading(false); return; }
    setFetchError(null);
    try {
      const q = query(
        collection(db, "rfqs"),
        where("organizationId", "==", orgId),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RFQItem));
      setRfqs(items);
      applyFilters(items, search, statusFilter, categoryFilter, cityFilter);
    } catch (e: any) {
      console.warn("[RFQs] Query failed:", e.code, e.message);
      setFetchError(e?.message || t.errors.generic);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (items: RFQItem[], s: string, status: string, cat: string, city: string) => {
    let res = items;
    if (status !== "all") res = res.filter((r) => r.status === status);
    if (cat) res = res.filter((r) => r.category === cat);
    if (city) res = res.filter((r) => r.city === city);
    if (s.trim()) res = res.filter((r) =>
      r.title?.toLowerCase().includes(s.toLowerCase()) ||
      r.category?.toLowerCase().includes(s.toLowerCase())
    );
    setFiltered(res);
  };

  useEffect(() => { fetchRFQs(); }, [user?.organizationId]);
  useEffect(() => { applyFilters(rfqs, search, statusFilter, categoryFilter, cityFilter); }, [search, statusFilter, categoryFilter, cityFilter, rfqs]);

  const isFiltered = search.trim().length > 0 || statusFilter !== "all" || categoryFilter !== "" || cityFilter !== "";
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setCategoryFilter(""); setCityFilter(""); };

  const openFilterSheet = () => {
    setDraft({ status: statusFilter, category: categoryFilter, city: cityFilter });
    setFilterOpen(true);
  };
  const applySheet = () => {
    setStatusFilter(draft.status);
    setCategoryFilter(draft.category);
    setCityFilter(draft.city);
    setFilterOpen(false);
  };
  const resetSheet = () => setDraft(NO_FILTERS);
  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (categoryFilter !== "" ? 1 : 0) + (cityFilter !== "" ? 1 : 0);

  const filterSections: FilterSection[] = [
    {
      key: "status",
      label: t.rfq.status,
      allValue: "all",
      options: RFQ_STATUSES.map((s) => ({ value: s.id, label: isRTL ? s.labelAr : s.label, tone: s.tone })),
    },
    {
      key: "category",
      label: t.rfq.category,
      allValue: "",
      options: CATEGORIES.map((c) => ({ value: c.labelAr, label: isRTL ? c.labelAr : c.label })),
    },
    {
      key: "city",
      label: t.rfq.city,
      allValue: "",
      options: SAUDI_CITIES.map((c) => ({ value: c, label: displayCity(c, isRTL) })),
    },
  ];

  // The quick status row above the list: "all" plus every RFQ status, each
  // with its count. It mirrors the sheet's status section.
  const statusChips: { id: string; label: string; tone: Tone }[] = [
    { id: "all", label: t.common.all, tone: "cta" },
    ...RFQ_STATUSES.map((s) => ({ id: s.id, label: isRTL ? s.labelAr : s.label, tone: s.tone })),
  ];

  const statusLabel = (id: string) => {
    const s = RFQ_STATUSES.find((x) => x.id === id);
    return s ? (isRTL ? s.labelAr : s.label) : id;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.tabs.rfqs} />

      {/* Stats Summary */}
      {!loading && rfqs.length > 0 && (
        <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border, flexDirection: rowDirection }]}>
          <View style={styles.statItem}>
            <Text style={[type.display, { color: colors.foreground }]}>{stats.total}</Text>
            <Text style={[type.caption, { color: colors.outline }]}>{t.dashboard.totalRfqs}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[type.display, { color: colors.primaryText }]}>{stats.active}</Text>
            <Text style={[type.caption, { color: colors.outline }]}>{t.dashboard.active}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[type.display, { color: colors.success }]}>{stats.closed}</Text>
            <Text style={[type.caption, { color: colors.outline }]}>{t.dashboard.closed}</Text>
          </View>
        </View>
      )}

      {/* Filter Bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {/* Search + filter button row */}
        <View style={[styles.searchRow, { flexDirection: rowDirection }]}>
          <Input
            containerStyle={{ flex: 1 }}
            leftIcon="search"
            placeholder={t.rfq.searchPlaceholder}
            value={search}
            onChangeText={setSearch}
            rightIcon={search.length > 0 ? "x" : undefined}
            onRightIconPress={() => setSearch("")}
            rightIconLabel={t.common.close}
            isRTL={isRTL}
            returnKeyType="search"
          />
          <FilterButton activeCount={activeFilterCount} onPress={openFilterSheet} label={t.rfq.filter} />
        </View>

        {/* Status filter chips — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={[styles.chipsScroll, { flexDirection: rowDirection }]}
        >
          {statusChips.map((item) => {
            const active = statusFilter === item.id;
            const count = statusCounts[item.id] ?? 0;
            const c = toneColors(colors, item.tone);
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.chip,
                  {
                    flexDirection: rowDirection,
                    backgroundColor: active ? c.bg : colors.card,
                    borderColor: active ? c.fg : colors.border,
                  },
                ]}
                onPress={() => setStatusFilter(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${item.label} (${count})`}
                accessibilityState={{ selected: active }}
              >
                {active && <View style={[styles.chipDot, { backgroundColor: c.fg }]} />}
                <Text style={[type.captionStrong, { color: active ? c.fg : colors.onSurfaceVariant }]}>
                  {item.label}
                </Text>
                <View style={[styles.chipBadge, { backgroundColor: active ? c.border : colors.muted }]}>
                  <Text style={[type.captionStrong, { color: active ? c.fg : colors.outline }]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Results row: count, the applied sheet filters as pills, and reset */}
        {isFiltered && (
          <View style={[styles.resultsRow, { flexDirection: rowDirection }]}>
            <Text style={[type.caption, { color: colors.outline }]}>
              {filtered.length} / {rfqs.length} {t.tabs.rfqs}
            </Text>
            {categoryFilter !== "" && (
              <FilterPill
                label={displayCategory(categoryFilter, isRTL)}
                onRemove={() => setCategoryFilter("")}
                removeLabel={t.rfq.removeFilter}
              />
            )}
            {cityFilter !== "" && (
              <FilterPill
                icon="map-pin"
                tone="primary"
                label={displayCity(cityFilter, isRTL)}
                onRemove={() => setCityFilter("")}
                removeLabel={t.rfq.removeFilter}
              />
            )}
            {statusFilter !== "all" && (
              <FilterPill
                tone={statusTone(statusFilter)}
                label={statusLabel(statusFilter)}
                onRemove={() => setStatusFilter("all")}
                removeLabel={t.rfq.removeFilter}
              />
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={clearFilters}
              style={[styles.clearBtn, { flexDirection: rowDirection }]}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={t.rfq.resetFilters}
            >
              <Feather name="x-circle" size={13} color={colors.cta} />
              <Text style={[type.captionStrong, { color: colors.cta }]}>{t.rfq.resetFilters}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={{ padding: space.lg }} accessibilityLabel={t.common.loading}>
          {[1, 2, 3, 4].map((k) => <CardSkeleton key={k} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RFQCard rfq={item} onPress={() => router.push(`/(contractor)/rfqs/${item.id}`)} showOffers />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: tabScreenBottomPadding(insets.bottom) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchRFQs(); }}
              tintColor={colors.primaryText}
            />
          }
          ListEmptyComponent={
            fetchError ? (
              <EmptyState
                variant="error"
                icon="alert-circle"
                title={t.rfq.loadFailed}
                subtitle={fetchError}
                actionLabel={t.common.retry}
                onAction={() => { setLoading(true); fetchRFQs(); }}
              />
            ) : (
              <EmptyState
                icon="file-text"
                title={isFiltered ? t.rfq.noRfqsFound : t.dashboard.noRfqs}
                subtitle={isFiltered ? t.rfq.tryAdjustingFilters : t.dashboard.noRfqsDesc}
                actionLabel={!isFiltered ? t.dashboard.createRfq : undefined}
                onAction={!isFiltered ? () => router.push("/(contractor)/rfqs/create") : undefined}
              />
            )
          }
        />
      )}

      {/* Filter sheet — shared with the supplier's feed */}
      <FilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        sections={filterSections}
        values={draft}
        onChange={(key, value) => setDraft((d) => ({ ...d, [key]: value }))}
        onApply={applySheet}
        onReset={resetSheet}
        labels={{ title: t.rfq.filterTitle, apply: t.rfq.applyFilters, reset: t.rfq.resetFilters, all: t.common.all }}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.cta,
            bottom: insets.bottom + (Platform.OS === "web" ? 20 : 88),
            // The primary action sits on the reading-end side: right in
            // English, left in Arabic — and clear of the AI button either way.
            [isRTL ? "left" : "right"]: 20,
            ...colors.shadow.card,
          },
        ]}
        onPress={() => router.push("/(contractor)/rfqs/create")}
        accessibilityLabel={t.dashboard.newRfq}
        accessibilityRole="button"
      >
        <Feather name="plus" size={20} color="#fff" />
        <Text style={styles.fabLabel}>{t.dashboard.newRfq}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  statsBar: {
    alignItems: "center",
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: 32,
    marginHorizontal: space.sm,
  },
  filterBar: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    gap: space.sm,
  },
  searchRow: {
    alignItems: "center",
    gap: space.sm,
  },
  chipsScroll: {
    gap: space.sm,
    paddingVertical: space.xs,
  },
  chip: {
    alignItems: "center",
    gap: space.xs,
    minHeight: 36,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: radius.hairline,
  },
  chipBadge: {
    borderRadius: radius.pill,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xs,
  },
  resultsRow: {
    alignItems: "center",
    flexWrap: "wrap",
    gap: space.sm,
  },
  clearBtn: {
    alignItems: "center",
    gap: space.xs,
    minHeight: 32,
  },
  list: {
    padding: space.lg,
    gap: 0,
  },
  fab: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
  },
  fabLabel: {
    color: "#fff",
    fontSize: 14, lineHeight: 24,
    fontFamily: "Inter_600SemiBold",
  },
});
