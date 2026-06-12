import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, RefreshControl, Platform, StyleSheet, Alert,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
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
      const q = query(collection(db, "rfqs"), where("status", "in", ["New", "Active", "Under Review"]), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RFQItem));
      setRfqs(items);
      applyFilters(items, search, categoryFilter);
    } catch (e: any) {
      Alert.alert(t.common.error, e.message || t.common.loading);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (items: RFQItem[], s: string, cat: string) => {
    let res = items;
    if (cat !== "All") res = res.filter((r) => r.category === cat);
    if (s.trim()) res = res.filter((r) =>
      r.title.toLowerCase().includes(s.toLowerCase()) ||
      r.city.toLowerCase().includes(s.toLowerCase()) ||
      r.category.toLowerCase().includes(s.toLowerCase())
    );
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
      <ScreenHeader title={t.tabs.browseRfqs} />

      <View style={[styles.filterBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.outline} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
            placeholder={t.rfq.searchPlaceholder}
            placeholderTextColor={colors.outline}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel={t.common.close} accessibilityRole="button">
              <Feather name="x" size={14} color={colors.outline} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.filterRow}>
          {categoryOptions.slice(0, 8).map((item) => {
            const active = categoryFilter === item.label;
            return (
              <TouchableOpacity
                key={item.label}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: colors.radiusFull,
                    ...(active ? colors.shadow.sm : {}),
                  },
                ]}
                onPress={() => setCategoryFilter(item.label)}
                accessibilityLabel={isRTL ? item.labelAr : item.label}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.filterText, { color: active ? "#FFFFFF" : colors.onSurfaceVariant }]} numberOfLines={1} ellipsizeMode="tail">
                  {isRTL ? item.labelAr : item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>{[1, 2, 3].map((k) => <CardSkeleton key={k} />)}</View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RFQCard rfq={item} onPress={() => router.push(`/(supplier)/rfq/${item.id}`)} />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRFQs(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="search" title={t.rfq.noRfqsFound} subtitle={t.rfq.tryAdjustingFilters} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
    paddingTop: 12,
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
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  list: {
    padding: 16,
  },
});
