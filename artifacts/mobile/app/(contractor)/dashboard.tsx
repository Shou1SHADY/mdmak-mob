import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Platform,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle, Text as SvgText } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { RFQCard, RFQItem } from "@/components/RFQCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DashboardHeader, WelcomeHeroCard, QuickActionCard } from "@/components/ScreenHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications } from "@/hooks/useNotifications";
import { RFQ_STATUSES } from "@/constants/data";

// ── Donut chart ───────────────────────────────────────────────────────────────
interface DonutSlice { value: number; color: string; }

function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx: number, cy: number, oR: number, iR: number, sDeg: number, eDeg: number) {
  const gap = slicePath.GAP / 2;
  const s = sDeg + gap;
  const e = eDeg - gap;
  if (e - s <= 0) return "";
  const large = e - s > 180 ? 1 : 0;
  const o1 = polarXY(cx, cy, oR, s);
  const o2 = polarXY(cx, cy, oR, e);
  const i1 = polarXY(cx, cy, iR, e);
  const i2 = polarXY(cx, cy, iR, s);
  return `M${o1.x} ${o1.y} A${oR} ${oR} 0 ${large} 1 ${o2.x} ${o2.y} L${i1.x} ${i1.y} A${iR} ${iR} 0 ${large} 0 ${i2.x} ${i2.y} Z`;
}
slicePath.GAP = 3;

function DonutChart({ slices, total, size = 150, textColor = "#0F172A" }: { slices: DonutSlice[]; total: number; size?: number; textColor?: string }) {
  const cx = size / 2;
  const cy = size / 2;
  const oR = size / 2 - 4;
  const iR = oR * 0.58;

  let cursor = 0;
  const paths = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const sweep = (s.value / total) * 360;
      const d = slicePath(cx, cy, oR, iR, cursor, cursor + sweep);
      cursor += sweep;
      return { d, color: s.color };
    });

  if (paths.length === 0) {
    return (
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={cx} cy={cy} r={oR} fill="none" stroke="#E2E8F0" strokeWidth={oR - iR} />
        <SvgText x={cx} y={cy - 4} textAnchor="middle" fontSize={16} fontWeight="700" fill="#94a3b8" fontFamily="HankenGrotesk_700Bold">0</SvgText>
        <SvgText x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="#94a3b8" fontFamily="Inter_500Medium">RFQs</SvgText>
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p, i) => <Path key={i} d={p.d} fill={p.color} />)}
      <Circle cx={cx} cy={cy} r={iR - 2} fill="none" />
      <SvgText x={cx} y={cy - 6} textAnchor="middle" fontSize={22} fontWeight="700" fill={textColor} fontFamily="HankenGrotesk_700Bold">{total}</SvgText>
      <SvgText x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="#94a3b8" fontFamily="Inter_500Medium">RFQs</SvgText>
    </Svg>
  );
}

// ── Status types ──
interface RFQStats {
  total: number;
  draft: number;
  newRfqs: number;
  active: number;
  underReview: number;
  awarded: number;
  closed: number;
  inProgress: number;
  offers: number;
}

