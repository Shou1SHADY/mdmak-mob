import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Platform,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { StatsCard } from "@/components/StatsCard";
import { OfferCard, OfferItem } from "@/components/OfferCard";
import { RFQCard, RFQItem } from "@/components/RFQCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DashboardHeader } from "@/components/ScreenHeader";

export default function SupplierDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, organization } = useAuth();
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [recentRfqs, setRecentRfqs] = useState<RFQItem[]>([]);
  const [stats, setStats] = useState({ totalOffers: 0, pending: 0, accepted: 0, openRfqs: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!user?.organizationId) return;
    try {
      const offQ = query(
        collection(db, "offers"),
        where("supplierOrgId", "==", user.organizationId),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const offSnap = await getDocs(offQ);
      const offerItems = offSnap.docs.map((d) => ({ id: d.id, ...d.data() } as OfferItem));
      setOffers(offerItems);
      const rfqQ = query(collection(db, "rfqs"), where("status", "==", "new"), orderBy("createdAt", "desc"), limit(5));
      const rfqSnap = await getDocs(rfqQ);
      setRecentRfqs(rfqSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RFQItem)));
      setStats({
        totalOffers: offerItems.length,
        pending: offerItems.filter((o) => o.status === "pending").length,
        accepted: offerItems.filter((o) => o.status === "accepted").length,
        openRfqs: rfqSnap.size,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.organizationId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DashboardHeader
        orgName={organization?.name}
        userName={user?.displayName}
        right={
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => router.push("/(supplier)/notifications")}
          >
            <Feather name="bell" size={19} color="#F8FAFC" />
          </TouchableOpacity>
        }
      />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.statsGrid}>
          <StatsCard title="My Offers" value={stats.totalOffers} icon="tag" color={colors.cta} />
          <StatsCard title="Pending" value={stats.pending} icon="clock" color={colors.warning} />
          <StatsCard title="Accepted" value={stats.accepted} icon="check-circle" color={colors.success} />
          <StatsCard title="Open RFQs" value={stats.openRfqs} icon="file-text" color={colors.accent} />
        </View>

        <SectionHeader title="Open RFQs" actionLabel="Browse all" onAction={() => router.push("/(supplier)/rfqs")} />
        {loading
          ? [1, 2].map((k) => <CardSkeleton key={k} />)
          : recentRfqs.length === 0
          ? <EmptyState icon="file-text" title="No open RFQs" subtitle="Check back later" />
          : recentRfqs.map((rfq) => (
            <RFQCard key={rfq.id} rfq={rfq} onPress={() => router.push(`/(supplier)/rfq/${rfq.id}`)} />
          ))}

        <SectionHeader title="Recent Offers" actionLabel="View all" onAction={() => router.push("/(supplier)/offers")} />
        {loading
          ? [1, 2].map((k) => <CardSkeleton key={k} />)
          : offers.slice(0, 3).length === 0
          ? <EmptyState icon="tag" title="No offers yet" subtitle="Submit offers on open RFQs to get started" />
          : offers.slice(0, 3).map((offer) => <OfferCard key={offer.id} offer={offer} />)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 18 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248,250,252,0.12)",
  },
});
