import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, RefreshControl, Platform,
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

  const categories = ["All", ...CATEGORIES.map((c) => c.label)];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBarDark, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10), backgroundColor: colors.primary }]}>
        <Text style={[styles.titleDark]}>{t.tabs.browseRfqs}</Text>
      </View>
      <View style={[styles.topBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceGray, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.outline} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
            placeholder={t.rfq.searchPlaceholder}
            placeholderTextColor={colors.outline}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.filterRow}>
          {categories.slice(0, 8).map((item) => (
            <TouchableOpacity
              key={item}
              style={[styles.filterChip, { backgroundColor: categoryFilter === item ? colors.primary : colors.card, borderColor: categoryFilter === item ? colors.primary : colors.border, borderRadius: colors.radiusFull }]}
              onPress={() => setCategoryFilter(item)}
            >
              <Text style={[styles.filterText, { color: categoryFilter === item ? "#FFFFFF" : colors.onSurfaceVariant }]}>{item}</Text>
            </TouchableOpacity>
          ))}
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
          scrollEnabled={!!filtered.length}
        />
      )}
    </View>
  );
}

const styles = {
  topBarDark: { paddingHorizontal: 16, paddingBottom: 16 },
  titleDark: { fontSize: 22, fontWeight: "700" as const, color: "#FFFFFF", marginTop: 8 },
  topBar: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12, paddingTop: 12 } as any,
  searchBox: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10, borderRadius: 24, borderWidth: 1.5, paddingHorizontal: 16, height: 44 },
  searchInput: { flex: 1, fontSize: 15 },
  filterChip: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  filterRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  filterText: { fontSize: 13, fontWeight: "500" as const },
  list: { padding: 16 },
};