export default function ContractorDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { isRTL } = useLanguage();
  const { user, organization } = useAuth();
  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [stats, setStats] = useState<RFQStats>({
    total: 0, draft: 0, newRfqs: 0, active: 0, underReview: 0,
    awarded: 0, closed: 0, inProgress: 0, offers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { unreadCount } = useNotifications();

  const fetchData = async () => {
    const orgId = user?.organizationId;
    if (!orgId) { setLoading(false); return; }
    try {
      // ⚠️ No orderBy here — avoids Firestore composite index requirement.
      // We sort client-side below.
      const snap = await getDocs(query(
        collection(db, "rfqs"),
        where("organizationId", "==", orgId)
      ));

      const items: RFQItem[] = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as RFQItem))
        .sort((a, b) => {
          const ta = typeof a.createdAt?.toDate === "function" ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
          const tb = typeof b.createdAt?.toDate === "function" ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
          return tb - ta; // newest first
        });

      let totalOffers = 0;
      for (const rfq of items) {
        const offSnap = await getDocs(query(collection(db, "offers"), where("rfqId", "==", rfq.id)));
        rfq.offersCount = offSnap.size;
        totalOffers += offSnap.size;
      }
      setRfqs(items);

      const draft        = items.filter((r) => r.status === "Draft").length;
      const newRfqs      = items.filter((r) => r.status === "New").length;
      const active       = items.filter((r) => r.status === "Active").length;
      const underReview  = items.filter((r) => r.status === "Under Review").length;
      const awarded      = items.filter((r) => r.status === "Awarded").length;
      const closed       = items.filter((r) => r.status === "Closed").length;

      setStats({
        total: items.length,
        draft,
        newRfqs,
        active,
        underReview,
        awarded,
        closed,
        inProgress: newRfqs + active + underReview + awarded,
        offers: totalOffers,
      });
    } catch (e) {
      console.warn("[Dashboard] fetchData error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.organizationId]);

  const statusRows = [
    { id: "Draft",        count: stats.draft,       color: "#94a3b8", labelAr: "مسودة",         labelEn: "Draft"        },
    { id: "New",          count: stats.newRfqs,     color: "#3b82f6", labelAr: "جديد",          labelEn: "New"          },
    { id: "Active",       count: stats.active,      color: "#06b6d4", labelAr: "نشط",           labelEn: "Active"       },
    { id: "Under Review", count: stats.underReview, color: "#f59e0b", labelAr: "قيد المراجعة",  labelEn: "Under Review" },
    { id: "Awarded",      count: stats.awarded,     color: "#12A063", labelAr: "تم الترسية",    labelEn: "Awarded"      },
    { id: "Closed",       count: stats.closed,      color: "#22c55e", labelAr: "مغلق",          labelEn: "Closed"       },
  ];

  const donutSlices: DonutSlice[] = statusRows
    .filter((s) => s.count > 0)
    .map((s) => ({ value: s.count, color: s.color }));

  const pct = (n: number) => stats.total > 0 ? Math.round((n / stats.total) * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DashboardHeader
        orgName={organization?.name}
        userName={user?.displayName}
        right={
          <TouchableOpacity
            style={[styles.bellBtn, { backgroundColor: colors.accentBlueSoft }]}
            onPress={() => router.push("/(contractor)/notifications")}
          >
            <Feather name="bell" size={18} color={colors.cta} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: colors.destructive, borderColor: colors.surface }]}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : String(unreadCount)}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 90) }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <WelcomeHeroCard
          userName={user?.displayName}
          activeRfqs={stats.inProgress}
          totalOffers={stats.offers}
          onAction={() => router.push("/(contractor)/rfqs/index")}
          actionLabel={t.dashboard.viewAll}
        />

        {/* Quick Actions */}
        <View style={styles.quickRow}>
          <QuickActionCard
            title={t.dashboard.createRfq}
            icon="file-plus"
            bgColor={colors.accentBlueSoft}
            iconColor={colors.cta}
            onPress={() => router.push("/(contractor)/rfqs/create")}
          />
          <QuickActionCard
            title={t.dashboard.browseSuppliers}
            icon="users"
            bgColor={colors.accentPurpleSoft}
            iconColor={colors.purpleAccent}
            onPress={() => router.push("/(contractor)/suppliers")}
          />
        </View>

        {/* Stats strip */}
        <View style={[styles.statsStrip, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: t.dashboard.totalRfqs, value: stats.total,      color: colors.primary, icon: "file-text"    },
            { label: t.dashboard.active,     value: stats.inProgress,  color: colors.cta,     icon: "activity"     },
            { label: t.dashboard.offersIn,   value: stats.offers,      color: colors.success, icon: "tag"          },
            { label: t.dashboard.closed,     value: stats.closed,      color: "#22c55e",      icon: "check-circle" },
          ].map((item, i, arr) => (
            <React.Fragment key={item.label}>
              <View style={styles.statItem}>
                <View style={[styles.statIconWrap, { backgroundColor: item.color + "18" }]}>
                  <Feather name={item.icon as any} size={14} color={item.color} />
                </View>
                <Text style={[styles.statValue, { color: item.color, fontFamily: "HankenGrotesk_700Bold" }]}>
                  {item.value}
                </Text>
                <Text style={[styles.statLabel, { color: colors.outline }]} numberOfLines={1}>{item.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── Donut Chart Overview ───────────────────────────── */}
        <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

          {/* Header */}
          <View style={[styles.cardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.cta + "14" }]}>
                <Feather name="pie-chart" size={14} color={colors.cta} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>
                {t.dashboard.rfqOverview}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.viewAllPill, { flexDirection: isRTL ? "row-reverse" : "row", backgroundColor: colors.accentBlueSoft }]}
              onPress={() => router.push("/(contractor)/rfqs/index")}
            >
              <Text style={[styles.viewAllPillText, { color: colors.cta }]}>{t.dashboard.viewAll}</Text>
              <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={12} color={colors.cta} />
            </TouchableOpacity>
          </View>

          {/* Donut — centered */}
          <View style={styles.chartCenter}>
            <DonutChart
              slices={donutSlices}
              total={stats.total}
              size={160}
              textColor={colors.foreground}
            />
          </View>

          {/* Legend — 2-column grid, only non-zero statuses */}
          {stats.total > 0 && (
            <View style={styles.legendGrid}>
              {statusRows.filter((s) => s.count > 0).map((s) => (
                <View
                  key={s.id}
                  style={[
                    styles.legendItem,
                    { flexDirection: isRTL ? "row-reverse" : "row", borderColor: s.color + "28", backgroundColor: s.color + "0C" },
                  ]}
                >
                  <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                  <Text style={[styles.legendLabel, { color: colors.outline }]} numberOfLines={1}>
                    {isRTL ? s.labelAr : s.labelEn}
                  </Text>
                  <Text style={[styles.legendCount, { color: s.color }]}>{s.count}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer stats */}
          <View style={[styles.overviewFooter, { borderTopColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={styles.footerStat}>
              <View style={[styles.footerIconWrap, { backgroundColor: colors.primary + "14" }]}>
                <Feather name="file-text" size={13} color={colors.primary} />
              </View>
              <Text style={[styles.footerValue, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>{stats.total}</Text>
              <Text style={[styles.footerLabel, { color: colors.outline }]}>{t.dashboard.totalRfqs}</Text>
            </View>
            <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
            <View style={styles.footerStat}>
              <View style={[styles.footerIconWrap, { backgroundColor: colors.warning + "14" }]}>
                <Feather name="tag" size={13} color={colors.warning} />
              </View>
              <Text style={[styles.footerValue, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>{stats.offers}</Text>
              <Text style={[styles.footerLabel, { color: colors.outline }]}>{t.dashboard.offersIn}</Text>
            </View>
            <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
            <View style={styles.footerStat}>
              <View style={[styles.footerIconWrap, { backgroundColor: colors.cta + "14" }]}>
                <Feather name="activity" size={13} color={colors.cta} />
              </View>
              <Text style={[styles.footerValue, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>{stats.inProgress}</Text>
              <Text style={[styles.footerLabel, { color: colors.outline }]}>{t.dashboard.active}</Text>
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
          ? <EmptyState icon="file-text" title={t.dashboard.noRfqs} subtitle={t.dashboard.noRfqsDesc} actionLabel={t.dashboard.createRfq} onAction={() => router.push("/(contractor)/rfqs/create")} />
          : rfqs.slice(0, 5).map((rfq) => (
            <RFQCard key={rfq.id} rfq={rfq} onPress={() => router.push(`/(contractor)/rfqs/${rfq.id}`)} showOffers />
          ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 14 },
  bellBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute", top: -3, right: -3,
    minWidth: 16, height: 16, borderRadius: 8, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold", lineHeight: 13 },
  quickRow: { flexDirection: "row", gap: 12 },

  // Stats strip
  statsStrip: {
    flexDirection: "row", borderRadius: 14, borderWidth: 1,
    paddingVertical: 14, paddingHorizontal: 6, alignItems: "center",
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statValue: { fontSize: 20 },
  statLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.3, textAlign: "center" },
  statDivider: { width: 1, height: 36, marginHorizontal: 2 },

  // Overview card
  overviewCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
  cardHeader: { alignItems: "center", justifyContent: "space-between" },
  cardHeaderIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15 },
  viewAllPill: { alignItems: "center", gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  viewAllPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Donut + legend
  chartCenter: { alignItems: "center", justifyContent: "center", paddingVertical: 4 },
  legendGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  legendItem: {
    width: "47%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  legendDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  legendLabel: { flex: 1, fontSize: 11, fontFamily: "Inter_500Medium" },
  legendCount: { fontSize: 13, fontFamily: "Inter_700Bold", flexShrink: 0 },

  // Footer
  overviewFooter: { paddingTop: 14, borderTopWidth: 1, alignItems: "center" },
  footerStat: { flex: 1, alignItems: "center", gap: 4 },
  footerIconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  footerValue: { fontSize: 18 },
  footerLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.3, textAlign: "center" },
  footerDivider: { width: 1, height: 32, marginHorizontal: 6 },
});
