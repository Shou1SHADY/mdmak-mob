import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  RefreshControl, Platform, StyleSheet, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { RFQCard, RFQItem } from "@/components/RFQCard";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { CATEGORIES } from "@/constants/data";

export default function BrowseRFQsScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [filtered, setFiltered] = useState<RFQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const fetchRFQs = async () => {
    try {
      // No orderBy — avoids composite index requirement; sort client-side
      const snap = await getDocs(
        query(collection(db, "rfqs"), where("status", "in", ["New", "Active", "Under Review"]))
      );
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as RFQItem))
        .sort((a, b) => {
          const ta = typeof a.createdAt?.toDate === "function" ? a.createdAt.toDate().getTime() : 0;
          const tb = typeof b.createdAt?.toDate === "function" ? b.createdAt.toDate().getTime() : 0;
          return tb - ta;
        });
      setRfqs(items);
      applyFilters(items, search, categoryFilter);
    } catch (e: any) {
      console.warn("[BrowseRFQs]", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (items: RFQItem[], s: string, cat: string) => {
    let res = items;
    if (cat !== "All") res = res.filter((r) => r.category === cat);
    if (s.trim()) {
      const q = s.toLowerCase();
      res = res.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.city.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
      );
    }
    setFiltered(res);
  };

  useEffect(() => { fetchRFQs(); }, []);
  useEffect(() => { applyFilters(rfqs, search, categoryFilter); }, [search, categoryFilter, rfqs]);

  const categoryOptions = [
    { label: "All", labelAr: t.common.all },
    ...CATEGORIES.map((c) => ({ label: c.label, labelAr: c.labelAr })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.tabs.browseRfqs}
        right={
          filtered.length > 0 ? (
            <View style={[styles.countBadge, { backgroundColor: colors.cta + "15", borderColor: colors.cta + "30" }]}>
              <Text style={[styles.countText, { color: colors.cta }]}>{filtered.length}</Text>
            </View>
          ) : undefined
        }
      />

      {/* Search + filters */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {/* Search box */}
        <View style={[styles.searchBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
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
              style={styles.clearBtn}
              accessibilityLabel={t.common.close}
            >
              <Feather name="x" size={13} color={colors.outline} />
            </TouchableOpacity>
          )}
        </View>

        {/* Horizontal category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {categoryOptions.map((item) => {
            const active = categoryFilter === item.label;
            return (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: colors.cta, borderColor: colors.cta }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setCategoryFilter(item.label)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? "#FFFFFF" : colors.onSurfaceVariant },
                  ]}
                >
                  {isRTL ? item.labelAr : item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ padding: 16, gap: 10 }}>
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
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchRFQs(); }}
              tintColor={colors.cta}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="search"
              title={t.rfq.noRfqsFound}
              subtitle={t.rfq.tryAdjustingFilters}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  countBadge: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  filterBar: {
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 42,
    marginHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  clearBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  list: {
    padding: 16,
    gap: 0,
  },
});
