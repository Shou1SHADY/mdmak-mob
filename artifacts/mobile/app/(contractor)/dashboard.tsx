import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { StatsCard } from "@/components/StatsCard";
import { RFQCard, RFQItem } from "@/components/RFQCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DashboardHeader } from "@/components/ScreenHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ContractorDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, organization } = useAuth();
  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, offers: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!user?.organizationId) return;
    try {
      const q = query(
        collection(db, "rfqs"),
        where("contractorOrgId", "==", user.organizationId),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      const items: RFQItem[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RFQItem));
      let totalOffers = 0;
      for (const rfq of items) {
        const offQ = query(collection(db, "offers"), where("rfqId", "==", rfq.id));
        const offSnap = await getDocs(offQ);
        rfq.offersCount = offSnap.size;
        totalOffers += offSnap.size;
      }
      setRfqs(items);
      setStats({
        total: items.length,
        active: items.filter((r) => r.status === "new" || r.status === "under_review").length,
        offers: totalOffers,
        closed: items.filter((r) => r.status === "closed").length,
      });
    } catch (e) {
      console.warn(e);
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
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => router.push("/(contractor)/notifications")}
            >
              <Feather name="bell" size={19} color="#F8FAFC" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.newRfqBtn, { backgroundColor: colors.accent }]}
              onPress={() => router.push("/(contractor)/rfqs/create")}
            >
              <Feather name="plus" size={16} color={colors.primary} />
              <Text style={[styles.newRfqText, { color: colors.primary }]}>New RFQ</Text>
            </TouchableOpacity>
          </View>
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
        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatsCard title="Total RFQs" value={stats.total} icon="file-text" color={colors.cta} />
          <StatsCard title="Active" value={stats.active} icon="activity" color={colors.accent} />
          <StatsCard title="Offers In" value={stats.offers} icon="tag" color="#7C3AED" />
          <StatsCard title="Closed" value={stats.closed} icon="check-circle" color={colors.success} />
        </View>

        <SectionHeader
          title="Recent RFQs"
          actionLabel="View all"
          onAction={() => router.push("/(contractor)/rfqs/index")}
        />

        {loading
          ? [1, 2, 3].map((k) => <CardSkeleton key={k} />)
          : rfqs.length === 0
          ? (
            <EmptyState
              icon="file-text"
              title="No RFQs yet"
              subtitle="Create your first RFQ to start receiving offers from suppliers"
              actionLabel="Create RFQ"
              onAction={() => router.push("/(contractor)/rfqs/create")}
            />
          )
          : rfqs.slice(0, 5).map((rfq) => (
            <RFQCard
              key={rfq.id}
              rfq={rfq}
              onPress={() => router.push(`/(contractor)/rfqs/${rfq.id}`)}
              showOffers
            />
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 18 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248,250,252,0.12)",
  },
  newRfqBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newRfqText: { fontWeight: "700" as const, fontSize: 13 },
});
