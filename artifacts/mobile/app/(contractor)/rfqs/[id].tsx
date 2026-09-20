import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert,
  Modal, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, addDoc, writeBatch } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { formatSar } from "@/lib/crm-display";
import { tabScreenBottomPadding } from "@/lib/layout";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { createdAtMs } from "@/lib/time";
import { readRfqLineItems } from "@/lib/contracts";
import { usePermissions } from "@/hooks/usePermissions";
import { RFQItem } from "@/components/RFQCard";
import { OfferItem, OfferCard } from "@/components/OfferCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, CardSkeleton } from "@/components/ui/SkeletonLoader";
import { ScreenHeader } from "@/components/ScreenHeader";
import { RFQ_STATUSES, OFFER_STATUS, statusTone, displayCategory, displayCity } from "@/constants/data";
import { BOQEditor } from "@/components/BOQEditor";
import { exportRFQPDF, exportOfferComparisonPDF } from "@/lib/pdf-export";
import { type, space, radius, MIN_TOUCH } from "@/lib/design";

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
  const { user } = useAuth();
  const { can } = usePermissions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rfq, setRfq] = useState<RFQItem | null>(null);
  const rfqLineItems = useMemo(() => readRfqLineItems(rfq as any), [rfq]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("price");
  const [moreOpen, setMoreOpen] = useState(false);

  const [pdfLoading, setPdfLoading] = useState(false);

  // Reduce price modal
  const [reduceOffer, setReduceOffer] = useState<OfferItem | null>(null);
  const [targetPrice, setTargetPrice] = useState("");
  const [reductionNote, setReductionNote] = useState("");
  const [isReducing, setIsReducing] = useState(false);

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

      const offSnap = await getDocs(query(collection(db, "offers"), where("rfqId", "==", id)));
      const offerItems: OfferItem[] = offSnap.docs.map((d) => ({
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
  }, [id, isRTL]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sortedOffers = [...offers].sort((a, b) => {
    if (sortBy === "price") return (parseFloat(a.price || "0") || 0) - (parseFloat(b.price || "0") || 0);
    return createdAtMs(b.createdAt) - createdAtMs(a.createdAt);
  });

  const handleRepublish = () => {
    if (!can("rfq.create")) { Alert.alert(t.errors.noPermissionTitle, t.errors.noPermission); return; }
    Alert.alert(t.rfq.republish, t.rfq.republishConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.rfq.republish,
        onPress: async () => {
          try {
            await updateDoc(doc(db, "rfqs", id), { status: "New", updatedAt: new Date().toISOString() });
            Alert.alert(t.common.success ?? "Success", t.rfq.republished);
            fetchData();
          } catch (e: any) {
            Alert.alert(t.common.error, e?.message || (t.rfq.failedToRepublish));
          }
        },
      },
    ]);
  };

  const handleAcceptReject = async (offer: OfferItem, action: "accept" | "reject") => {
    // Same gate the website applies, and the same one firestore.rules enforces:
    // deciding on an offer needs 'offers.accept'. Checking here turns a silent
    // rules rejection into an explanation.
    if (!can("offers.accept")) {
      Alert.alert(t.errors.noPermissionTitle, t.errors.noPermission);
      return;
    }
    const confirmMsg = action === "accept" ? t.rfq.acceptOffer : t.rfq.rejectOffer;
    Alert.alert(t.common.confirm, confirmMsg, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.confirm,
        onPress: async () => {
          const newStatus = action === "accept" ? OFFER_STATUS.ACCEPTED : OFFER_STATUS.REJECTED;
          const now = new Date().toISOString();
          // The field set the website's RfqOffersView writes, committed with the
          // same atomicity: an accepted offer and its RFQ's "Awarded" status go
          // in one batch, so the two can never disagree.
          const decision = {
            status: newStatus,
            decidedByUserId: user?.uid ?? null,
            decidedByUserName: user?.displayName || user?.email || null,
            decidedAt: now,
            updatedAt: now,
            readAt: null,
          };
          try {
            if (action === "accept") {
              const batch = writeBatch(db);
              batch.update(doc(db, "offers", offer.id), decision);
              batch.update(doc(db, "rfqs", id), { status: "Awarded", awardedAt: now });
              await batch.commit();
            } else {
              await updateDoc(doc(db, "offers", offer.id), decision);
            }
          } catch {
            Alert.alert(t.common.error, t.errors.generic);
            return;
          }

          // A guest offer (share-link, no account) has nobody to chat with or
          // notify in-app; the website reaches the guest over the share channel.
          if (action === "accept" && !offer.isGuestOffer) {
            // Create chat doc
            const chatRef = doc(db, "chats", offer.id);
            const chatSnap = await getDoc(chatRef);
            if (!chatSnap.exists()) {
              await setDoc(chatRef, {
                offerId: offer.id,
                rfqId: id,
                rfqTitle: rfq?.title || "",
                contractorId: user?.uid,
                contractorOrgId: user?.organizationId || user?.uid,
                supplierId: offer.supplierId || offer.organizationId,
                supplierOrgId: offer.organizationId,
                createdAt: new Date().toISOString(),
              });
            }
          }

          // Notify supplier
          const supplierId = offer.supplierId || offer.organizationId;
          if (supplierId && !offer.isGuestOffer) {
            try {
              await addDoc(collection(db, "users", supplierId, "notifications"), {
                userId: supplierId,
                type: action === "accept" ? "offer_accepted" : "offer_rejected",
                i18n: {
                  title: action === "accept" ? "pn_offer_accepted_title" : "pn_offer_rejected_title",
                  message: action === "accept" ? "pn_offer_accepted" : "pn_offer_rejected",
                  params: { rfq: rfq?.title || "" },
                },
                title: action === "accept"
                  ? (t.rfq.yourOfferWasAccepted)
                  : (t.rfq.yourOfferWasRejected),
                message: isRTL
                  ? `${action === "accept" ? "تم قبول" : "تم رفض"} عرضك على مناقصة: ${rfq?.title || ""}`  // ui-ok: fallback text for push; readers get i18n
                  : `Your offer for "${rfq?.title || ""}" was ${action === "accept" ? "accepted" : "rejected"}.`,
                offerId: offer.id,
                rfqId: id,
                createdAt: new Date().toISOString(),
                read: false,
              });
            } catch {}
          }

          fetchData();
        },
      },
    ]);
  };

  const handleReduce = async () => {
    if (!can("offers.accept")) { Alert.alert(t.errors.noPermissionTitle, t.errors.noPermission); return; }
    if (!reduceOffer) return;
    const priceNum = parseFloat(targetPrice);
    if (!targetPrice || isNaN(priceNum) || priceNum <= 0) {
      Alert.alert(t.common.error, t.rfq.invalidPrice);
      return;
    }
    setIsReducing(true);
    try {
      await updateDoc(doc(db, "offers", reduceOffer.id), {
        status: OFFER_STATUS.PRICE_REDUCTION,
        targetPrice: priceNum,
        reductionNote: reductionNote.trim() || null,
        updatedAt: new Date().toISOString(),
      });

      // Notify supplier
      const supplierId = reduceOffer.supplierId || reduceOffer.organizationId;
      if (supplierId) {
        try {
          await addDoc(collection(db, "users", supplierId, "notifications"), {
            userId: supplierId,
            type: "price_reduction",
            i18n: { title: "pn_price_reduction_title", message: "pn_price_reduction", params: { rfq: rfq?.title || "", price: priceNum.toLocaleString("en-US"), note: "" } },
            title: isRTL ? "طُلب منك تخفيض السعر" : "Price reduction requested",  // ui-ok: fallback text for push; readers get i18n
            message: isRTL
              ? `يطلب المقاول تخفيض سعرك إلى ${priceNum.toLocaleString("ar-SA")} ر.س على مناقصة: ${rfq?.title || ""}`  // ui-ok: fallback text for push; readers get i18n
              : `The contractor requests a price reduction to SAR ${priceNum.toLocaleString("en-SA")} for: ${rfq?.title || ""}`,
            offerId: reduceOffer.id,
            rfqId: id,
            createdAt: new Date().toISOString(),
            read: false,
          });
        } catch {}
      }

      setReduceOffer(null);
      setTargetPrice("");
      setReductionNote("");
      fetchData();
    } catch {
      Alert.alert(t.common.error, t.rfq.failedToUpdateOffer);
    } finally {
      setIsReducing(false);
    }
  };

  const statusData = rfq ? RFQ_STATUSES.find((s) => s.id === rfq.status) : null;
  const statusLabel = statusData ? (isRTL ? statusData.labelAr : statusData.label) : rfq?.status;

  // The header's "more" sheet: the two PDF exports and the sort choice. They
  // were three controls scattered down the page next to the per-offer
  // decisions; here they are one affordance and the page keeps its focus on
  // the offers.
  const moreActions: MoreAction[] = [
    { key: "exportRfq", icon: "file-text", label: t.boq.exportPDF, onPress: handleExportRFQ },
  ];
  if (offers.length > 0) {
    moreActions.push({ key: "exportComparison", icon: "bar-chart-2", label: t.rfq.exportComparison, onPress: handleExportComparison });
  }
  if (offers.length > 1) {
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
            {(rfq.status === "Closed" || rfq.status === "Awarded") && (
              <Button
                title={t.rfq.republish}
                onPress={handleRepublish}
                size="sm"
                variant="outline"
                style={{ alignSelf: isRTL ? "flex-end" : "flex-start", marginTop: space.xs }}
              />
            )}
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
          {offers.length > 1 && (
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

        {/* Price summary bar */}
        {offers.length >= 2 && (() => {
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
            // The per-offer decisions stay on the card (OfferCard flags a
            // share-link offer itself, beside its status).
            const decisionRow = offer.status === OFFER_STATUS.UNDER_REVIEW && can("offers.accept") ? (
              <View style={[styles.offerActions, { flexDirection: rowDirection }]}>
                <Button title={t.rfq.accept} onPress={() => handleAcceptReject(offer, "accept")} size="sm" style={{ flex: 1 }} />
                <Button
                  title={t.rfq.reduce}
                  onPress={() => { setReduceOffer(offer); setTargetPrice(""); setReductionNote(""); }}
                  size="sm"
                  variant="outline"
                  style={{ flex: 1 }}
                />
                <Button title={t.rfq.reject} onPress={() => handleAcceptReject(offer, "reject")} size="sm" variant="destructive" style={{ flex: 1 }} />
              </View>
            ) : offer.status === OFFER_STATUS.ACCEPTED ? (
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
                rank={sortBy === "price" ? idx + 1 : undefined}
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

      {/* ── Reduce Price Modal ── */}
      <Modal
        visible={!!reduceOffer}
        transparent
        animationType="slide"
        onRequestClose={() => setReduceOffer(null)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable accessible={false} style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setReduceOffer(null)}>
            <Pressable accessible={false}
              style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + space.lg }]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={[styles.handle, { backgroundColor: colors.border }]} />

              <Text style={[type.title, { color: colors.foreground, textAlign }]}>
                {t.rfq.requestPriceReduction}
              </Text>

              {/* Current price */}
              {reduceOffer?.price && (
                <View style={[styles.currentPriceRow, { backgroundColor: colors.muted, borderColor: colors.border, flexDirection: rowDirection }]}>
                  <Feather name="tag" size={14} color={colors.outline} />
                  <Text style={[type.body, { color: colors.outline }]}>
                    {t.rfq.currentPrice}
                    {"  "}
                    <Text style={[type.bodyStrong, { color: colors.foreground }]}>
                      {fmtSar(parseFloat(reduceOffer.price))}
                    </Text>
                  </Text>
                </View>
              )}

              <Input
                label={t.rfq.targetPriceSar}
                required
                value={targetPrice}
                onChangeText={setTargetPrice}
                keyboardType="numeric"
                placeholder={t.rfq.desiredPrice}
                autoFocus
                isRTL={isRTL}
              />

              <Input
                label={t.rfq.noteToSupplierOptional}
                value={reductionNote}
                onChangeText={setReductionNote}
                multiline
                numberOfLines={3}
                placeholder={t.rfq.explainWhyYouNeedA}
                isRTL={isRTL}
              />

              <View style={{ flexDirection: rowDirection, gap: space.sm, marginTop: space.xs }}>
                <Button
                  title={t.common.cancel}
                  variant="outline"
                  style={{ flex: 1 }}
                  onPress={() => setReduceOffer(null)}
                />
                <Button
                  title={t.rfq.sendRequest}
                  style={{ flex: 2 }}
                  loading={isReducing}
                  onPress={handleReduce}
                  disabled={!targetPrice.trim()}
                />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
  offerActions: { gap: space.sm, flexWrap: "wrap", alignItems: "center" },

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

  // Reduce-price sheet
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: space.lg,
    gap: space.md,
  },
  currentPriceRow: {
    alignItems: "center",
    gap: space.sm,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: space.md,
  },
});
