import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { tabScreenBottomPadding } from "@/lib/layout";
import { type, space, radius, toneColors, MIN_TOUCH, type Tone } from "@/lib/design";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { isPreview, PREVIEW_CONTRACTOR_RFQS, PREVIEW_CONTRACTOR_STATS } from "@/lib/preview";
import { db } from "@/lib/firebase";
import { RFQCard, RFQItem } from "@/components/RFQCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { DashboardHeader, WelcomeHeroCard, QuickActionCard } from "@/components/ScreenHeader";
import { useNotifications } from "@/hooks/useNotifications";
import { RFQ_STATUSES } from "@/constants/data";
import { AIChatWidget } from "@/components/AIChatWidget";

/**
 * The contractor's home. Every number appears once: the hero says what needs
 * attention (open tenders, offers waiting), the ring shows how the tenders
 * split by status, and the list below is the work itself. The strip and
 * footer that repeated the same three figures are gone.
 */

// ── Donut ring ───────────────────────────────────────────────────────────────
interface DonutSlice { value: number; color: string }

function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

const SLICE_GAP = 3;
function slicePath(cx: number, cy: number, oR: number, iR: number, sDeg: number, eDeg: number) {
  const s = sDeg + SLICE_GAP / 2;
  const e = eDeg - SLICE_GAP / 2;
  if (e - s <= 0) return "";
  const large = e - s > 180 ? 1 : 0;
  const o1 = polarXY(cx, cy, oR, s);
  const o2 = polarXY(cx, cy, oR, e);
  const i1 = polarXY(cx, cy, iR, e);
  const i2 = polarXY(cx, cy, iR, s);
  return `M${o1.x} ${o1.y} A${oR} ${oR} 0 ${large} 1 ${o2.x} ${o2.y} L${i1.x} ${i1.y} A${iR} ${iR} 0 ${large} 0 ${i2.x} ${i2.y} Z`;
}

function DonutChart({
  slices, total, size = 150, textColor, mutedColor, trackColor, label,
}: {
  slices: DonutSlice[]; total: number; size?: number; textColor: string; mutedColor: string; trackColor: string; label: string;
}) {
  const cx = size / 2, cy = size / 2;
  const oR = size / 2 - 4;
  const iR = oR * 0.62;
  let cursor = 0;
  const paths = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const sweep = (s.value / total) * 360;
      const d = slicePath(cx, cy, oR, iR, cursor, cursor + sweep);
      cursor += sweep;
      return { d, color: s.color };
    });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.length === 0 ? (
        <Circle cx={cx} cy={cy} r={(oR + iR) / 2} fill="none" stroke={trackColor} strokeWidth={oR - iR} />
      ) : (
        paths.map((p, i) => <Path key={i} d={p.d} fill={p.color} />)
      )}
      <SvgText x={cx} y={cy - 4} textAnchor="middle" fontSize={24} fill={paths.length ? textColor : mutedColor} fontFamily="Inter_600SemiBold">
        {total}
      </SvgText>
      <SvgText x={cx} y={cy + 16} textAnchor="middle" fontSize={12} fill={mutedColor} fontFamily="Inter_400Regular">
        {label}
      </SvgText>
    </Svg>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
interface RFQStats {
  total: number; draft: number; newRfqs: number; active: number; underReview: number;
  awarded: number; closed: number; inProgress: number; offers: number;
}

const EMPTY_STATS: RFQStats = { total: 0, draft: 0, newRfqs: 0, active: 0, underReview: 0, awarded: 0, closed: 0, inProgress: 0, offers: 0 };

