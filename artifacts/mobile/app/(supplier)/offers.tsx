import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  Platform, StyleSheet, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
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
    if (!orgId) { setLoading(false); return; }
    try {
      // No orderBy — avoids composite index requirement; sort client-side
      const snap = await getDocs(
        query(collection(db, "offers"), where("organizationId", "==", orgId))
      );
      const items: OfferItem[] = await Promise.all(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as OfferItem))
          .sort((a, b) => {
            const ta = typeof a.createdAt?.toDate === "function" ? a.createdAt.toDate().getTime() : 0;
            const tb = typeof b.createdAt?.toDate === "function" ? b.createdAt.toDate().getTime() : 0;
            return tb - ta;
          })
          .map(async (offer) => {
            try {
              const rfqDoc = await getDoc(doc(db, "rfqs", offer.rfqId));
              if (rfqDoc.exists()) offer.rfqTitle = (rfqDoc.data() as any).title;
            } catch {}
            return offer;
          })
      );
      setOffers(items);
      applyFilter(items, statusFilter);
    } catch (e: any) {
      console.warn("[MyOffers]", e.message);
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

  const filterOptions = [{ id: "all", label: t.common.all, labelAr: t.common.all }, ...OFFER_STATUSES];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.dashboard.myOffers}
        right={
          filtered.length > 0 ? (
            <View style={[styles.countBadge, { backgroundColor: colors.cta + "15", borderColor: colors.cta + "30" }]}>
              <Text style={[styles.countText, { color: colors.cta }]}>{filtered.length}</Text>
            </View>
          ) : undefined
        }
      />

      {/* Horizontal status filter */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {filterOptions.map((s) => {
            const active = statusFilter === s.id;
            const label = s.id === "all" ? s.label : (isRTL && (s as any).labelAr ? (s as any).labelAr : s.label);
            const statusCount = s.id === "all" ? offers.length : offers.filter((o) => o.status === s.id).length;
            return (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: colors.cta, borderColor: colors.cta }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setStatusFilter(s.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, { color: active ? "#FFFFFF" : colors.onSurfaceVariant }]}>
                  {label}
                </Text>
                {statusCount > 0 && (
                  <View
                    style={[
                      styles.chipCount,
                      { backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.border },
                    ]}
                  >
                    <Text style={[styles.chipCountText, { color: active ? "#FFFFFF" : colors.outline }]}>
                      {statusCount}
                    </Text>
                  </View>
                )}
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
            <OfferCard
              offer={item}
              onPress={item.status === OFFER_STATUS.ACCEPTED ? () => router.push(`/chat/${item.id}`) : undefined}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchOffers(); }}
              tintColor={colors.cta}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="tag"
              title={t.dashboard.noOffers}
              subtitle={statusFilter !== "all" ? t.offers.noOffersWithStatus : t.dashboard.noOffersDesc}
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
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  chipCount: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: "center",
  },
  chipCountText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  list: {
    padding: 16,
  },
});
