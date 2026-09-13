import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { tabScreenBottomPadding } from "@/lib/layout";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { RFQCard, RFQItem } from "@/components/RFQCard";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { ScreenHeader } from "@/components/ScreenHeader";
import { FilterSheet, FilterButton, FilterPill, type FilterSection } from "@/components/FilterSheet";
import { CATEGORIES, SAUDI_CITIES, RFQ_STATUSES, CITIES_EN, displayCity, displayCategory, statusTone } from "@/constants/data";
import { type, space, radius, HIT_SLOP } from "@/lib/design";

// The same set the website's supplier feed uses: an RFQ is browsable while it
// is open ("New") and stays visible once awarded ("Awarded") so a supplier can
// still see the outcome. "Active"/"Under Review" are contractor-side states the
// website never lists here.
const OPEN_STATUSES = ["New", "Awarded"];

// "All" is the no-filter value this feed has always used.
const ALL = "All";
type FilterDraft = { category: string; city: string; status: string };
const NO_FILTERS: FilterDraft = { category: ALL, city: ALL, status: ALL };

/** `createdAt` is written as an ISO string by both apps; older mobile rows may
 *  still hold a Firestore Timestamp. */
function createdAtMs(value: any): number {
  if (!value) return 0;
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export default function BrowseRFQsScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const rowDirection = isRTL ? "row-reverse" : "row";

  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [filtered, setFiltered] = useState<RFQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search
  const [search, setSearch] = useState("");

  // Applied filters
  const [filterCategory, setFilterCategory] = useState(ALL);
  const [filterCity, setFilterCity] = useState(ALL);
  const [filterStatus, setFilterStatus] = useState(ALL);

  // Draft filters (edited in the sheet, committed on apply)
  const [draft, setDraft] = useState<FilterDraft>(NO_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);

  const activeFilterCount = [filterCategory, filterCity, filterStatus].filter(
    (f) => f !== ALL
  ).length;

  const openFilter = () => {
    setDraft({ category: filterCategory, city: filterCity, status: filterStatus });
    setFilterVisible(true);
  };

  const closeFilter = () => setFilterVisible(false);

  const applyFilter = () => {
    setFilterCategory(draft.category);
    setFilterCity(draft.city);
    setFilterStatus(draft.status);
    closeFilter();
  };

  const resetFilter = () => setDraft(NO_FILTERS);

  const fetchRFQs = async () => {
    setFetchError(null);
    try {
      const orgId = user?.organizationId;
      // Two queries, mirroring the website: public RFQs anyone may bid on, plus
      // private ones this supplier's org was explicitly invited to. Querying the
      // whole collection instead — as this screen used to — surfaced other
      // contractors' private RFQs to every supplier.
      const [publicSnap, privateSnap] = await Promise.all([
        getDocs(query(
          collection(db, "rfqs"),
          where("status", "in", OPEN_STATUSES),
          where("visibility", "==", "public")
        )),
        orgId
          ? getDocs(query(
              collection(db, "rfqs"),
              where("allowedSupplierOrgIds", "array-contains", orgId)
            ))
          : Promise.resolve(null),
      ]);

      const byId = new Map<string, RFQItem>();
      publicSnap.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() } as RFQItem));
      privateSnap?.docs.forEach((d) => {
        const item = { id: d.id, ...d.data() } as RFQItem;
        if (OPEN_STATUSES.includes(item.status)) byId.set(d.id, item);
      });

      // A direct award (`directAward: true`) is already decided — it reaches
      // this supplier as an accepted offer under My Offers / Orders, not as a
      // tender to bid on.
      const items = Array.from(byId.values())
        .filter((r) => !(r as { directAward?: boolean }).directAward)
        .sort(
        (a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt)
      );
      setRfqs(items);
    } catch (e: any) {
      if (__DEV__) console.warn("[BrowseRFQs]", e.message);
      setFetchError(e?.message || t.errors.generic);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (
    items: RFQItem[],
    s: string,
    cat: string,
    city: string,
    status: string
  ) => {
    let res = items;

    if (cat !== ALL) {
      // cat is Arabic (canonical). Handle legacy English mobile data too.
      const catEn = CATEGORIES.find((c) => c.labelAr === cat)?.label ?? "";
      res = res.filter((r) => r.category === cat || r.category === catEn);
    }

    if (city !== ALL) {
      // city is Arabic (canonical). Handle legacy English mobile data too.
      const cityEn = CITIES_EN[city] ?? "";
      res = res.filter((r) => r.city === city || r.city === cityEn);
    }

    if (status !== ALL) res = res.filter((r) => r.status === status);

    if (s.trim()) {
      const q = s.toLowerCase();
      res = res.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.city?.toLowerCase().includes(q) ||
          CITIES_EN[r.city ?? ""]?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q)
      );
    }
    setFiltered(res);
  };

  // Depends on the org id: on first mount auth may not have resolved yet, and
  // without a re-run the invited-only RFQs would never load.
  useEffect(() => { fetchRFQs(); }, [user?.organizationId]);
  useEffect(() => {
    applyFilters(rfqs, search, filterCategory, filterCity, filterStatus);
  }, [search, filterCategory, filterCity, filterStatus, rfqs]);

  const openStatuses = RFQ_STATUSES.filter((s) => OPEN_STATUSES.includes(s.id));
  const statusLabel = (id: string) => {
    const s = RFQ_STATUSES.find((x) => x.id === id);
    return s ? (isRTL ? s.labelAr : s.label) : id;
  };

  const filterSections: FilterSection[] = [
    {
      key: "category",
      label: t.rfq.category,
      allValue: ALL,
      options: CATEGORIES.map((c) => ({ value: c.labelAr, label: isRTL ? c.labelAr : c.label })),
    },
    {
      key: "city",
      label: t.rfq.city,
      allValue: ALL,
      options: SAUDI_CITIES.map((c) => ({ value: c, label: displayCity(c, isRTL) })),
    },
    {
      key: "status",
      label: t.rfq.status,
      allValue: ALL,
      options: openStatuses.map((s) => ({ value: s.id, label: isRTL ? s.labelAr : s.label, tone: s.tone })),
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.tabs.browseRfqs}
        right={
          filtered.length > 0 ? (
            <View style={[styles.countBadge, { backgroundColor: colors.ctaSoft, borderColor: colors.ctaSoft }]}>
              <Text style={[type.captionStrong, { color: colors.cta }]}>{filtered.length}</Text>
            </View>
          ) : undefined
        }
      />

      {/* Search + filter row */}
      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderBottomColor: colors.border, flexDirection: rowDirection }]}>
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
        <FilterButton activeCount={activeFilterCount} onPress={openFilter} label={t.rfq.filter} />
      </View>

      {/* Active filter pills */}
      {activeFilterCount > 0 && (
        <View
          style={[
            styles.activePills,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
              flexDirection: rowDirection,
            },
          ]}
        >
          {filterCategory !== ALL && (
            <FilterPill
              label={displayCategory(filterCategory, isRTL)}
              onRemove={() => setFilterCategory(ALL)}
              removeLabel={t.rfq.removeFilter}
            />
          )}
          {filterCity !== ALL && (
            <FilterPill
              icon="map-pin"
              tone="primary"
              label={displayCity(filterCity, isRTL)}
              onRemove={() => setFilterCity(ALL)}
              removeLabel={t.rfq.removeFilter}
            />
          )}
          {filterStatus !== ALL && (
            <FilterPill
              tone={statusTone(filterStatus)}
              label={statusLabel(filterStatus)}
              onRemove={() => setFilterStatus(ALL)}
              removeLabel={t.rfq.removeFilter}
            />
          )}
          <TouchableOpacity
            onPress={() => { setFilterCategory(ALL); setFilterCity(ALL); setFilterStatus(ALL); }}
            hitSlop={HIT_SLOP}
            style={styles.clearAll}
            accessibilityRole="button"
            accessibilityLabel={t.rfq.resetFilters}
          >
            <Text style={[type.captionStrong, { color: colors.destructive }]}>{t.rfq.resetFilters}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* RFQ List */}
      {loading ? (
        <View style={{ padding: space.lg }} accessibilityLabel={t.common.loading}>
          {[1, 2, 3].map((k) => <CardSkeleton key={k} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RFQCard rfq={item} onPress={() => router.push(`/(supplier)/rfq/${item.id}`)} />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: tabScreenBottomPadding(insets.bottom) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchRFQs(); }}
              tintColor={colors.cta}
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
                icon="search"
                title={t.rfq.noRfqsFound}
                subtitle={t.rfq.tryAdjustingFilters}
              />
            )
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filter sheet — shared with the contractor's list */}
      <FilterSheet
        visible={filterVisible}
        onClose={closeFilter}
        sections={filterSections}
        values={draft}
        onChange={(key, value) => setDraft((d) => ({ ...d, [key]: value }))}
        onApply={applyFilter}
        onReset={resetFilter}
        labels={{ title: t.rfq.filterTitle, apply: t.rfq.applyFilters, reset: t.rfq.resetFilters, all: t.common.all }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  countBadge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },

  // Search row
  searchRow: {
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
  },

  // Active pills bar
  activePills: {
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    flexWrap: "wrap",
  },
  clearAll: { minHeight: 32, justifyContent: "center", paddingHorizontal: space.xs },

  // List
  list: { padding: space.lg, gap: 0 },
});