export default function ContractorDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { isRTL } = useLanguage();
  const { user, organization } = useAuth();
  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [stats, setStats] = useState<RFQStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const { unreadCount } = useNotifications();
  const row = isRTL ? "row-reverse" : "row";

  const fetchData = async () => {
    if (isPreview()) {
      setRfqs(PREVIEW_CONTRACTOR_RFQS as RFQItem[]);
      setStats(PREVIEW_CONTRACTOR_STATS);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const orgId = user?.organizationId;
    if (!orgId) { setLoading(false); return; }
    setFetchError(false);
    try {
      // No orderBy — avoids a composite index; sorted client-side.
      const snap = await getDocs(query(collection(db, "rfqs"), where("organizationId", "==", orgId)));
      const items: RFQItem[] = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as RFQItem))
        .sort((a, b) => {
          const ta = typeof a.createdAt?.toDate === "function" ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
          const tb = typeof b.createdAt?.toDate === "function" ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
          return tb - ta;
        });
      let totalOffers = 0;
      for (const rfq of items) {
        rfq.offersCount = typeof rfq.offersCount === "number" ? rfq.offersCount : 0;
        totalOffers += rfq.offersCount;
      }
      setRfqs(items);
      const count = (status: string) => items.filter((r) => r.status === status).length;
      const draft = count("Draft"), newRfqs = count("New"), active = count("Active");
      const underReview = count("Under Review"), awarded = count("Awarded"), closed = count("Closed");
      setStats({
        total: items.length, draft, newRfqs, active, underReview, awarded, closed,
        inProgress: newRfqs + active + underReview + awarded,
        offers: totalOffers,
      });
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.organizationId]);

  const countFor: Record<string, number> = {
    Draft: stats.draft, New: stats.newRfqs, Active: stats.active,
    "Under Review": stats.underReview, Awarded: stats.awarded, Closed: stats.closed,
  };
  const statusRows = RFQ_STATUSES.map((s) => ({
    id: s.id,
    label: isRTL ? s.labelAr : s.label,
    tone: s.tone as Tone,
    count: countFor[s.id] ?? 0,
  }));
  const slices: DonutSlice[] = statusRows.filter((s) => s.count > 0).map((s) => ({ value: s.count, color: toneColors(colors, s.tone).fg }));

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
        onPress={() => router.push("/(contractor)/notifications")}
        accessibilityRole="button"
        accessibilityLabel={t.profile.notifications}
      >
        <Feather name="bell" size={18} color={colors.cta} />
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.destructive, borderColor: colors.surface }]}>
            <Text style={[type.captionStrong, { color: colors.destructiveForeground, fontSize: 12, lineHeight: 20 }]}>
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
            activeRfqs={stats.inProgress}
            totalOffers={stats.offers}
            onAction={() => router.push("/(contractor)/rfqs")}
            actionLabel={t.dashboard.viewAll}
          />

          <View style={[styles.quickRow, { flexDirection: row }]}>
            <QuickActionCard
              title={t.dashboard.createRfq}
              icon="file-plus"
              bgColor={colors.ctaSoft}
              iconColor={colors.cta}
              onPress={() => router.push("/(contractor)/rfqs/create")}
            />
            <QuickActionCard
              title={t.dashboard.myMessages}
              icon="message-circle"
              bgColor={colors.purpleSoft}
              iconColor={colors.purple}
              onPress={() => router.push("/(contractor)/chats")}
            />
          </View>

          {/* Tenders by status */}
          <Card>
            <View style={[styles.cardHeader, { flexDirection: row }]}>
              <View style={[styles.cardHeaderTitle, { flexDirection: row }]}>
                <View style={[styles.cardHeaderIcon, { backgroundColor: colors.ctaSoft }]}>
                  <Feather name="pie-chart" size={14} color={colors.cta} />
                </View>
                <Text style={[type.title, { color: colors.foreground }]}>{t.dashboard.rfqOverview}</Text>
              </View>
              <TouchableOpacity
                style={[styles.linkPill, { flexDirection: row, backgroundColor: colors.ctaSoft }]}
                onPress={() => router.push("/(contractor)/rfqs")}
                accessibilityRole="button"
              >
                <Text style={[type.captionStrong, { color: colors.cta }]}>{t.dashboard.viewAll}</Text>
                <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={12} color={colors.cta} />
              </TouchableOpacity>
            </View>

            <View style={styles.chartCenter}>
              <DonutChart
                slices={slices}
                total={stats.total}
                size={160}
                textColor={colors.foreground}
                mutedColor={colors.mutedForeground}
                trackColor={colors.muted}
                label={t.dashboard.rfqsShort}
              />
            </View>

            {stats.total > 0 && (
              <View style={[styles.legendGrid, { flexDirection: row }]}>
                {statusRows.filter((s) => s.count > 0).map((s) => {
                  const tc = toneColors(colors, s.tone);
                  return (
                    <View key={s.id} style={[styles.legendItem, { flexDirection: row, backgroundColor: tc.bg }]}>
                      <View style={[styles.legendDot, { backgroundColor: tc.fg }]} />
                      <Text style={[type.caption, { flex: 1, color: colors.foreground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
                        {s.label}
                      </Text>
                      <Text style={[type.captionStrong, { color: tc.fg }]}>{s.count}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>

          <SectionHeader title={t.dashboard.recentRfqs} actionLabel={t.dashboard.viewAll} onAction={() => router.push("/(contractor)/rfqs")} />
          {loading
            ? [1, 2, 3].map((k) => <CardSkeleton key={k} />)
            : rfqs.length === 0
            ? <EmptyState icon="file-text" title={t.dashboard.noRfqs} subtitle={t.dashboard.noRfqsDesc} actionLabel={t.dashboard.createRfq} onAction={() => router.push("/(contractor)/rfqs/create")} />
            : rfqs.slice(0, 5).map((rfq) => (
              <RFQCard key={rfq.id} rfq={rfq} onPress={() => router.push(`/(contractor)/rfqs/${rfq.id}`)} showOffers />
            ))}
        </ScrollView>
      )}
      {/* The assistant floats here only: on the list screens it sat on top of the primary action. */}
      <AIChatWidget userRole="Contractor" />
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
  cardHeaderTitle: { alignItems: "center", gap: space.sm, flex: 1 },
  cardHeaderIcon: { width: 28, height: 28, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  linkPill: { alignItems: "center", gap: 2, paddingHorizontal: space.md, minHeight: 36, borderRadius: radius.pill },
  chartCenter: { alignItems: "center", justifyContent: "center", paddingVertical: space.xs },
  legendGrid: { flexWrap: "wrap", gap: space.sm, marginTop: space.md },
  legendItem: { width: "48%", flexGrow: 1, alignItems: "center", gap: 6, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.sm },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
});
