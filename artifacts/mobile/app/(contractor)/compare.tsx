import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator, ScrollView, Alert,
} from "react-native";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { headerTopPadding, tabScreenBottomPadding } from "@/lib/layout";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { usePermissions } from "@/hooks/usePermissions";
import { EmptyState } from "@/components/ui/EmptyState";
import * as WebBrowser from "expo-web-browser";
import { awardPath } from "@/lib/award-writes";
import { siteUrl } from "@/lib/site-api";

interface RFQRow {
  id: string;
  title: string;
  status: string;
  deadline?: string;
  offersCount: number;
}

interface OfferRow {
  isGuestOffer?: boolean;
  id: string;
  supplierName?: string;
  companyName?: string;
  supplierId?: string;
  price: string | number;
  executionDuration?: string;
  executionDurationUnit?: string;
  createdAt?: string;
  status: string;
  rfqTitle?: string;
  organizationId?: string;
}

type SortKey = "price" | "duration" | "date";

export default function CompareScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { isRTL } = useLanguage();
  const { user, organization } = useAuth();
  const { can } = usePermissions();

  const [rfqs, setRfqs] = useState<RFQRow[]>([]);
  const [rfqLoading, setRfqLoading] = useState(true);
  const [rfqError, setRfqError] = useState<string | null>(null);

  const [selectedRfq, setSelectedRfq] = useState<RFQRow | null>(null);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("price");

  /* ── Load RFQs that have offers ── */
  // `rfqReload` is what Retry bumps: the loader lives in this effect, so
  // clearing the error alone left the screen spinning with nothing in flight.
  const [rfqReload, setRfqReload] = useState(0);
  useEffect(() => {
    const load = async () => {
      const orgId = user?.organizationId;
      if (!orgId) { setRfqLoading(false); return; }
      setRfqError(null);
      try {
        const snap = await getDocs(query(
          collection(db, "rfqs"),
          where("organizationId", "==", orgId),
          orderBy("createdAt", "desc"),
        ));
        const results = await Promise.allSettled(
          snap.docs.map((d) =>
            getDocs(query(collection(db, "offers"), where("rfqId", "==", d.id)))
              .then((offSnap) => ({ d, offSnap }))
          )
        );
        const rows: RFQRow[] = [];
        for (const r of results) {
          if (r.status === "fulfilled" && r.value.offSnap.size > 0) {
            // Spread first: the live count must win over the document's own
            // `offersCount`, which drifts up when an offer is withdrawn.
            rows.push({ ...(r.value.d.data() as any), id: r.value.d.id, offersCount: r.value.offSnap.size });
          }
        }
        setRfqs(rows);
      } catch (e: any) {
        setRfqError(e?.message || (t.compare.failedToLoadRfqs));
      } finally {
        setRfqLoading(false);
      }
    };
    load();
  }, [user?.organizationId, rfqReload]);

  /* ── Load offers for selected RFQ ── */
  const loadOffers = useCallback(async (rfq: RFQRow) => {
    setSelectedRfq(rfq);
    setOffersLoading(true);
    setOffersError(null);
    try {
      const snap = await getDocs(query(
        collection(db, "offers"),
        where("rfqId", "==", rfq.id),
        orderBy("createdAt", "desc"),
      ));
      setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() } as OfferRow)));
    } catch (e: any) {
      setOffersError(e?.message || (t.compare.failedToLoadOffers));
    } finally {
      setOffersLoading(false);
    }
  }, [isRTL]);

  /* ── Award ── */
  // The phone does not award. Awarding now prepares a purchase order for
  // Finance and tells the supplier nothing until that order is sent, and
  // writing only the first half here would leave an award nobody can approve
  // and a supplier who never hears (see lib/award-writes.ts).
  const handleAward = (offer: OfferRow) => {
    if (!selectedRfq) return;
    if (!can("offers.accept")) {
      Alert.alert(t.errors.noPermissionTitle, t.errors.noPermission);
      return;
    }
    const rfqId = selectedRfq.id;
    Alert.alert(t.rfq.awardOnWeb, undefined, [
      { text: t.common.cancel, style: "cancel" },
      { text: t.rfq.openAward, onPress: () => void WebBrowser.openBrowserAsync(siteUrl(awardPath(rfqId))) },
    ]);
  };

  /* ── Helpers ── */
  const durInDays = (o: OfferRow) => {
    const n = parseInt(o.executionDuration ?? "") || 0;
    if (!n) return Infinity;
    const u = o.executionDurationUnit ?? "";
    return n * (u === "أشهر" ? 30 : u === "أسابيع" ? 7 : 1);  // ui-ok: stored duration unit values
  };

  const fmtDurUnit = (unit?: string) => {
    if (!unit) return isRTL ? t.compare.days : t.compare.days;
    if (!isRTL) {
      const map: Record<string, string> = { "أيام": t.compare.days, "أسابيع": t.compare.weeks, "أشهر": t.compare.months };
      return map[unit] ?? unit;
    }
    return unit;
  };

  const sortedOffers = [...offers].sort((a, b) => {
    if (sortBy === "price") return (parseFloat(String(a.price)) || 0) - (parseFloat(String(b.price)) || 0);
    if (sortBy === "duration") return durInDays(a) - durInDays(b);
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  });

  const lowestPrice = sortedOffers.length > 0
    ? Math.min(...sortedOffers.map(o => parseFloat(String(o.price)) || 0))
    : null;

  const fmtDate = (ts?: string) => {
    if (!ts) return "";
    try {
      return new Date(ts).toLocaleDateString(isRTL ? "ar-SA" : "en-US", { month: "short", day: "numeric" });
    } catch { return ""; }
  };

  const statusLabel = (s: string) => {
    if (s === "مقبول") return t.compare.accepted;  // ui-ok: stored offer status value
    if (s === "مرفوض") return t.compare.rejected;  // ui-ok: stored offer status value
    if (s === "مطلوب تخفيض") return t.compare.reduction;  // ui-ok: stored offer status value
    return t.compare.pending;
  };
  const statusColor = (s: string) => {
    if (s === "مقبول") return colors.success;  // ui-ok: stored offer status value
    if (s === "مرفوض") return colors.destructive;  // ui-ok: stored offer status value
    if (s === "مطلوب تخفيض") return colors.warning;  // ui-ok: stored offer status value
    return colors.cta;
  };

  const topPad = headerTopPadding(insets.top, 16);

  /* ══════════════════════════════════════════
     VIEW A — RFQ list
  ══════════════════════════════════════════ */
  if (!selectedRfq) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
            {t.compare.title}
          </Text>
          <Text style={[styles.headerSub, { color: colors.outline, textAlign: isRTL ? "right" : "left" }]}>
            {t.compare.subtitle}
          </Text>
        </View>

        {rfqLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primaryText} />
          </View>
        ) : rfqError ? (
          <View style={styles.centered}>
            <Feather name="alert-triangle" size={32} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{rfqError}</Text>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.retryBtn, { borderColor: colors.cta }]}
              onPress={() => { setRfqLoading(true); setRfqError(null); setRfqReload((n) => n + 1); }}
            >
              <Text style={[styles.retryBtnText, { color: colors.cta }]}>
                {t.common.retry}
              </Text>
            </TouchableOpacity>
          </View>
        ) : rfqs.length === 0 ? (
          <EmptyState icon="bar-chart-2" title={t.compare.noRfqs} subtitle={t.compare.noRfqsDesc} />
        ) : (
          <FlatList
            data={rfqs}
            keyExtractor={r => r.id}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity accessibilityRole="button"
                style={[styles.rfqCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => loadOffers(item)}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1, gap: 6 }}>
                  <Text
                    style={[styles.rfqTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <View style={[styles.rfqMeta, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <View style={[styles.offersBadge, { backgroundColor: colors.cta + "15" }]}>
                      <Feather name="bar-chart-2" size={12} color={colors.cta} />
                      <Text style={[styles.offersCount, { color: colors.cta }]}>
                        {item.offersCount} {t.compare.offersCount}
                      </Text>
                    </View>
                    {item.deadline && (
                      <Text style={[styles.rfqDeadline, { color: colors.outline }]}>
                        {fmtDate(item.deadline)}
                      </Text>
                    )}
                  </View>
                </View>
                <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={colors.outline} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  }

  /* ══════════════════════════════════════════
     VIEW B — Offer comparison cards
  ══════════════════════════════════════════ */
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity accessibilityRole="button"
          style={[styles.backRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}
          onPress={() => { setSelectedRfq(null); setOffers([]); }}
          activeOpacity={0.7}
        >
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={18} color={colors.cta} />
          <Text style={[styles.backLabel, { color: colors.cta }]}>{t.compare.backToList}</Text>
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left", marginTop: 6 }]}
          numberOfLines={2}
        >
          {selectedRfq.title}
        </Text>
      </View>

      {/* Sort bar */}
      <View style={[styles.sortBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(["price", "duration", "date"] as SortKey[]).map(key => (
          <TouchableOpacity accessibilityRole="button"
            key={key}
            style={[styles.sortChip, sortBy === key && { backgroundColor: colors.cta + "18" }]}
            onPress={() => setSortBy(key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.sortLabel, { color: sortBy === key ? colors.cta : colors.outline }]}>
              {key === "price" ? t.compare.sortPrice : key === "duration" ? t.compare.sortDuration : t.compare.sortDate}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {offersLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primaryText} />
        </View>
      ) : offersError ? (
        <View style={styles.centered}>
          <Feather name="alert-triangle" size={32} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{offersError}</Text>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.retryBtn, { borderColor: colors.cta }]}
            onPress={() => selectedRfq && loadOffers(selectedRfq)}
          >
            <Text style={[styles.retryBtnText, { color: colors.cta }]}>
              {t.common.retry}
            </Text>
          </TouchableOpacity>
        </View>
      ) : sortedOffers.length === 0 ? (
        <EmptyState icon="inbox" title={t.compare.noOffers} subtitle={t.compare.noOffersDesc} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
          showsVerticalScrollIndicator={false}
        >
          {sortedOffers.map((offer, idx) => {
            const price = parseFloat(String(offer.price)) || 0;
            const isBest = price === lowestPrice && offer.status !== "مرفوض";  // ui-ok: stored offer status value
            const isPending = offer.status === "قيد المراجعة";  // ui-ok: stored offer status value
            const sColor = statusColor(offer.status);

            return (
              <View
                key={offer.id}
                style={[
                  styles.offerCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isBest ? colors.success + "50" : colors.border,
                    borderWidth: isBest ? 1.5 : 1,
                  },
                ]}
              >
                {/* Rank + Best badge */}
                <View style={[styles.offerCardTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.rankBadge, { backgroundColor: isBest ? colors.success : colors.border }]}>
                    <Text style={[styles.rankText, { color: isBest ? colors.successForeground : colors.outline }]}>
                      {isBest ? t.compare.bestLabel : `#${idx + 1}`}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: sColor + "15" }]}>
                    <Text style={[styles.statusText, { color: sColor }]}>{statusLabel(offer.status)}</Text>
                  </View>
                </View>

                {/* Supplier */}
                <Text
                  style={[styles.supplierName, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={1}
                >
                  {offer.companyName ?? offer.supplierName ?? "—"}
                </Text>

                {/* Price + Duration + Date row */}
                <View style={[styles.metricsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.metricBlock, { backgroundColor: (isBest ? colors.success : colors.primaryText) + "0D" }]}>
                    <Text style={[styles.metricValue, { color: isBest ? colors.success : colors.primaryText }]}>
                      {price.toLocaleString(isRTL ? "ar-SA" : "en-US")}
                    </Text>
                    <Text style={[styles.metricLabel, { color: colors.outline }]}>{t.compare.currency}</Text>
                  </View>

                  {offer.executionDuration ? (
                    <View style={[styles.metricBlock, { backgroundColor: colors.cta + "0D" }]}>
                      <Text style={[styles.metricValue, { color: colors.cta }]}>{offer.executionDuration}</Text>
                      <Text style={[styles.metricLabel, { color: colors.outline }]}>
                        {fmtDurUnit(offer.executionDurationUnit)}
                      </Text>
                    </View>
                  ) : null}

                  {offer.createdAt ? (
                    <View style={[styles.metricBlock, { backgroundColor: colors.border + "80" }]}>
                      <Text style={[styles.metricValue, { color: colors.onSurfaceVariant, fontSize: 14, lineHeight: 24 }]}>
                        {fmtDate(offer.createdAt)}
                      </Text>
                      <Text style={[styles.metricLabel, { color: colors.outline }]}>{t.compare.sortDate}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Award — only for pending offers, and only on the website */}
                {isPending && (
                  <TouchableOpacity accessibilityRole="button"
                    style={[styles.acceptBtn, { backgroundColor: isBest ? colors.success : colors.cta }]}
                    onPress={() => handleAward(offer)}
                    activeOpacity={0.8}
                  >
                    <Feather name="external-link" size={15} color={isBest ? colors.successForeground : colors.ctaForeground} />
                    <Text style={[styles.acceptText, { color: isBest ? colors.successForeground : colors.ctaForeground }]}>{t.compare.accept}</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 2,
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17, lineHeight: 28,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14, lineHeight: 24,
    marginTop: 2,
  },
  backRow: {
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  backLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14, lineHeight: 24,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  errorText: {
    fontSize: 14, lineHeight: 24,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 4,
  },
  retryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14, lineHeight: 24,
  },

  /* RFQ list */
  rfqCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  rfqTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14, lineHeight: 24,
  },
  rfqMeta: {
    alignItems: "center",
    gap: 10,
  },
  offersBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  offersCount: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12, lineHeight: 20,
  },
  rfqDeadline: {
    fontFamily: "Inter_400Regular",
    fontSize: 12, lineHeight: 20,
  },

  /* Sort bar */
  sortBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sortLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14, lineHeight: 24,
  },

  /* Offer cards */
  offerCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  offerCardTop: {
    alignItems: "center",
    gap: 8,
  },
  rankBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  rankText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12, lineHeight: 20,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12, lineHeight: 20,
  },
  supplierName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14, lineHeight: 24,
  },
  metricsRow: {
    gap: 8,
  },
  metricBlock: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    gap: 2,
  },
  metricValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14, lineHeight: 24,
  },
  metricLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12, lineHeight: 20,
  },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 44,
    borderRadius: 12,
    marginTop: 2,
  },
  acceptText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14, lineHeight: 24,
  },
});
