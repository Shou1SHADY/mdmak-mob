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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { StatsCard } from "@/components/StatsCard";
import { RFQCard, RFQItem } from "@/components/RFQCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";

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
      setRfqs(items);

      // count offers for each RFQ
      let totalOffers = 0;
      for (const rfq of items) {
        const offQ = query(collection(db, "offers"), where("rfqId", "==", rfq.id));
        const offSnap = await getDocs(offQ);
        rfq.offersCount = offSnap.size;
        totalOffers += offSnap.size;
      }

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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80),
        },
      ]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Good day,</Text>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {organization?.name ?? user?.displayName}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push("/(contractor)/notifications")}
          >
            <Feather name="bell" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(contractor)/rfqs/create")}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.createText}>New RFQ</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <StatsCard title="Total RFQs" value={stats.total} icon="file-text" color={colors.primary} />
        <StatsCard title="Active" value={stats.active} icon="activity" color={colors.accent} />
        <StatsCard title="Offers" value={stats.offers} icon="tag" color="#8b5cf6" />
        <StatsCard title="Closed" value={stats.closed} icon="check-circle" color={colors.success} />
      </View>

      {/* Recent RFQs */}
      <SectionHeader title="Recent RFQs" actionLabel="View all" onAction={() => router.push("/(contractor)/rfqs/index")} />

      {loading ? (
        [1, 2, 3].map((k) => <CardSkeleton key={k} />)
      ) : rfqs.length === 0 ? (
        <EmptyState
          icon="file-text"
          title="No RFQs yet"
          subtitle="Create your first RFQ to start getting offers from suppliers"
          actionLabel="Create RFQ"
          onAction={() => router.push("/(contractor)/rfqs/create")}
        />
      ) : (
        rfqs.slice(0, 5).map((rfq) => (
          <RFQCard
            key={rfq.id}
            rfq={rfq}
            onPress={() => router.push(`/(contractor)/rfqs/${rfq.id}`)}
            showOffers
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { fontSize: 13 },
  name: { fontSize: 20, fontWeight: "700" as const },
  headerActions: { flexDirection: "row", gap: 10, alignItems: "center" },
  iconBtn: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  createText: { color: "#fff", fontWeight: "600" as const, fontSize: 14 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
});
