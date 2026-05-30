import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Platform,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useT, useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { OfferCard, OfferItem } from "@/components/OfferCard";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { OFFER_STATUSES } from "@/constants/data";

export default function MyOffersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [filtered, setFiltered] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchOffers = async () => {
    const orgId = user?.organizationId;
    if (!orgId) {
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(db, "offers"),
        where("organizationId", "==", orgId),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const items: OfferItem[] = await Promise.all(
        snap.docs.map(async (d) => {
          const offer = { id: d.id, ...d.data() } as OfferItem;
          try {
            const rfqDoc = await getDoc(doc(db, "rfqs", offer.rfqId));
            if (rfqDoc.exists()) offer.rfqTitle = rfqDoc.data().title;
          } catch {}
          return offer;
        })
      );
      setOffers(items);
      applyFilter(items, statusFilter);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = (items: OfferItem[], status: string) => {
    setFiltered(status === "all" ? items : items.filter((o) => o.status === status));
  };

  useEffect(() => { fetchOffers(); }, [user?.organizationId]);
  useEffect(() => { applyFilter(offers, statusFilter); }, [statusFilter, offers]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{t.dashboard.myOffers}</Text>
        <View style={styles.filterRow}>
          {[{ id: "all", label: "All" /* TODO: i18n */ }, ...OFFER_STATUSES].map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.filterChip, { backgroundColor: statusFilter === s.id ? colors.primary : colors.card, borderColor: statusFilter === s.id ? colors.primary : colors.border }]}
              onPress={() => setStatusFilter(s.id)}
            >
              <Text style={[styles.filterText, { color: statusFilter === s.id ? "#fff" : colors.mutedForeground }]}>{s.label}</Text>
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
          renderItem={({ item }) => <OfferCard offer={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOffers(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="tag" title={t.dashboard.noOffers} subtitle={statusFilter !== "all" ? "No offers with this status" /* TODO: i18n */ : t.dashboard.noOffersDesc} />}
          scrollEnabled={!!filtered.length}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" as const },
  filterRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  filterChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  filterText: { fontSize: 12, fontWeight: "500" as const },
  list: { padding: 16 },
});
