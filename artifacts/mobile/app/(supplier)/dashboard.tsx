import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Platform,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { tabScreenBottomPadding } from "@/lib/layout";
import { useAuth } from "@/context/AuthContext";
import { isPreview, PREVIEW_CONTRACTOR_RFQS, PREVIEW_SUPPLIER_OFFERS, PREVIEW_SUPPLIER_STATS } from "@/lib/preview";
import { useT, useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { OfferCard, OfferItem } from "@/components/OfferCard";
import { RFQCard, RFQItem } from "@/components/RFQCard";
import { OFFER_STATUS } from "@/constants/data";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DashboardHeader, WelcomeHeroCard, QuickActionCard } from "@/components/ScreenHeader";
import { useNotifications } from "@/hooks/useNotifications";

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
  const [fetchError, setFetchError] = useState(false);
  const { unreadCount } = useNotifications();

  const fetchData = async () => {
    // Design preview: see the contractor dashboard for why.
    if (isPreview()) {
      setOffers(PREVIEW_SUPPLIER_OFFERS as OfferItem[]);
      setRecentRfqs(PREVIEW_CONTRACTOR_RFQS as RFQItem[]);
      setStats(PREVIEW_SUPPLIER_STATS);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const orgId = user?.organizationId;
    if (!orgId) { setLoading(false); return; }
    setFetchError(false);
    try {
      const offSnap = await getDocs(query(
        collection(db, "offers"),
        where("organizationId", "==", orgId),
        orderBy("createdAt", "desc"),
        limit(10)
      ));
      const offerItems = offSnap.docs.map((d) => ({ id: d.id, ...d.data() } as OfferItem));
      setOffers(offerItems);

      // Public only — without the visibility filter this teaser listed other
      // contractors' private RFQs, which the website never shows a supplier.
      const rfqSnap = await getDocs(query(
        collection(db, "rfqs"),
        where("status", "==", "New"),
        where("visibility", "==", "public"),
        orderBy("createdAt", "desc"),
        limit(5)
      ));
      setRecentRfqs(rfqSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RFQItem)));

      setStats({
        totalOffers: offerItems.length,
        pending: offerItems.filter((o) => o.status === OFFER_STATUS.UNDER_REVIEW).length,
        accepted: offerItems.filter((o) => o.status === OFFER_STATUS.ACCEPTED).length,
        openRfqs: rfqSnap.size,
      });
    } catch (e: any) {
      console.warn("[SupplierDashboard] fetchData:", e.message);
      setFetchError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.organizationId]);

  const pendingRatio = stats.totalOffers > 0 ? stats.pending / stats.totalOffers : 0;
  const acceptedRatio = stats.totalOffers > 0 ? stats.accepted / stats.totalOffers : 0;

  if (fetchError && !loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
        <Feather name="wifi-off" size={40} color={colors.outline} />
        <Text style={{ fontSize: 16, fontFamily: "HankenGrotesk_700Bold", color: colors.foreground, textAlign: "center" }}>
          {isRTL ? "تعذر تحميل البيانات" : "Failed to load data"}
        </Text>
        <Text style={{ fontSize: 13, color: colors.outline, textAlign: "center" }}>
          {isRTL ? "تحقق من اتصالك بالإنترنت وحاول مجدداً" : "Check your connection and try again"}
        </Text>
        <TouchableOpacity
          onPress={() => { setLoading(true); fetchData(); }}
          style={{ backgroundColor: colors.cta, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14 }}
        >
          <Text style={{ color: "#FFFFFF", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
            {isRTL ? "إعادة المحاولة" : "Retry"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DashboardHeader
        orgName={organization?.name}
        userName={user?.displayName}
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* The app switcher. Every module the member may open lives behind
              it, mirroring the website's launcher rather than competing with
              the five role tabs below. */}
          <TouchableOpacity
            style={[styles.bellBtn, { backgroundColor: colors.accentBlueSoft }]}
            onPress={() => router.push("/apps")}
            accessibilityRole="button"
            accessibilityLabel={t.modules.launcherTitle}
          >
            <Feather name="grid" size={18} color={colors.cta} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bellBtn, { backgroundColor: colors.accentBlueSoft }]}
            onPress={() => router.push("/(supplier)/notifications")}
          >
            <Feather name="bell" size={18} color={colors.cta} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.destructive, borderColor: colors.surface }]}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : String(unreadCount)}</Text>
              </View>
            )}
          </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: tabScreenBottomPadding(insets.bottom) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primaryText} />}
        showsVerticalScrollIndicator={false}
      >
        <WelcomeHeroCard
          userName={user?.displayName}
          activeRfqs={stats.openRfqs}
          totalOffers={stats.totalOffers}
          onAction={() => router.push("/(supplier)/rfqs")}
          actionLabel={t.dashboard.browseOpenRfqs}
        />

        {/* Quick Actions */}
        <View style={styles.quickRow}>
          <QuickActionCard
            title={t.tabs.browseRfqs}
            icon="search"
            bgColor={colors.accentBlueSoft}
            iconColor={colors.cta}
            onPress={() => router.push("/(supplier)/rfqs")}
          />
          <QuickActionCard
            title={t.dashboard.myOffers}
            icon="tag"
            bgColor={colors.accentPurpleSoft}
            iconColor={colors.purpleAccent}
            onPress={() => router.push("/(supplier)/offers")}
          />
        </View>

        {/* Stats strip */}
        <View style={[styles.statsStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: t.dashboard.myOffers, value: stats.totalOffers, color: colors.primaryText, icon: "tag" },
            { label: t.dashboard.pending, value: stats.pending, color: colors.warning, icon: "clock" },
            { label: t.dashboard.accepted, value: stats.accepted, color: colors.success, icon: "check-circle" },
            { label: t.dashboard.openRfqs, value: stats.openRfqs, color: colors.cta, icon: "file-text" },
          ].map((item, i, arr) => (
            <React.Fragment key={item.label}>
              <View style={styles.statItem}>
                <View style={[styles.statIconWrap, { backgroundColor: item.color + "15" }]}>
                  <Feather name={item.icon as any} size={14} color={item.color} />
                </View>
                <Text style={[styles.statValue, { color: item.color, fontFamily: "HankenGrotesk_700Bold" }]}>
                  {item.value}
                </Text>
                <Text style={[styles.statLabel, { color: colors.outline }]}>{item.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>

        {/* Activity card */}
        <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.activityHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text style={[styles.activityTitle, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>
              {t.dashboard.myOffers}
            </Text>
            <TouchableOpacity
              style={[styles.activityViewAll, { flexDirection: isRTL ? "row-reverse" : "row", backgroundColor: colors.accentPurpleSoft }]}
              onPress={() => router.push("/(supplier)/offers")}
            >
              <Text style={[styles.activityViewAllText, { color: colors.purpleAccent }]}>{t.dashboard.viewAll}</Text>
              <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={12} color={colors.purpleAccent} />
            </TouchableOpacity>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <View style={[styles.progressDot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.progressLabel, { color: colors.foreground }]}>{t.dashboard.pending}</Text>
              <View style={{ flex: 1 }} />
              <Text style={[styles.progressCount, { color: colors.warning, fontFamily: "Inter_700Bold" }]}>{stats.pending}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.border }]}>
              <View style={[styles.bar, { width: `${pendingRatio * 100}%`, backgroundColor: colors.warning }]} />
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <View style={[styles.progressDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.progressLabel, { color: colors.foreground }]}>{t.dashboard.accepted}</Text>
              <View style={{ flex: 1 }} />
              <Text style={[styles.progressCount, { color: colors.success, fontFamily: "Inter_700Bold" }]}>{stats.accepted}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.border }]}>
              <View style={[styles.bar, { width: `${acceptedRatio * 100}%`, backgroundColor: colors.success }]} />
            </View>
          </View>

          {/* Mini summary */}
          <View style={[styles.monthRow, { borderTopColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.monthItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <LinearGradient colors={[colors.cta + "22", colors.cta + "08"]} style={styles.monthIconWrap}>
                <Feather name="file-text" size={13} color={colors.cta} />
              </LinearGradient>
              <View>
                <Text style={[styles.monthValue, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>{stats.openRfqs}</Text>
                <Text style={[styles.monthLabel, { color: colors.outline }]}>{t.dashboard.openRfqs}</Text>
              </View>
            </View>
            <View style={[styles.monthDivider, { backgroundColor: colors.border }]} />
            <View style={[styles.monthItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <LinearGradient colors={[colors.primaryText + "22", colors.primaryText + "08"]} style={styles.monthIconWrap}>
                <Feather name="tag" size={13} color={colors.primaryText} />
              </LinearGradient>
              <View>
                <Text style={[styles.monthValue, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>{stats.totalOffers}</Text>
                <Text style={[styles.monthLabel, { color: colors.outline }]}>{t.dashboard.myOffers}</Text>
              </View>
            </View>
          </View>
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
          : offers.slice(0, 3).map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onPress={offer.status === OFFER_STATUS.ACCEPTED ? () => router.push(`/chat/${offer.id}`) : undefined}
            />
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 14 },
  bellBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute", top: -3, right: -3,
    minWidth: 16, height: 16, borderRadius: 8, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold", lineHeight: 13 },
  quickRow: { flexDirection: "row", gap: 12 },
  statsStrip: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statValue: { fontSize: 20 },
  statLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textTransform: "uppercase", textAlign: "center" },
  statDivider: { width: 1, height: 36, marginHorizontal: 2 },
  activityCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  activityHeader: { alignItems: "center", justifyContent: "space-between" },
  activityTitle: { fontSize: 15 },
  activityViewAll: { alignItems: "center", gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  activityViewAllText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  progressSection: { gap: 6 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressDot: { width: 8, height: 8, borderRadius: 4 },
  progressLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  progressCount: { fontSize: 13 },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  bar: { height: "100%", borderRadius: 3 },
  monthRow: { paddingTop: 12, borderTopWidth: 1, alignItems: "center" },
  monthItem: { flex: 1, alignItems: "center", gap: 10 },
  monthIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  monthValue: { fontSize: 18 },
  monthLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", marginTop: 1 },
  monthDivider: { width: 1, height: 32, marginHorizontal: 8 },
});
