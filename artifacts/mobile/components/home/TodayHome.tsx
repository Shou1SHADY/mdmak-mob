import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNotifications } from "@/hooks/useNotifications";
import { useVisibleModules } from "@/hooks/useCompanyModules";
import { useTodayHome, type HomeDecision } from "@/hooks/useTodayHome";
import { DashboardHeader } from "@/components/ScreenHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { AIChatWidget } from "@/components/AIChatWidget";
import { tabScreenBottomPadding } from "@/lib/layout";
import { type, space, radius, toneColors, MIN_TOUCH, type Tone } from "@/lib/design";
import { siteUrl } from "@/lib/site-api";
import { hasBuiltScreens, visibleItems, type PortalComponentDef } from "@/lib/portal-components";

/** Rows shown before "show more" — a phone screen holds about this many without scrolling past the numbers. */
const FIRST_ROWS = 4;

const fill = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), template);

/**
 * The phone's start screen, for both portals. It answers one question — what needs me today — and
 * then gets out of the way: three numbers, the decisions in order (each opens the screen that settles
 * it, or the website page when that act is desk work), one primary action, and the modules this
 * company has switched on. Charts, the full lists and every setting live in their own tabs or on the
 * website; the home never repeats them.
 */
export function TodayHome() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { isRTL } = useLanguage();
  const { user, organization } = useAuth();
  const { can } = usePermissions();
  const { unreadCount } = useNotifications();
  const { modules, loading: modulesLoading } = useVisibleModules();
  const { decisions, kpis, loading, error, refresh } = useTodayHome();
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [webOpen, setWebOpen] = useState(false);

  const isSupplier = user?.role === "Supplier";
  const row = isRTL ? "row-reverse" : "row";
  const align = isRTL ? "right" : "left";
  const chevron = isRTL ? "chevron-left" : "chevron-right";

  const onPhone = useMemo(() => modules.filter((m) => hasBuiltScreens(m, can)), [modules, can]);
  const onWeb = useMemo(() => modules.filter((m) => !hasBuiltScreens(m, can)), [modules, can]);

  const openWeb = (path: string) => void WebBrowser.openBrowserAsync(siteUrl(path));
  const openModule = (mod: PortalComponentDef) => {
    const items = visibleItems(mod.items, can);
    const home = items.find((i) => i.href === mod.homeHref && i.built) ?? items.find((i) => i.built);
    if (home) router.push(home.href as never);
    else openWeb(mod.homeHref);
  };
  const label = (mod: PortalComponentDef) => t.modules.labels[mod.labelKey as keyof typeof t.modules.labels] ?? mod.labelKey;

  // Each decision: what it says, its urgency, and where it opens.
  const describe = (d: HomeDecision): { title: string; meta: string; tone: Tone; icon: React.ComponentProps<typeof Feather>["name"]; open: () => void; web: boolean } => {
    const h = t.home;
    switch (d.kind) {
      case "rfq_closing":
        return { title: fill(d.overdue ? h.rfqOverdue : h.rfqClosing, { title: d.title, hours: d.hoursLeft }), meta: "", tone: d.overdue ? "destructive" : "warning", icon: "clock", open: () => router.push(d.href as never), web: false };
      case "delivery_confirm":
        return { title: fill(h.deliveryConfirm, { title: d.title }), meta: d.supplierName ? fill(h.deliveryFrom, { supplier: d.supplierName }) : "", tone: "cta", icon: "package", open: () => router.push(d.href as never), web: false };
      case "offers_to_review":
        return { title: fill(h.offersToReview, { count: d.count, title: d.title }), meta: "", tone: "cta", icon: "inbox", open: () => router.push(d.href as never), web: false };
      case "po_approve":
        return { title: fill(h.poApprove, { number: d.docNumber }), meta: d.supplierName ? fill(h.poApproveFor, { supplier: d.supplierName }) : "", tone: "cta", icon: "check-square", open: () => openWeb(d.href), web: true };
      case "rfq_no_offers":
        return { title: fill(h.rfqNoOffers, { title: d.title, days: d.daysOpen }), meta: "", tone: "neutral", icon: "alert-circle", open: () => router.push(d.href as never), web: false };
      case "po_to_accept":
        return { title: fill(h.poToAccept, { number: d.docNumber }), meta: [d.rfqTitle, fill(h.waitingDays, { days: d.waitingDays })].filter(Boolean).join(" · "), tone: d.waitingDays >= 2 ? "warning" : "cta", icon: "clipboard", open: () => openWeb(d.href), web: true };
      case "rfq_to_answer":
        return {
          title: fill(h.rfqToAnswer, { title: d.title }),
          meta: d.daysLeft === null ? "" : d.daysLeft <= 0 ? h.closesToday : fill(h.closesIn, { days: d.daysLeft }),
          tone: d.daysLeft !== null && d.daysLeft <= 1 ? "warning" : "neutral",
          icon: "file-text",
          open: () => router.push(`/(supplier)/rfq/${d.rfqId}` as never),
          web: false,
        };
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const hour = new Date().getHours();
  const firstName = (user?.displayName || "").trim().split(/\s+/)[0] || "";
  const shown = expanded ? decisions : decisions.slice(0, FIRST_ROWS);
  const primary = isSupplier
    ? can("offers.view") ? { label: t.dashboard.browseRfqs, go: () => router.push("/(supplier)/rfqs") } : null
    : can("rfq.create") || can("rfq.manage") ? { label: t.dashboard.newRfq, go: () => router.push("/(contractor)/rfqs/create") } : null;

  const bell = (
    <TouchableOpacity
      style={[styles.iconBtn, { backgroundColor: colors.muted }]}
      onPress={() => router.push(isSupplier ? "/(supplier)/notifications" : "/(contractor)/notifications")}
      accessibilityRole="button"
      accessibilityLabel={t.profile.notifications}
    >
      <Feather name="bell" size={18} color={colors.foreground} />
      {unreadCount > 0 && (
        <View style={[styles.badge, isRTL ? { left: -4 } : { right: -4 }, { backgroundColor: colors.destructive, borderColor: colors.surface }]}>
          <Text style={[type.captionStrong, { color: colors.destructiveForeground, fontSize: 12, lineHeight: 20 }]}>
            {unreadCount > 99 ? "99+" : String(unreadCount)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DashboardHeader orgName={organization?.name} userName={user?.displayName} right={bell} />
      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.xl, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.cta} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[type.title, { color: colors.foreground, textAlign: align }]}>
          {hour < 12 ? t.home.morning : t.home.evening}{firstName ? `${isRTL ? "، " : ", "}${firstName}` : ""}
        </Text>

        {/* The numbers — each opens the list it counts. */}
        {kpis.length > 0 && (
          <View style={[styles.kpis, { flexDirection: row }]}>
            {kpis.map((k) => (
              <TouchableOpacity
                key={k.key}
                onPress={() => router.push(k.href as never)}
                accessibilityRole="button"
                accessibilityLabel={`${t.home[k.key as keyof typeof t.home]}: ${k.value}`}
                style={[styles.kpi, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[type.display, { color: colors.foreground, textAlign: align }]}>{loading ? "–" : k.value}</Text>
                <Text style={[type.caption, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={2}>
                  {t.home[k.key as keyof typeof t.home]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {primary && <Button title={primary.label} onPress={primary.go} />}

        {/* What needs this person — the reason to open the app. */}
        <View style={{ gap: space.sm }}>
          <Text style={[type.title, { color: colors.foreground, textAlign: align }]}>{t.home.needsYou}</Text>
          {loading ? (
            <CardSkeleton />
          ) : error ? (
            <EmptyState variant="error" icon="wifi-off" title={t.home.loadFailed} actionLabel={t.errors.tryAgain} onAction={() => void refresh()} />
          ) : decisions.length === 0 ? (
            <Card style={{ alignItems: "center", gap: space.xs }}>
              <Feather name="check-circle" size={24} color={colors.success} />
              <Text style={[type.bodyStrong, { color: colors.foreground }]}>{t.home.allClear}</Text>
              <Text style={[type.caption, { color: colors.mutedForeground, textAlign: "center" }]}>{t.home.allClearDesc}</Text>
            </Card>
          ) : (
            <Card style={{ padding: 0 }}>
              {shown.map((d, i) => {
                const v = describe(d);
                const tone = toneColors(colors, v.tone);
                return (
                  <TouchableOpacity
                    key={d.id}
                    onPress={v.open}
                    accessibilityRole={v.web ? "link" : "button"}
                    accessibilityHint={v.web ? t.home.onWeb : undefined}
                    style={[styles.decision, { flexDirection: row, borderTopColor: colors.border, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth }]}
                  >
                    <View style={[styles.decisionIcon, { backgroundColor: tone.bg }]}>
                      <Feather name={v.icon} size={16} color={tone.fg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[type.bodyStrong, { color: colors.foreground, textAlign: align }]} numberOfLines={2}>{v.title}</Text>
                      {!!v.meta && (
                        <Text style={[type.caption, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={1}>{v.meta}</Text>
                      )}
                    </View>
                    <Feather name={v.web ? "external-link" : chevron} size={16} color={colors.outline} />
                  </TouchableOpacity>
                );
              })}
              {decisions.length > FIRST_ROWS && (
                <TouchableOpacity
                  onPress={() => setExpanded((x) => !x)}
                  accessibilityRole="button"
                  style={[styles.more, { borderTopColor: colors.border }]}
                >
                  <Text style={[type.captionStrong, { color: colors.cta }]}>
                    {expanded ? t.home.showLess : fill(t.home.showMore, { n: decisions.length - FIRST_ROWS })}
                  </Text>
                </TouchableOpacity>
              )}
            </Card>
          )}
        </View>

        {/* The company's modules — one quiet colour; the decisions above carry the urgency. */}
        {!modulesLoading && onPhone.length > 0 && (
          <View style={{ gap: space.sm }}>
            <Text style={[type.title, { color: colors.foreground, textAlign: align }]}>{t.home.yourModules}</Text>
            <View style={[styles.grid, { flexDirection: row }]}>
              {onPhone.map((mod) => (
                <TouchableOpacity
                  key={mod.id}
                  onPress={() => openModule(mod)}
                  accessibilityRole="button"
                  accessibilityLabel={label(mod)}
                  style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: row }]}
                >
                  <View style={[styles.tileIcon, { backgroundColor: colors.muted }]}>
                    <Feather name={mod.icon} size={18} color={colors.primaryText} />
                  </View>
                  <Text style={[type.bodyStrong, { flex: 1, color: colors.foreground, textAlign: align }]} numberOfLines={2}>{label(mod)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {!modulesLoading && onWeb.length > 0 && (
          <Card style={{ padding: 0 }}>
            <TouchableOpacity
              onPress={() => setWebOpen((x) => !x)}
              accessibilityRole="button"
              accessibilityState={{ expanded: webOpen }}
              style={[styles.decision, { flexDirection: row }]}
            >
              <View style={[styles.decisionIcon, { backgroundColor: colors.muted }]}>
                <Feather name="monitor" size={16} color={colors.primaryText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.bodyStrong, { color: colors.foreground, textAlign: align }]}>{t.home.moreOnWeb}</Text>
                <Text style={[type.caption, { color: colors.mutedForeground, textAlign: align }]}>{t.home.moreOnWebDesc}</Text>
              </View>
              <Feather name={webOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.outline} />
            </TouchableOpacity>
            {webOpen &&
              onWeb.map((mod) => (
                <TouchableOpacity
                  key={mod.id}
                  onPress={() => openWeb(mod.homeHref)}
                  accessibilityRole="link"
                  style={[styles.decision, { flexDirection: row, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}
                >
                  <Feather name={mod.icon} size={16} color={colors.mutedForeground} />
                  <Text style={[type.body, { flex: 1, color: colors.foreground, textAlign: align }]}>{label(mod)}</Text>
                  <Feather name="external-link" size={14} color={colors.outline} />
                </TouchableOpacity>
              ))}
          </Card>
        )}
      </ScrollView>
      <AIChatWidget userRole={isSupplier ? "Supplier" : "Contractor"} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", top: -4, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  kpis: { gap: space.sm },
  kpi: { flex: 1, minHeight: 88, padding: space.md, borderRadius: radius.card, borderWidth: 1, justifyContent: "space-between" },
  decision: { minHeight: 60, paddingHorizontal: space.lg, paddingVertical: space.md, alignItems: "center", gap: space.md },
  decisionIcon: { width: 32, height: 32, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  more: { minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center", borderTopWidth: StyleSheet.hairlineWidth },
  grid: { flexWrap: "wrap", gap: space.sm },
  tile: { width: "48.5%", minHeight: 64, padding: space.md, borderRadius: radius.card, borderWidth: 1, alignItems: "center", gap: space.sm },
  tileIcon: { width: 36, height: 36, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
});
