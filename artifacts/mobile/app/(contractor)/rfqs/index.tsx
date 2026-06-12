import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { RFQCard, RFQItem } from "@/components/RFQCard";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { RFQ_STATUSES } from "@/constants/data";
import { ScreenHeader } from "@/components/ScreenHeader";

export default function MyRFQsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const t = useT();
  const { isRTL } = useLanguage();
  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [filtered, setFiltered] = useState<RFQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
    try {
      const q = query(
        collection(db, "rfqs"),
        where("organizationId", "==", orgId),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RFQItem));
      setRfqs(items);
      applyFilters(items, search, statusFilter);
    } catch (e: any) {
      console.warn("[RFQs] Query failed:", e.code, e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (items: RFQItem[], s: string, status: string) => {
    let res = items;
    if (status !== "all") res = res.filter((r) => r.status === status);
    if (s.trim()) res = res.filter((r) =>
      r.title?.toLowerCase().includes(s.toLowerCase()) ||
      r.category?.toLowerCase().includes(s.toLowerCase())
    );
    setFiltered(res);
  };

  useEffect(() => { fetchRFQs(); }, [user?.organizationId]);
  useEffect(() => { applyFilters(rfqs, search, statusFilter); }, [search, statusFilter, rfqs]);

  const isFiltered = search.trim().length > 0 || statusFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); };

  const filterChips = [
    { id: "all", label: t.common.all, labelAr: t.common.all, color: "#64748b" },
    ...RFQ_STATUSES,
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.tabs.rfqs} />

      {/* Stats Summary */}
      {!loading && rfqs.length > 0 && (
        <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>
              {stats.total}
            </Text>
            <Text style={[styles.statLabel, { color: colors.outline }]}>{t.dashboard.totalRfqs}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary, fontFamily: "HankenGrotesk_700Bold" }]}>
              {stats.active}
            </Text>
            <Text style={[styles.statLabel, { color: colors.outline }]}>{t.dashboard.active}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success, fontFamily: "HankenGrotesk_700Bold" }]}>
              {stats.closed}
            </Text>
            <Text style={[styles.statLabel, { color: colors.outline }]}>{t.dashboard.closed}</Text>
          </View>
        </View>
      )}

      {/* Filter Bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceGray, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.outline} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
            placeholder={t.rfq.searchPlaceholder}
            placeholderTextColor={colors.outline}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}
              accessibilityLabel={t.common.close}
            >
              <View style={[styles.clearIcon, { backgroundColor: colors.outline + "22" }]}>
                <Feather name="x" size={12} color={colors.outline} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Status filter chips — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.chipsScroll, { flexDirection: isRTL ? "row-reverse" : "row" }]}
        >
          {filterChips.map((item) => {
            const active = statusFilter === item.id;
            const count = statusCounts[item.id] ?? 0;
            const chipColor = active ? (item as any).color ?? colors.primary : undefined;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active
                      ? (chipColor ?? colors.primary) + "18"
                      : colors.card,
                    borderColor: active
                      ? (chipColor ?? colors.primary) + "60"
                      : colors.border,
                  },
                ]}
                onPress={() => setStatusFilter(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                {active && (
                  <View style={[styles.chipDot, { backgroundColor: chipColor ?? colors.primary }]} />
                )}
                <Text style={[
                  styles.chipText,
                  { color: active ? (chipColor ?? colors.primary) : colors.onSurfaceVariant },
                ]}>
                  {isRTL && (item as any).labelAr ? (item as any).labelAr : item.label}
                </Text>
                <View style={[
                  styles.chipBadge,
                  {
                    backgroundColor: active
                      ? (chipColor ?? colors.primary) + "22"
                      : colors.muted,
                  },
                ]}>
                  <Text style={[styles.chipBadgeText, { color: active ? (chipColor ?? colors.primary) : colors.outline }]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Results row */}
        {isFiltered && (
          <View style={[styles.resultsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text style={[styles.resultsText, { color: colors.outline }]}>
              {filtered.length} / {rfqs.length} {rfqs.length === 1 ? "RFQ" : "RFQs"}
            </Text>
            <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
              <Feather name="x-circle" size={13} color={colors.cta} />
              <Text style={[styles.clearText, { color: colors.cta }]}>{t.common.cancel}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={{ padding: 16 }}>
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
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 54 : 110) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchRFQs(); }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="file-text"
              title={isFiltered ? t.rfq.noRfqsFound : t.dashboard.noRfqs}
              subtitle={isFiltered ? t.rfq.tryAdjustingFilters : t.dashboard.noRfqsDesc}
              actionLabel={!isFiltered ? t.dashboard.createRfq : undefined}
              onAction={!isFiltered ? () => router.push("/(contractor)/rfqs/create") : undefined}
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.cta,
            bottom: insets.bottom + (Platform.OS === "web" ? 20 : 88),
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
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 22,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 8,
  },
  filterBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  clearIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsScroll: {
    gap: 8,
    paddingHorizontal: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 7,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  chipBadge: {
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  chipBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  resultsRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultsText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  clearText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    padding: 16,
    gap: 0,
  },
  fab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
  },
  fabLabel: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
});
