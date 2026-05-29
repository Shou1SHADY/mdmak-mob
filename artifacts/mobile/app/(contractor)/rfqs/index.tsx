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
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
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
  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [filtered, setFiltered] = useState<RFQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchRFQs = async () => {
    if (!user?.organizationId) return;
    try {
      const q = query(
        collection(db, "rfqs"),
        where("contractorOrgId", "==", user.organizationId),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RFQItem));
      setRfqs(items);
      applyFilters(items, search, statusFilter);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (items: RFQItem[], s: string, status: string) => {
    let res = items;
    if (status !== "all") res = res.filter((r) => r.status === status);
    if (s.trim()) res = res.filter((r) =>
      r.title.toLowerCase().includes(s.toLowerCase()) ||
      r.category.toLowerCase().includes(s.toLowerCase())
    );
    setFiltered(res);
  };

  useEffect(() => { fetchRFQs(); }, [user?.organizationId]);
  useEffect(() => { applyFilters(rfqs, search, statusFilter); }, [search, statusFilter, rfqs]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title="My RFQs"
        right={
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.push("/(contractor)/rfqs/create")}
          >
            <Feather name="plus" size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Search + filter */}
      <View style={[styles.filterBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search RFQs..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          horizontal
          data={[{ id: "all", label: "All", color: "#94a3b8" }, ...RFQ_STATUSES]}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.chip,
                {
                  backgroundColor: statusFilter === item.id ? colors.primary : colors.card,
                  borderColor: statusFilter === item.id ? colors.primary : colors.border,
                  borderRadius: colors.radiusSm,
                },
              ]}
              onPress={() => setStatusFilter(item.id)}
            >
              <Text style={[styles.chipText, { color: statusFilter === item.id ? "#F8FAFC" : colors.mutedForeground }]}>
                {item.label}
              </Text>
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
            <RFQCard rfq={item} onPress={() => router.push(`/(contractor)/rfqs/${item.id}`)} showOffers />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchRFQs(); }}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="file-text"
              title="No RFQs found"
              subtitle={search || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first RFQ"}
              actionLabel={!search && statusFilter === "all" ? "Create RFQ" : undefined}
              onAction={!search && statusFilter === "all" ? () => router.push("/(contractor)/rfqs/create") : undefined}
            />
          }
          scrollEnabled={!!filtered.length}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  filterBar: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 14 },
  chip: { borderWidth: 1.5, paddingHorizontal: 13, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: "600" as const },
  list: { padding: 16 },
});
