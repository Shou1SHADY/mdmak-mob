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

  const fetchRFQs = async () => {
    const orgId = user?.organizationId;
    if (!orgId) {
      setLoading(false);
      return;
    }
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
        title={t.tabs.rfqs}
        right={
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.accentBlueSoft }]}
            onPress={() => router.push("/(contractor)/rfqs/create")}
          >
            <Feather name="plus" size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <View style={[styles.filterBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surfaceGray, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.outline} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }, { textAlign: isRTL ? "right" : "left" }]}
            placeholder={t.rfq.searchPlaceholder}
            placeholderTextColor={colors.outline}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={14} color={colors.outline} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.filterRow}>
          {[{ id: "all", label: t.common.all, color: "#747688" }, ...RFQ_STATUSES].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.chip,
                {
                  backgroundColor: statusFilter === item.id ? colors.primary : colors.card,
                  borderColor: statusFilter === item.id ? colors.primary : colors.border,
                  borderRadius: colors.radiusFull,
                },
              ]}
              onPress={() => setStatusFilter(item.id)}
            >
              <Text style={[styles.chipText, { color: statusFilter === item.id ? "#FFFFFF" : colors.onSurfaceVariant }]}>
                {item.label}
              </Text>
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
            <RFQCard rfq={item} onPress={() => router.push(`/(contractor)/rfqs/${item.id}`)} showOffers />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }]}
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
              title={t.rfq.noRfqsFound}
              subtitle={search || statusFilter !== "all" ? t.rfq.tryAdjustingFilters : t.rfq.createFirstRfq}
              actionLabel={!search && statusFilter === "all" ? t.dashboard.createRfq : undefined}
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
  addBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  filterBar: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 24, borderWidth: 1.5, paddingHorizontal: 16, height: 44 },
  searchInput: { flex: 1, fontSize: 14 },
  chip: { borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 7 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipText: { fontSize: 12, fontWeight: "600" as const },
  list: { padding: 16 },
});
