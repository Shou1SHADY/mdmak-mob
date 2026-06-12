import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, Platform, StyleSheet, Alert,
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
import { ScreenHeader } from "@/components/ScreenHeader";
import { OFFER_STATUSES, OFFER_STATUS } from "@/constants/data";

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
    } catch (e: any) {
      Alert.alert(t.common.error, e.message || t.common.loading);
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
      <ScreenHeader title={t.dashboard.myOffers} />

      <View style={[styles.filterBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.filterRow}>
          {[{ id: "all", label: t.common.all }, ...OFFER_STATUSES].map((s) => {
            const active = statusFilter === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: colors.radiusFull,
                    ...(active ? colors.shadow.sm : {}),
                  },
                ]}
                onPress={() => setStatusFilter(s.id)}
                accessibilityLabel={s.id === "all" ? s.label : (isRTL && (s as any).labelAr ? (s as any).labelAr : s.label)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.filterText, { color: active ? "#FFFFFF" : colors.onSurfaceVariant }]} numberOfLines={1} ellipsizeMode="tail">
                  {s.id === "all" ? s.label : (isRTL && (s as any).labelAr ? (s as any).labelAr : s.label)}
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
            <OfferCard
              offer={item}
              onPress={item.status === OFFER_STATUS.ACCEPTED ? () => router.push(`/chat/${item.id}`) : undefined}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOffers(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="tag" title={t.dashboard.noOffers} subtitle={statusFilter !== "all" ? t.offers.noOffersWithStatus : t.dashboard.noOffersDesc} />}
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
  filterRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  filterChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
  },
  list: {
    padding: 16,
  },
});
