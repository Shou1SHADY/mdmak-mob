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
import { useT } from "@/context/LanguageContext";
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
  const t = useT();
  const { user, organization } = useAuth();
  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, offers: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    const orgId = user?.organizationId;
    if (!orgId) {
      setLoading(false);
      return;
    }
    console.log("[Dashboard] Fetching for orgId:", orgId);
    try {
      const q = query(
        collection(db, "rfqs"),
        where("organizationId", "==", orgId),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      console.log("[Dashboard] Got", snap.size, "RFQs");
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
        active: items.filter((r) => r.status === "New" || r.status === "Active" || r.status === "Under Review").length,
        offers: totalOffers,
        closed: items.filter((r) => r.status === "Closed").length,
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
        orgType={user?.role === "Supplier" ? "Supplier" : "Contractor"}
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
              <Text style={[styles.newRfqText, { color: colors.primary }]}>{t.dashboard.newRfq}</Text>
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
        {!organization?.name && user?.organizationId && (
          <TouchableOpacity
            style={[styles.banner, { backgroundColor: colors.accent + "12", borderColor: colors.accent + "30", borderRadius: colors.radiusSm }]}
            onPress={() => router.push("/(contractor)/profile")}
            activeOpacity={0.8}
          >
            <Feather name="alert-circle" size={16} color={colors.accent} />
            <Text style={[styles.bannerText, { color: colors.accent }]}>
              Complete your company profile to get started
            </Text>
            <Feather name="chevron-right" size={14} color={colors.accent} />
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <StatsCard title={t.dashboard.totalRfqs} value={stats.total} icon="file-text" color={colors.cta} />
            </View>
            <View style={{ flex: 1 }}>
              <StatsCard title={t.dashboard.active} value={stats.active} icon="activity" color={colors.accent} />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <StatsCard title={t.dashboard.offersIn} value={stats.offers} icon="tag" color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <StatsCard title={t.dashboard.closed} value={stats.closed} icon="check-circle" color={colors.success} />
            </View>
          </View>
        </View>

        <SectionHeader
          title={t.dashboard.recentRfqs}
          actionLabel={t.dashboard.viewAll}
          onAction={() => router.push("/(contractor)/rfqs/index")}
        />

        {loading
          ? [1, 2, 3].map((k) => <CardSkeleton key={k} />)
          : rfqs.length === 0
          ? (
            <EmptyState
              icon="file-text"
              title={t.dashboard.noRfqs}
              subtitle={t.dashboard.noRfqsDesc}
              actionLabel={t.dashboard.createRfq}
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
  container: { padding: 16, gap: 20 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderWidth: 1,
    marginBottom: 4,
  },
  bannerText: { flex: 1, fontSize: 13, fontWeight: "600" as const },
  statsGrid: { gap: 8 },
  statsRow: { flexDirection: "row", gap: 8 },
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
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newRfqText: { fontWeight: "600" as const, fontSize: 16, lineHeight: 24 },
});
