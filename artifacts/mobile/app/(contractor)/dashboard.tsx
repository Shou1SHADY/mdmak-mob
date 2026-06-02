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
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { StatsCard } from "@/components/StatsCard";
import { RFQCard, RFQItem } from "@/components/RFQCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DashboardHeader, WelcomeHeroCard, QuickActionCard } from "@/components/ScreenHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ContractorDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { isRTL } = useLanguage();
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
    try {
      const q = query(
        collection(db, "rfqs"),
        where("organizationId", "==", orgId),
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
        right={
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: colors.accentBlueSoft }]}
            onPress={() => router.push("/(contractor)/notifications")}
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
          activeRfqs={stats.active}
          totalOffers={stats.offers}
          onAction={() => router.push("/(contractor)/rfqs/index")}
          actionLabel={t.dashboard.viewAll}
        />

        <View style={styles.quickActionsRow}>
          <QuickActionCard
            title={t.dashboard.createRfq}
            icon="file-plus"
            bgColor={colors.accentBlueSoft}
            onPress={() => router.push("/(contractor)/rfqs/create")}
          />
          <QuickActionCard
            title={t.dashboard.browseSuppliers}
            icon="users"
            bgColor={colors.accentPurpleSoft}
            onPress={() => router.push("/(contractor)/suppliers")}
          />
        </View>

        <View style={styles.bentoRow}>
          <View style={[styles.projectStatusCard, { backgroundColor: colors.card, borderColor: colors.border, ...colors.shadow.card }]}>
            <Text style={[styles.widgetTitle, { color: colors.foreground, fontFamily: "HankenGrotesk_600SemiBold" }]}>
              {t.dashboard.rfqOverview}
            </Text>
            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.foreground }]}>{t.dashboard.openRfqs}</Text>
                <Text style={[styles.progressPercent, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                  {stats.active}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressBar, { width: stats.total > 0 ? `${(stats.active / stats.total) * 100}%` : "0%", backgroundColor: colors.primary }]} />
              </View>
            </View>
            <View style={styles.progressItem}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: colors.foreground }]}>{t.dashboard.offersReceived}</Text>
                <Text style={[styles.progressPercent, { color: colors.secondary, fontFamily: "Inter_700Bold" }]}>
                  {stats.offers}
                </Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressBar, { width: stats.offers > 0 ? `${Math.min((stats.offers / stats.active) * 50, 100)}%` : "0%", backgroundColor: colors.secondary }]} />
              </View>
            </View>
            <TouchableOpacity
              style={[styles.viewAllBtn, { borderTopColor: colors.border }]}
              onPress={() => router.push("/(contractor)/rfqs/index")}
            >
              <Text style={[styles.viewAllText, { color: colors.primary }]}>{t.dashboard.viewAll}</Text>
              <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.analyticsCard, { backgroundColor: colors.card, borderColor: colors.border, ...colors.shadow.card }]}>
            <Text style={[styles.widgetTitle, { color: colors.foreground, fontFamily: "HankenGrotesk_600SemiBold" }]}>
              {t.dashboard.thisMonth}
            </Text>
            <View style={styles.analyticsRow}>
              <View style={styles.analyticsItem}>
                <Feather name="file-text" size={20} color={colors.primary} />
                <Text style={[styles.analyticsValue, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>
                  {stats.total}
                </Text>
                <Text style={[styles.analyticsLabel, { color: colors.outline }]}>{t.dashboard.totalRfqs}</Text>
              </View>
              <View style={styles.analyticsDivider} />
              <View style={styles.analyticsItem}>
                <Feather name="check-circle" size={20} color={colors.success} />
                <Text style={[styles.analyticsValue, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>
                  {stats.closed}
                </Text>
                <Text style={[styles.analyticsLabel, { color: colors.outline }]}>{t.dashboard.closed}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <StatsCard title={t.dashboard.totalRfqs} value={stats.total} icon="file-text" color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <StatsCard title={t.dashboard.active} value={stats.active} icon="activity" color={colors.secondary} />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <StatsCard title={t.dashboard.offersIn} value={stats.offers} icon="tag" color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <StatsCard title={t.dashboard.closed} value={stats.closed} icon="check-circle" color={colors.warning} />
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
  bentoRow: {
    gap: 12,
  },
  projectStatusCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
  },
  widgetTitle: {
    fontSize: 20,
    letterSpacing: -0.4,
  },
  progressItem: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  progressPercent: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  viewAllText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.6,
  },
  analyticsCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
  },
  analyticsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  analyticsItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  analyticsDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 8,
  },
  analyticsValue: {
    fontSize: 20,
    letterSpacing: -0.4,
  },
  analyticsLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statsGrid: { gap: 8 },
  statsRow: { flexDirection: "row", gap: 8 },
});
