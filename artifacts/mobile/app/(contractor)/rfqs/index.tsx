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
    if (s.trim()) res = res.filter((r) => r.title.toLowerCase().includes(s.toLowerCase()) || r.category.toLowerCase().includes(s.toLowerCase()));
    setFiltered(res);
  };

  useEffect(() => { fetchRFQs(); }, [user?.organizationId]);
  useEffect(() => { applyFilters(rfqs, search, statusFilter); }, [search, statusFilter, rfqs]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>My RFQs</Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(contractor)/rfqs/create")}
          >
            <Feather name="plus" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search RFQs..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.filterRow}>
          {[{ id: "all", label: "All" }, ...RFQ_STATUSES].map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.filterChip,
                {
                  backgroundColor: statusFilter === s.id ? colors.primary : colors.card,
                  borderColor: statusFilter === s.id ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setStatusFilter(s.id)}
            >
              <Text style={[styles.filterText, { color: statusFilter === s.id ? "#fff" : colors.mutedForeground }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          {[1, 2, 3].map((k) => <CardSkeleton key={k} />)}
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
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) },
          ]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRFQs(); }} tintColor={colors.primary} />}
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
  topBar: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700" as const },
  createBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, fontSize: 15 },
  filterRow: { flexDirection: "row", gap: 8 },
  filterChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  filterText: { fontSize: 13, fontWeight: "500" as const },
  list: { padding: 16, gap: 0 },
});
