import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, Pressable, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { formatSar } from "@/lib/crm-display";
import { tabScreenBottomPadding } from "@/lib/layout";
import { useT, useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { createdAtMs } from "@/lib/time";
import { readRfqLineItems } from "@/lib/contracts";
import { usePermissions } from "@/hooks/usePermissions";
import { RFQItem } from "@/components/RFQCard";
import { OfferItem, OfferCard } from "@/components/OfferCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, CardSkeleton } from "@/components/ui/SkeletonLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { RFQ_STATUSES, OFFER_STATUS, statusTone, displayCategory, displayCity } from "@/constants/data";
import { BOQEditor } from "@/components/BOQEditor";
import { exportRFQPDF, exportOfferComparisonPDF } from "@/lib/pdf-export";
import { type, space, radius, MIN_TOUCH } from "@/lib/design";
import * as WebBrowser from "expo-web-browser";
import { siteUrl } from "@/lib/site-api";
import { offersPagePath, priceHiddenReason, seesOfferPrices } from "@/lib/offer-sealing";
import { useAuth } from "@/context/AuthContext";

type SortMode = "price" | "date";

/** One row of the header's "more" sheet. */
type MoreAction = {
  key: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  selected?: boolean;
};

export default function RFQDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { isRTL } = useLanguage();
  const { can } = usePermissions();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rfq, setRfq] = useState<RFQItem | null>(null);
  const rfqLineItems = useMemo(() => readRfqLineItems(rfq as any), [rfq]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("price");
  const [moreOpen, setMoreOpen] = useState(false);

  const [pdfLoading, setPdfLoading] = useState(false);

  const rowDirection = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";
  const fmtSar = (n: number) => formatSar(n, isRTL);

  const handleExportRFQ = async () => {
    if (!rfq) return;
    setPdfLoading(true);
    try {
      await exportRFQPDF(rfq as any, isRTL);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleExportComparison = async () => {
    if (!rfq || offers.length === 0) return;
    setPdfLoading(true);
    try {
      await exportOfferComparisonPDF(rfq as any, offers as any, isRTL);
    } finally {
      setPdfLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const rfqDoc = await getDoc(doc(db, "rfqs", id));
      if (rfqDoc.exists()) setRfq({ id: rfqDoc.id, ...rfqDoc.data() } as RFQItem);

      // The rules read an offer list only when the query names its side (website G-06):
      // the buying company's, by `contractorOrgId` — an `rfqId` filter alone is refused.
      const orgId = user?.organizationId;
      const offSnap = orgId
        ? await getDocs(query(collection(db, "offers"), where("rfqId", "==", id), where("contractorOrgId", "==", orgId)))
        : null;
      const offerItems: OfferItem[] = (offSnap?.docs ?? []).map((d) => ({
        id: d.id, ...d.data(),
      } as OfferItem));

      // For legacy offers missing companyName/supplierName, batch-lookup by organizationId.
      const needsLookup = offerItems.filter(
        (o) => !o.companyName && !o.supplierName && o.organizationId
      );
      if (needsLookup.length > 0) {
        const orgIds = [...new Set(needsLookup.map((o) => o.organizationId!))];
        const chunks: string[][] = [];
        for (let i = 0; i < orgIds.length; i += 30) chunks.push(orgIds.slice(i, i + 30));
        const orgNames: Record<string, string> = {};
        const chunkResults = await Promise.allSettled(
          chunks.map((chunk) =>
            getDocs(query(collection(db, "users"), where("organizationId", "in", chunk)))
          )
        );
        chunkResults.forEach((r) => {
          if (r.status === "fulfilled") {
            r.value.docs.forEach((d) => {
              const data = d.data();
              if (data.organizationId) {
                orgNames[data.organizationId] = data.companyName ?? data.name ?? "";
              }
            });
          }
        });
        offerItems.forEach((o) => {
          if (!o.companyName && !o.supplierName && o.organizationId && orgNames[o.organizationId]) {
            o.supplierName = orgNames[o.organizationId];
          }
        });
      }

      setOffers(offerItems);
    } catch (e: any) {
      setFetchError(e?.message || (t.rfq.failedToLoadDetails));
    } finally {
      setLoading(false);
    }
  }, [id, isRTL, user?.organizationId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Prices may be on screen only as the website allows (lib/offer-sealing.ts):
  // for a role that sees no amounts the list shows who quoted and when,
  // ordered by arrival, with no price, rank or comparison.
  const hiddenReason = priceHiddenReason(seesOfferPrices(can));
  const showPrices = hiddenReason === null;
  const sortMode: SortMode = showPrices ? sortBy : "date";
  const hiddenPriceLabel = hiddenReason === "role" ? t.rfq.pricesHiddenRole : undefined;
  const canDecide = can("offers.accept") || can("rfq.manage");
  const openDecideOnWeb = () => {
    if (!rfq) return;
    void WebBrowser.openBrowserAsync(siteUrl(offersPagePath({ id: rfq.id, projectId: rfq.projectId })));
  };

  const sortedOffers = [...offers].sort((a, b) => {
    if (sortMode === "price") return (parseFloat(a.price || "0") || 0) - (parseFloat(b.price || "0") || 0);
    return createdAtMs(b.createdAt) - createdAtMs(a.createdAt);
  });

  // Republishing, rejecting, asking a single supplier for a lower price and
  // awarding are not made here. The website replaced them with acts the phone
  // cannot reproduce faithfully: reopening is only an extension, an exclusion
  // needs a logged reason, a better price is asked through the
  // server's offer decisions, an award prepares a purchase order for Finance — and the rules
  // also check the member's seat on a project's tender. One button hands all
  // of them to the website's offers page.

  const statusData = rfq ? RFQ_STATUSES.find((s) => s.id === rfq.status) : null;
  const statusLabel = statusData ? (isRTL ? statusData.labelAr : statusData.label) : rfq?.status;

  // The header's "more" sheet: the two PDF exports and the sort choice. They
  // were three controls scattered down the page next to the per-offer
  // decisions; here they are one affordance and the page keeps its focus on
  // the offers.
  const moreActions: MoreAction[] = [
    { key: "exportRfq", icon: "file-text", label: t.boq.exportPDF, onPress: handleExportRFQ },
  ];
  if (offers.length > 0 && showPrices) {
    moreActions.push({ key: "exportComparison", icon: "bar-chart-2", label: t.rfq.exportComparison, onPress: handleExportComparison });
  }
  if (offers.length > 1 && showPrices) {
    moreActions.push(
      { key: "sortPrice", icon: "trending-down", label: t.rfq.sortByPrice, onPress: () => setSortBy("price"), selected: sortBy === "price" },
      { key: "sortDate", icon: "clock", label: t.rfq.sortByDate, onPress: () => setSortBy("date"), selected: sortBy === "date" },
    );
  }
  const runMoreAction = (action: MoreAction) => {
    setMoreOpen(false);
    action.onPress();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={t.rfq.detail} showBack />
        <View style={styles.content} accessibilityLabel={t.common.loading}>
          <View style={[styles.rfqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Skeleton width={96} height={20} />
            <Skeleton height={24} />
            <Skeleton width="70%" height={16} />
            <Skeleton width="40%" height={14} />
          </View>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={t.rfq.detail} showBack />
        <EmptyState
          variant="error"
          icon="alert-circle"
          title={t.rfq.detailLoadFailed}
          subtitle={fetchError}
          actionLabel={t.common.retry}
          onAction={fetchData}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.rfq.detail}
        showBack
        right={
          rfq ? (
            <TouchableOpacity
              onPress={() => setMoreOpen(true)}
              disabled={pdfLoading}
              style={styles.moreBtn}
              accessibilityRole="button"
              accessibilityLabel={t.rfq.moreActions}
              accessibilityState={{ busy: pdfLoading, disabled: pdfLoading }}
            >
              {pdfLoading
                ? <ActivityIndicator size="small" color={colors.foreground} />
                : <Feather name="more-horizontal" size={22} color={colors.foreground} />}
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: tabScreenBottomPadding(insets.bottom) }]}>
        {/* RFQ Card */}
        {rfq && (
          <View style={[styles.rfqCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.row, { flexDirection: rowDirection }]}>
              <Text style={[type.captionStrong, { color: colors.secondary, flexShrink: 1 }]} numberOfLines={1}>
                {displayCategory(rfq.category, isRTL)}
              </Text>
              {statusLabel ? <StatusBadge label={statusLabel} tone={statusTone(rfq.status)} /> : null}
            </View>
            <Text style={[type.title, { color: colors.foreground, textAlign }]} numberOfLines={3}>
              {rfq.title}
            </Text>
            {rfq.description && (
              <Text style={[type.body, { color: colors.mutedForeground, textAlign }]} numberOfLines={4}>
                {rfq.description}
              </Text>
            )}
            <View style={[styles.metaGrid, { flexDirection: rowDirection }]}>
              <View style={[styles.metaItem, { flexDirection: rowDirection }]}>
                <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                <Text style={[type.body, { color: colors.mutedForeground }]}>{displayCity(rfq.city, isRTL)}</Text>
              </View>
              <View style={[styles.metaItem, { flexDirection: rowDirection }]}>
                <Feather name="tag" size={13} color={colors.accentText} />
                <Text style={[type.body, { color: colors.accentText }]}>{offers.length} {t.rfq.offersSuffix}</Text>
              </View>
            </View>
          </View>
        )}

        {/* BOQ section — normalised so RFQs published on the website, which
            carry their lines as `products`, render here too. */}
        {rfqLineItems.length > 0 && (
          <View style={[styles.boqSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <BOQEditor items={rfqLineItems as any} onChange={() => {}} readonly />
          </View>
        )}

        {/* Offers header — the sort lives in the "more" sheet; this shows which one is on. */}
        <View style={[styles.offersHeader, { flexDirection: rowDirection }]}>
          <Text style={[type.title, { color: colors.foreground, flexShrink: 1 }]}>
            {t.rfq.submittedOffers} ({offers.length})
          </Text>
          {offers.length > 1 && showPrices && (
            <TouchableOpacity
              onPress={() => setMoreOpen(true)}
              style={[styles.sortHint, { flexDirection: rowDirection }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={t.rfq.moreActions}
            >
              <Feather name={sortBy === "price" ? "trending-down" : "clock"} size={13} color={colors.mutedForeground} />
              <Text style={[type.caption, { color: colors.mutedForeground }]}>
                {sortBy === "price" ? t.rfq.sortByPrice : t.rfq.sortByDate}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Why no price is shown. */}
        {hiddenReason && offers.length > 0 ? (
          <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: rowDirection }]}>
            <Feather name="lock" size={16} color={colors.mutedForeground} />
            <View style={styles.noteBody}>
              <Text style={[type.caption, { color: colors.mutedForeground, textAlign }]}>{t.rfq.pricesHiddenRole}</Text>
            </View>
          </View>
        ) : null}

        {/* Every decision on the offers is the website's. */}
        {rfq?.status === "New" && offers.length > 0 && canDecide ? (
          <View style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: rowDirection }]}>
            <View style={styles.noteBody}>
              <Text style={[type.caption, { color: colors.mutedForeground, textAlign }]}>{t.rfq.decideOnWebDesc}</Text>
              <Button
                title={t.rfq.decideOnWeb}
                onPress={openDecideOnWeb}
                size="sm"
                style={{ alignSelf: isRTL ? "flex-end" : "flex-start" }}
              />
            </View>
          </View>
        ) : null}

        {/* Price summary bar */}
        {showPrices && offers.length >= 2 && (() => {
          const prices = offers.map(o => parseFloat(o.price) || 0).filter(p => p > 0);
          if (!prices.length) return null;
          const lowest = Math.min(...prices);
          const highest = Math.max(...prices);
          const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
          return (
            <View style={[styles.priceSummary, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: rowDirection }]}>
              <View style={styles.priceSumItem}>
                <Text style={[type.caption, { color: colors.outline }]}>{t.rfq.lowest}</Text>
                <Text style={[type.bodyStrong, styles.tabular, { color: colors.success }]}>{fmtSar(lowest)}</Text>
              </View>
              <View style={[styles.priceSumDivider, { backgroundColor: colors.border }]} />
              <View style={styles.priceSumItem}>
                <Text style={[type.caption, { color: colors.outline }]}>{t.rfq.average}</Text>
                <Text style={[type.bodyStrong, styles.tabular, { color: colors.foreground }]}>{fmtSar(avg)}</Text>
              </View>
              <View style={[styles.priceSumDivider, { backgroundColor: colors.border }]} />
              <View style={styles.priceSumItem}>
                <Text style={[type.caption, { color: colors.outline }]}>{t.rfq.highest}</Text>
                <Text style={[type.bodyStrong, styles.tabular, { color: colors.mutedForeground }]}>{fmtSar(highest)}</Text>
              </View>
            </View>
          );
        })()}

        {/* Offer list */}
        {sortedOffers.length === 0 ? (
          <View style={[styles.emptyOffers, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="inbox" size={28} color={colors.mutedForeground} />
            <Text style={[type.body, { color: colors.mutedForeground }]}>{t.rfq.noOffers}</Text>
          </View>
        ) : (
          sortedOffers.map((offer, idx) => {
            // An awarded offer keeps its chat; every decision is the website's.
            const decisionRow = offer.status === OFFER_STATUS.ACCEPTED ? (
              <Button
                title={t.chat.title}
                onPress={() => router.push(`/chat/${offer.id}`)}
                size="sm"
                variant="outline"
                style={{ alignSelf: isRTL ? "flex-end" : "flex-start" }}
              />
            ) : null;
            return (
              <OfferCard
                key={offer.id}
                offer={offer}
                rank={sortMode === "price" ? idx + 1 : undefined}
                hiddenPriceLabel={hiddenPriceLabel}
                actions={decisionRow ? <View style={styles.offerFooter}>{decisionRow}</View> : undefined}
              />
            );
          })
        )}
      </ScrollView>

      {/* ── "More" action sheet: exports + sort ── */}
      <Modal visible={moreOpen} transparent animationType="fade" onRequestClose={() => setMoreOpen(false)}>
        <View style={[styles.sheetOuter, { backgroundColor: colors.overlay }]}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setMoreOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t.common.close}
          />
          <View style={[styles.actionSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + space.sm }]}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            {moreActions.map((action) => (
              <TouchableOpacity
                key={action.key}
                onPress={() => runMoreAction(action)}
                activeOpacity={0.7}
                style={[styles.actionRow, { flexDirection: rowDirection }]}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                accessibilityState={{ selected: !!action.selected }}
              >
                <Feather name={action.icon} size={18} color={action.selected ? colors.cta : colors.foreground} />
                <Text style={[type.body, { color: colors.foreground, flex: 1, textAlign }]}>{action.label}</Text>
                {action.selected ? <Feather name="check" size={16} color={colors.cta} /> : null}
              </TouchableOpacity>
            ))}
            <View style={[styles.actionDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              onPress={() => setMoreOpen(false)}
              activeOpacity={0.7}
              style={[styles.actionRow, { flexDirection: rowDirection }]}
              accessibilityRole="button"
              accessibilityLabel={t.common.cancel}
            >
              <Feather name="x" size={18} color={colors.mutedForeground} />
              <Text style={[type.body, { color: colors.mutedForeground, flex: 1, textAlign }]}>{t.common.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md },
  rfqCard: { padding: space.lg, borderWidth: 1, borderRadius: radius.card, gap: space.sm },
  row: { justifyContent: "space-between", alignItems: "center", gap: space.sm },
  metaGrid: { gap: space.lg, marginTop: space.xs, flexWrap: "wrap" },
  metaItem: { alignItems: "center", gap: space.xs },

  offersHeader: { alignItems: "center", justifyContent: "space-between", gap: space.sm },
  sortHint: { alignItems: "center", gap: space.xs, minHeight: 28 },

  emptyOffers: { borderWidth: 1, borderRadius: radius.card, padding: space.xxl, alignItems: "center", gap: space.sm },
  offerFooter: { width: "100%", gap: space.sm },
  noteCard: { borderWidth: 1, borderRadius: radius.card, padding: space.md, gap: space.sm, alignItems: "flex-start" },
  noteBody: { flex: 1, gap: space.sm },

  priceSummary: { borderWidth: 1, borderRadius: radius.card, paddingVertical: space.md, paddingHorizontal: space.sm },
  priceSumItem: { flex: 1, alignItems: "center", gap: 2 },
  priceSumDivider: { width: 1, alignSelf: "stretch", marginVertical: space.xs },
  tabular: { fontVariant: ["tabular-nums"] },

  boqSection: { borderRadius: radius.card, borderWidth: 1, padding: space.lg },

  moreBtn: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: "center", justifyContent: "center", borderRadius: radius.control },

  // "More" action sheet
  sheetOuter: { flex: 1, justifyContent: "flex-end" },
  actionSheet: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: space.sm,
    paddingTop: space.sm,
  },
  handle: { width: 40, height: 4, borderRadius: radius.hairline, alignSelf: "center", marginBottom: space.sm },
  actionRow: { minHeight: 48, alignItems: "center", gap: space.md, paddingHorizontal: space.md, borderRadius: radius.control },
  actionDivider: { height: 1, marginVertical: space.xs, marginHorizontal: space.md },
});
