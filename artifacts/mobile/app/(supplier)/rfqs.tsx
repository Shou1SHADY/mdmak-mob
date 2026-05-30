import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, RefreshControl, Platform,
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
      {/* Dark top bar */}
      <View style={[styles.topBarDark, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10), backgroundColor: colors.primary }]}>
        <Text style={styles.titleDark}>{t.tabs.browseRfqs}</Text>
      </View>
      {/* Search + filters on white bg */}
      <View style={[styles.topBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          {/* TODO: i18n */}
          <TextInput
            style={[styles.searchInput, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
            placeholder="Search RFQs..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <FlatList
          horizontal
          data={categories.slice(0, 8)}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, { backgroundColor: categoryFilter === item ? colors.primary : colors.card, borderColor: categoryFilter === item ? colors.primary : colors.border, borderRadius: colors.radiusSm }]}
              onPress={() => setCategoryFilter(item)}
            >
              <Text style={[styles.filterText, { color: categoryFilter === item ? "#F8FAFC" : colors.mutedForeground }]}>{item}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ gap: 8 }}
        />
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
          ListEmptyComponent={<EmptyState icon="search" title="No RFQs found" subtitle="Try adjusting your filters" />}
          scrollEnabled={!!filtered.length}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBarDark: { paddingHorizontal: 16, paddingBottom: 16 },
  titleDark: { fontSize: 22, fontWeight: "700" as const, color: "#F8FAFC", marginTop: 8 },
  topBar: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12, paddingTop: 12 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, fontSize: 15 },
  filterChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  filterText: { fontSize: 13, fontWeight: "500" as const },
  list: { padding: 16 },
});
