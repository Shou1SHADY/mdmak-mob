import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { tabScreenBottomPadding } from "@/lib/layout";
import { type, space, radius, toneColors, MIN_TOUCH, type Tone } from "@/lib/design";
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
import { Card } from "@/components/ui/Card";
import { DashboardHeader, WelcomeHeroCard, QuickActionCard } from "@/components/ScreenHeader";
import { useNotifications } from "@/hooks/useNotifications";
import { AIChatWidget } from "@/components/AIChatWidget";

/**
 * The supplier's home. The hero says what is open to bid on and how many
 * offers are out; one card shows how those offers are doing; the two lists
 * below are the work. The strip and summary that repeated the figures are gone.
 */
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
  const row = isRTL ? "row-reverse" : "row";
  const align = isRTL ? "right" : "left";

  const fetchData = async () => {
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
        collection(db, "offers"), where("organizationId", "==", orgId), orderBy("createdAt", "desc"), limit(10)
      ));
      const offerItems = offSnap.docs.map((d) => ({ id: d.id, ...d.data() } as OfferItem));
      setOffers(offerItems);

      // Public only — a supplier never sees another contractor's private RFQs here.
      const rfqSnap = await getDocs(query(
        collection(db, "rfqs"), where("status", "==", "New"), where("visibility", "==", "public"), orderBy("createdAt", "desc"), limit(5)
      ));
      setRecentRfqs(rfqSnap.docs.map((d) => ({ id: d.id, ...d.data() } as RFQItem)));

      setStats({
        totalOffers: offerItems.length,
        pending: offerItems.filter((o) => o.status === OFFER_STATUS.UNDER_REVIEW).length,
        accepted: offerItems.filter((o) => o.status === OFFER_STATUS.ACCEPTED).length,
        openRfqs: rfqSnap.size,
      });
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.organizationId]);

  const ratio = (n: number) => (stats.totalOffers > 0 ? n / stats.totalOffers : 0);
  const bars: { label: string; value: number; tone: Tone }[] = [
    { label: t.dashboard.pending, value: stats.pending, tone: "warning" },
    { label: t.dashboard.accepted, value: stats.accepted, tone: "success" },
  ];

  const headerRight = (
    <View style={{ flexDirection: row, alignItems: "center", gap: space.sm }}>
      <TouchableOpacity
        style={[styles.iconBtn, { backgroundColor: colors.ctaSoft }]}
        onPress={() => router.push("/apps")}
        accessibilityRole="button"
        accessibilityLabel={t.modules.launcherTitle}
      >
        <Feather name="grid" size={18} color={colors.cta} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.iconBtn, { backgroundColor: colors.ctaSoft }]}
        onPress={() => router.push("/(supplier)/notifications")}
        accessibilityRole="button"
        accessibilityLabel={t.profile.notifications}
      >
        <Feather name="bell" size={18} color={colors.cta} />
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.destructive, borderColor: colors.surface }]}>
            <Text style={[type.captionStrong, { color: colors.destructiveForeground, fontSize: 10, lineHeight: 14 }]}>
              {unreadCount > 99 ? "99+" : String(unreadCount)}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DashboardHeader orgName={organization?.name} userName={user?.displayName} right={headerRight} />

      {fetchError && !loading ? (
        <EmptyState
          variant="error"
          icon="wifi-off"
          title={t.errors.somethingWentWrong}
          actionLabel={t.errors.tryAgain}
          onAction={() => { setLoading(true); fetchData(); }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: tabScreenBottomPadding(insets.bottom) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.cta} />}
          showsVerticalScrollIndicator={false}
        >
          <WelcomeHeroCard
            userName={user?.displayName}
            activeRfqs={stats.openRfqs}
            totalOffers={stats.totalOffers}
            onAction={() => router.push("/(supplier)/rfqs")}
            actionLabel={t.dashboard.browseOpenRfqs}
          />

          <View style={[styles.quickRow, { flexDirection: row }]}>
            <QuickActionCard
              title={t.tabs.browseRfqs}
              icon="search"
              bgColor={colors.ctaSoft}
              iconColor={colors.cta}
              onPress={() => router.push("/(supplier)/rfqs")}
            />
            <QuickActionCard
              title={t.dashboard.myOffers}
              icon="tag"
              bgColor={colors.purpleSoft}
              iconColor={colors.purple}
              onPress={() => router.push("/(supplier)/offers")}
            />
          </View>

          {/* How the offers are doing */}
          <Card>
            <View style={[styles.cardHeader, { flexDirection: row }]}>
              <Text style={[type.title, { color: colors.foreground, flex: 1, textAlign: align }]}>{t.dashboard.myOffers}</Text>
              <TouchableOpacity
                style={[styles.linkPill, { flexDirection: row, backgroundColor: colors.ctaSoft }]}
                onPress={() => router.push("/(supplier)/offers")}
                accessibilityRole="button"
              >
                <Text style={[type.captionStrong, { color: colors.cta }]}>{t.dashboard.viewAll}</Text>
                <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={12} color={colors.cta} />
              </TouchableOpacity>
            </View>
            {bars.map((b) => {
              const tc = toneColors(colors, b.tone);
              return (
                <View key={b.label} style={styles.progressSection}>
                  <View style={[styles.progressRow, { flexDirection: row }]}>
                    <View style={[styles.progressDot, { backgroundColor: tc.fg }]} />
                    <Text style={[type.body, { color: colors.foreground, flex: 1, textAlign: align }]}>{b.label}</Text>
                    <Text style={[type.bodyStrong, { color: tc.fg }]}>{b.value}</Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: colors.muted, flexDirection: row }]}>
                    <View style={[styles.bar, { width: `${ratio(b.value) * 100}%`, backgroundColor: tc.fg }]} />
                  </View>
                </View>
              );
            })}
          </Card>

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
            : offers.length === 0
            ? <EmptyState icon="tag" title={t.dashboard.noOffers} subtitle={t.dashboard.noOffersDesc} />
            : offers.slice(0, 3).map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                onPress={offer.status === OFFER_STATUS.ACCEPTED ? () => router.push(`/chat/${offer.id}`) : undefined}
              />
            ))}
        </ScrollView>
      )}
      {/* The assistant floats here only: on the list screens it sat on top of the primary action. */}
      <AIChatWidget userRole="Supplier" />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.lg, gap: space.lg },
  iconBtn: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute", top: -4, right: -4,
    minWidth: 18, height: 18, borderRadius: radius.pill, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 4,
  },
  quickRow: { gap: space.md },
  cardHeader: { alignItems: "center", justifyContent: "space-between", marginBottom: space.md, gap: space.sm },
  linkPill: { alignItems: "center", gap: 2, paddingHorizontal: space.md, minHeight: 36, borderRadius: radius.pill },
  progressSection: { gap: 6, marginBottom: space.md },
  progressRow: { alignItems: "center", gap: space.sm },
  progressDot: { width: 8, height: 8, borderRadius: 4 },
  track: { height: 6, borderRadius: radius.hairline, overflow: "hidden" },
  bar: { height: "100%", borderRadius: radius.hairline },
});
