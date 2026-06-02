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
import { useT, useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { StatsCard } from "@/components/StatsCard";
import { OfferCard, OfferItem } from "@/components/OfferCard";
import { RFQCard, RFQItem } from "@/components/RFQCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DashboardHeader, WelcomeHeroCard, QuickActionCard } from "@/components/ScreenHeader";

export default function SupplierDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { isRTL } = useLanguage();
  const { user, organization } = useAuth();
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [recentRfqs, setRecentRfqs] = useState<RFQItem[]>([]);
  const [stats, setStats] = useState({ totalOffers: 0, pending: 0, accepted: 0, openRfqs: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const orgId = user?.organizationId;
    if (!orgId) {
      setLoading(false);
      return;
    }
    try {
      const offQ = query(
        collection(db, "offers"),
        where("organizationId", "==", orgId),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const offSnap = await getDocs(offQ);
      const offerItems = offSnap.docs.map((d) => ({ id: d.id, ...d.data() } as OfferItem));
      setOffers(offerItems);
      const rfqQ = query(collection(db, "rfqs"), where("status", "==", "New"), orderBy("createdAt", "desc"), limit(5));
      const rfqSnap = await getDocs(rfqQ);
      setRecentRfqs(rfqSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RFQItem)));
      setStats({
        totalOffers: offerItems.length,
        pending: offerItems.filter((o) => o.status === "قيد المراجعة").length,
        accepted: offerItems.filter((o) => o.status === "مقبول").length,
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
            style={[styles.headerIconBtn, { backgroundColor: colors.accentBlueSoft }]}
            onPress={() => router.push("/(supplier)/notifications")}
          >
            <Feather name="bell" size={19} color={colors.primary} />
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
            tintColor={colors.primary}
          />
        }
      >
        <WelcomeHeroCard
          userName={user?.displayName}
          activeRfqs={stats.openRfqs}
          totalOffers={stats.totalOffers}
          onAction={() => router.push("/(supplier)/rfqs")}
          actionLabel={t.dashboard.browseOpenRfqs}
        />

        <View style={styles.quickActionsRow}>
          <QuickActionCard
            title={t.tabs.browseRfqs}
            icon="search"
            bgColor={colors.accentBlueSoft}
            onPress={() => router.push("/(supplier)/rfqs")}
          />
          <QuickActionCard
            title={t.dashboard.myOffers}
            icon="tag"
            bgColor={colors.accentPurpleSoft}
            onPress={() => router.push("/(supplier)/offers")}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatsCard title={t.dashboard.myOffers} value={stats.totalOffers} icon="tag" color={colors.primary} />
          <StatsCard title={t.dashboard.pending} value={stats.pending} icon="clock" color={colors.warning} />
          <StatsCard title={t.dashboard.accepted} value={stats.accepted} icon="check-circle" color={colors.success} />
          <StatsCard title={t.dashboard.openRfqs} value={stats.openRfqs} icon="file-text" color={colors.secondary} />
        </View>

        <SectionHeader title={t.dashboard.openRfqs} actionLabel={t.dashboard.browseAll} onAction={() => router.push("/(supplier)/rfqs")} />
        {loading
          ? [1, 2].map((k) => <CardSkeleton key={k} />)
          : recentRfqs.length === 0
          ? <EmptyState icon="file-text" title={t.dashboard.noOpenRfqs} subtitle={t.dashboard.noOpenRfqsDesc} />
          : recentRfqs.map((rfq) => (
            <RFQCard key={rfq.id} rfq={rfq} onPress={() => router.push(`/(supplier)/rfq/${rfq.id}`)} />
          ))}

        <SectionHeader title={t.dashboard.recentOffers} actionLabel={t.dashboard.browseAll} onAction={() => router.push("/(supplier)/offers")} />
        {loading
          ? [1, 2].map((k) => <CardSkeleton key={k} />)
          : offers.slice(0, 3).length === 0
          ? <EmptyState icon="tag" title={t.dashboard.noOffers} subtitle={t.dashboard.noOffersDesc} />
          : offers.slice(0, 3).map((offer) => <OfferCard key={offer.id} offer={offer} />)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
});
