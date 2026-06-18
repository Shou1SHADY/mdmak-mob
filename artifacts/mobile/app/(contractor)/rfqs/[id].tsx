import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform,
  Modal, Pressable, TextInput, ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { RFQItem } from "@/components/RFQCard";
import { OfferItem, OfferCard } from "@/components/OfferCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { RFQ_STATUSES, OFFER_STATUS } from "@/constants/data";

type SortMode = "price" | "date";

export default function RFQDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rfq, setRfq] = useState<RFQItem | null>(null);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortMode>("price");

  // Reduce price modal
  const [reduceOffer, setReduceOffer] = useState<OfferItem | null>(null);
  const [targetPrice, setTargetPrice] = useState("");
  const [reductionNote, setReductionNote] = useState("");
  const [isReducing, setIsReducing] = useState(false);

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
      setFetchError(e?.message || (isRTL ? "فشل تحميل التفاصيل" : "Failed to load details"));
    } finally {
      setLoading(false);
    }
  }, [id, isRTL]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sortedOffers = [...offers].sort((a, b) => {
    if (sortBy === "price") return (parseFloat(a.price || "0") || 0) - (parseFloat(b.price || "0") || 0);
    const ta = typeof a.createdAt?.toDate === "function" ? a.createdAt.toDate().getTime() : 0;
    const tb = typeof b.createdAt?.toDate === "function" ? b.createdAt.toDate().getTime() : 0;
    return tb - ta;
  });

  const handleRepublish = () => {
    Alert.alert(t.rfq.republish, t.rfq.republishConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.rfq.republish,
        onPress: async () => {
          try {
            await updateDoc(doc(db, "rfqs", id), { status: "New", updatedAt: serverTimestamp() });
            Alert.alert(t.common.success ?? "Success", t.rfq.republished);
            fetchData();
          } catch (e: any) {
            Alert.alert(t.common.error, e?.message || (isRTL ? "فشل إعادة النشر" : "Failed to republish"));
          }
        },
      },
    ]);
  };

  const handleAcceptReject = async (offer: OfferItem, action: "accept" | "reject") => {
    const confirmMsg = action === "accept" ? t.rfq.acceptOffer : t.rfq.rejectOffer;
    Alert.alert(t.common.confirm, confirmMsg, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.confirm,
        onPress: async () => {
          const newStatus = action === "accept" ? OFFER_STATUS.ACCEPTED : OFFER_STATUS.REJECTED;
          await updateDoc(doc(db, "offers", offer.id), {
            status: newStatus,
            decidedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          if (action === "accept") {
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
                createdAt: serverTimestamp(),
              });
            }
            // Update RFQ status to Awarded
            await updateDoc(doc(db, "rfqs", id), {
              status: "Awarded",
              awardedAt: serverTimestamp(),
            });
          }

          // Notify supplier
          const supplierId = offer.supplierId || offer.organizationId;
          if (supplierId) {
            try {
              await addDoc(collection(db, "users", supplierId, "notifications"), {
                userId: supplierId,
                type: action === "accept" ? "offer_accepted" : "offer_rejected",
                title: action === "accept"
                  ? (isRTL ? "🎉 تم قبول عرضك" : "🎉 Your offer was accepted")
                  : (isRTL ? "تم رفض عرضك" : "Your offer was rejected"),
                message: isRTL
                  ? `${action === "accept" ? "تم قبول" : "تم رفض"} عرضك على مناقصة: ${rfq?.title || ""}`
                  : `Your offer for "${rfq?.title || ""}" was ${action === "accept" ? "accepted" : "rejected"}.`,
                offerId: offer.id,
                rfqId: id,
                createdAt: serverTimestamp(),
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
        updatedAt: serverTimestamp(),
      });

      // Notify supplier
      const supplierId = reduceOffer.supplierId || reduceOffer.organizationId;
      if (supplierId) {
        try {
          await addDoc(collection(db, "users", supplierId, "notifications"), {
            userId: supplierId,
            type: "price_reduction_requested",
            title: isRTL ? "💰 طُلب منك تخفيض السعر" : "💰 Price reduction requested",
            message: isRTL
              ? `يطلب المقاول تخفيض سعرك إلى ${priceNum.toLocaleString("ar-SA")} ر.س على مناقصة: ${rfq?.title || ""}`
              : `The contractor requests a price reduction to SAR ${priceNum.toLocaleString("en-SA")} for: ${rfq?.title || ""}`,
            offerId: reduceOffer.id,
            rfqId: id,
            createdAt: serverTimestamp(),
            read: false,
          });
        } catch {}
      }

      setReduceOffer(null);
      setTargetPrice("");
      setReductionNote("");
      fetchData();
    } catch {
      Alert.alert(t.common.error, isRTL ? "فشل تحديث العرض" : "Failed to update offer");
    } finally {
      setIsReducing(false);
    }
  };

  const statusData = rfq ? RFQ_STATUSES.find((s) => s.id === rfq.status) : null;
  const statusInfo = statusData
    ? { label: isRTL ? statusData.labelAr : statusData.label, color: statusData.color }
    : rfq ? { label: rfq.status, color: colors.outline } : null;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={t.rfq.detail} showBack />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={t.rfq.detail} showBack />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 32 }}>
          <Feather name="alert-triangle" size={36} color={colors.destructive} />
          <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: colors.destructive, textAlign: "center" }}>
            {fetchError}
          </Text>
          <TouchableOpacity
            style={{ paddingHorizontal: 28, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: colors.cta }}
            onPress={fetchData}
          >
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: colors.cta }}>
              {isRTL ? "إعادة المحاولة" : "Retry"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.rfq.detail} showBack />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {/* RFQ Card */}
        {rfq && (
          <View style={[styles.rfqCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusXl }]}>
            <View style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Text style={[styles.category, { color: colors.secondary }]}>{rfq.category}</Text>
              {statusInfo && <StatusBadge label={statusInfo.label} color={statusInfo.color} />}
            </View>
            <Text style={[styles.rfqTitle, { color: colors.foreground, lineHeight: isRTL ? 30 : 25, textAlign: isRTL ? "right" : "left" }]} numberOfLines={3}>
              {rfq.title}
            </Text>
            {rfq.description && (
              <Text style={[styles.desc, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={4}>
                {rfq.description}
              </Text>
            )}
            <View style={[styles.metaGrid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.metaItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{rfq.city}</Text>
              </View>
              <View style={[styles.metaItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Feather name="tag" size={13} color={colors.accent} />
                <Text style={[styles.metaText, { color: colors.accent }]}>{offers.length} {t.rfq.offersSuffix}</Text>
              </View>
            </View>
            {(rfq.status === "Closed" || rfq.status === "Awarded") && (
              <Button
                title={t.rfq.republish}
                onPress={handleRepublish}
                size="sm"
                variant="outline"
                style={{ alignSelf: isRTL ? "flex-end" : "flex-start", marginTop: 4 }}
              />
            )}
          </View>
        )}

        {/* Offers header + sort */}
        <View style={[styles.offersHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {t.rfq.submittedOffers} ({offers.length})
          </Text>
          {offers.length > 1 && (
            <View style={[styles.sortRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              {(["price", "date"] as SortMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.sortChip,
                    sortBy === mode
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => setSortBy(mode)}
                >
                  <Text style={[styles.sortChipText, { color: sortBy === mode ? "#FFF" : colors.outline }]}>
                    {mode === "price"
                      ? (isRTL ? "السعر" : "Price")
                      : (isRTL ? "التاريخ" : "Date")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Price summary bar */}
        {offers.length >= 2 && (() => {
          const prices = offers.map(o => parseFloat(o.price) || 0).filter(p => p > 0);
          if (!prices.length) return null;
          const lowest = Math.min(...prices);
          const highest = Math.max(...prices);
          const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
          const fmt = (n: number) => new Intl.NumberFormat(isRTL ? "ar-SA" : "en-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(n);
          return (
            <View style={[styles.priceSummary, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusXl, flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={styles.priceSumItem}>
                <Text style={[styles.priceSumLabel, { color: colors.outline }]}>{isRTL ? "الأدنى" : "Lowest"}</Text>
                <Text style={[styles.priceSumValue, { color: "#12A063", fontFamily: "HankenGrotesk_700Bold" }]}>{fmt(lowest)}</Text>
              </View>
              <View style={[styles.priceSumDivider, { backgroundColor: colors.border }]} />
              <View style={styles.priceSumItem}>
                <Text style={[styles.priceSumLabel, { color: colors.outline }]}>{isRTL ? "المتوسط" : "Avg"}</Text>
                <Text style={[styles.priceSumValue, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>{fmt(avg)}</Text>
              </View>
              <View style={[styles.priceSumDivider, { backgroundColor: colors.border }]} />
              <View style={styles.priceSumItem}>
                <Text style={[styles.priceSumLabel, { color: colors.outline }]}>{isRTL ? "الأعلى" : "Highest"}</Text>
                <Text style={[styles.priceSumValue, { color: colors.mutedForeground, fontFamily: "HankenGrotesk_700Bold" }]}>{fmt(highest)}</Text>
              </View>
            </View>
          );
        })()}

        {/* Offer list */}
        {sortedOffers.length === 0 ? (
          <View style={[styles.emptyOffers, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusXl }]}>
            <Feather name="inbox" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.rfq.noOffers}</Text>
          </View>
        ) : (
          sortedOffers.map((offer, idx) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              rank={sortBy === "price" ? idx + 1 : undefined}
              actions={
                offer.status === OFFER_STATUS.UNDER_REVIEW ? (
                  <View style={[styles.offerActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
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
                ) : undefined
              }
            />
          ))
        )}
      </ScrollView>

      {/* ── Reduce Price Modal ── */}
      <Modal
        visible={!!reduceOffer}
        transparent
        animationType="slide"
        onRequestClose={() => setReduceOffer(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setReduceOffer(null)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={{ alignItems: "center", paddingBottom: 8 }}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            <Text style={[styles.modalTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
              {isRTL ? "طلب تخفيض السعر" : "Request Price Reduction"}
            </Text>

            {/* Current price */}
            {reduceOffer?.price && (
              <View style={[styles.currentPriceRow, { backgroundColor: colors.muted, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Feather name="tag" size={14} color={colors.outline} />
                <Text style={[styles.currentPriceText, { color: colors.outline }]}>
                  {isRTL ? "السعر الحالي:" : "Current price:"}
                  {"  "}
                  <Text style={{ color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }}>
                    {new Intl.NumberFormat(isRTL ? "ar-SA" : "en-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(parseFloat(reduceOffer.price))}
                  </Text>
                </Text>
              </View>
            )}

            <Text style={[styles.fieldLabel, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
              {isRTL ? "السعر المستهدف (ر.س) *" : "Target Price (SAR) *"}
            </Text>
            <TextInput
              style={[styles.priceInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, textAlign: isRTL ? "right" : "left" }]}
              value={targetPrice}
              onChangeText={setTargetPrice}
              keyboardType="numeric"
              placeholder={isRTL ? "السعر المطلوب" : "Desired price"}
              placeholderTextColor={colors.outline}
              autoFocus
            />

            <Text style={[styles.fieldLabel, { color: colors.foreground, textAlign: isRTL ? "right" : "left", marginTop: 4 }]}>
              {isRTL ? "ملاحظة للمورد (اختياري)" : "Note to supplier (optional)"}
            </Text>
            <TextInput
              style={[
                styles.noteInput,
                { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border, textAlign: isRTL ? "right" : "left" },
              ]}
              value={reductionNote}
              onChangeText={setReductionNote}
              multiline
              numberOfLines={3}
              placeholder={isRTL ? "اشرح سبب طلب التخفيض..." : "Explain why you need a lower price..."}
              placeholderTextColor={colors.outline}
              textAlignVertical="top"
            />

            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10, marginTop: 12 }}>
              <Button
                title={t.common.cancel}
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setReduceOffer(null)}
              />
              <Button
                title={isRTL ? "إرسال الطلب" : "Send Request"}
                style={{ flex: 2 }}
                loading={isReducing}
                onPress={handleReduce}
                disabled={!targetPrice.trim()}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  rfqCard: { padding: 18, borderWidth: 1, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  category: { fontSize: 11, fontWeight: "700" as const, textTransform: "uppercase", letterSpacing: 0.6 },
  rfqTitle: { fontSize: 18, fontWeight: "700" as const },
  desc: { fontSize: 14, lineHeight: 21 },
  metaGrid: { flexDirection: "row", gap: 16, marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13 },

  offersHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontWeight: "700" as const },
  sortRow: { flexDirection: "row", gap: 6 },
  sortChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  sortChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  emptyOffers: { borderWidth: 1, padding: 32, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14 },
  offerActions: { gap: 7, marginTop: 4, flexWrap: "wrap", alignItems: "center" },

  priceSummary: { flexDirection: "row", borderWidth: 1, paddingVertical: 14, paddingHorizontal: 8 },
  priceSumItem: { flex: 1, alignItems: "center", gap: 3 },
  priceSumLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.4 },
  priceSumValue: { fontSize: 15 },
  priceSumDivider: { width: 1, alignSelf: "stretch", marginVertical: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: { width: 40, height: 4, borderRadius: 2 },
  modalTitle: { fontSize: 18, fontFamily: "HankenGrotesk_700Bold" },

  currentPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  currentPriceText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  fieldLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  priceInput: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 20,
    fontFamily: "HankenGrotesk_700Bold",
  },
  noteInput: {
    minHeight: 80,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
});
