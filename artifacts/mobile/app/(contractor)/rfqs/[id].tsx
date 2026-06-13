import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
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

  const fetchData = async () => {
    try {
      const rfqDoc = await getDoc(doc(db, "rfqs", id));
      if (rfqDoc.exists()) setRfq({ id: rfqDoc.id, ...rfqDoc.data() } as RFQItem);
      const offSnap = await getDocs(query(collection(db, "offers"), where("rfqId", "==", id)));
      const orgIds = [...new Set(offSnap.docs.map((d) => d.data().organizationId).filter(Boolean) as string[])];
      const orgNames: Record<string, string> = {};
      if (orgIds.length > 0) {
        const userSnap = await getDocs(
          query(collection(db, "users"), where("role", "==", "Supplier"))
        );
        userSnap.docs.forEach((d) => {
          const oid = d.data().organizationId;
          if (oid && orgIds.includes(oid)) {
            orgNames[oid] = d.data().companyName ?? d.data().name ?? t.common.unknown;
          }
        });
      }
      const offerItems: OfferItem[] = offSnap.docs.map((d) => {
        const offer = { id: d.id, ...d.data() } as OfferItem;
        if (offer.organizationId) {
          offer.supplierName = orgNames[offer.organizationId] ?? offer.supplierName;
        }
        return offer;
      });
      setOffers(offerItems.sort((a, b) => (parseFloat(a.price || "0") || 0) - (parseFloat(b.price || "0") || 0)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleRepublish = () => {
    Alert.alert(t.rfq.republish, t.rfq.republishConfirm, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.rfq.republish,
        onPress: async () => {
          await updateDoc(doc(db, "rfqs", id), {
            status: "New",
            updatedAt: serverTimestamp(),
          });
          Alert.alert(t.common.success ?? "Success", t.rfq.republished);
          fetchData();
        },
      },
    ]);
  };

  const handleOfferAction = async (offer: OfferItem, action: "accept" | "reject" | "reduce") => {
    const confirmMessages: Record<string, string> = { accept: t.rfq.acceptOffer, reject: t.rfq.rejectOffer, reduce: t.rfq.reduceOffer };
    const statusMap: Record<string, string> = { accept: OFFER_STATUS.ACCEPTED, reject: OFFER_STATUS.REJECTED, reduce: OFFER_STATUS.PRICE_REDUCTION };
    Alert.alert(t.common.confirm, confirmMessages[action], [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.confirm,
        onPress: async () => {
          await updateDoc(doc(db, "offers", offer.id), {
            status: statusMap[action],
            updatedAt: serverTimestamp(),
          });
          if (action === "accept") {
            await setDoc(doc(db, "chats", offer.id), {
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
          fetchData();
        },
      },
    ]);
  };

  const statusData = rfq ? RFQ_STATUSES.find((s) => s.id === rfq.status) : null;
  const statusInfo = statusData
    ? { label: isRTL ? statusData.labelAr : statusData.label, color: statusData.color }
    : rfq ? { label: rfq.status, color: colors.outline } : null;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={t.rfq.detail} showBack />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.rfq.detail} showBack />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {rfq && (
          <View style={[styles.rfqCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusXl }]}>          
            <View style={styles.row}>
              <Text style={[styles.category, { color: colors.secondary }]}>{rfq.category}</Text>
              {statusInfo && <StatusBadge label={statusInfo.label} color={statusInfo.color} />}
            </View>
            <Text style={[styles.rfqTitle, { color: colors.foreground, lineHeight: isRTL ? 30 : 25 }]} numberOfLines={3} ellipsizeMode="tail">{rfq.title}</Text>
            {rfq.description && (
              <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={4} ellipsizeMode="tail">{rfq.description}</Text>
            )}
            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Feather name="map-pin" size={13} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{rfq.city}</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="tag" size={13} color={colors.accent} />
                <Text style={[styles.metaText, { color: colors.accent }]}>{offers.length} {t.rfq.offersSuffix}</Text>
              </View>
            </View>
            {rfq.status === "Closed" && (
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

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {t.rfq.submittedOffers} ({offers.length})
        </Text>

        {/* Price summary bar — shown when 2+ offers */}
        {offers.length >= 2 && (() => {
          const prices = offers.map(o => parseFloat(o.price) || 0).filter(p => p > 0);
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

        {offers.length === 0 ? (
          <View style={[styles.emptyOffers, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radiusXl }]}>
            <Feather name="inbox" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.rfq.noOffers}</Text>
          </View>
        ) : (
          offers.map((offer, idx) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              rank={idx + 1}
              actions={
                offer.status === OFFER_STATUS.UNDER_REVIEW ? (
                  <View style={styles.offerActions}>
                    <Button title={t.rfq.accept} onPress={() => handleOfferAction(offer, "accept")} size="sm" style={{ flex: 1 }} />
                    <Button title={t.rfq.reduce} onPress={() => handleOfferAction(offer, "reduce")} size="sm" variant="outline" style={{ flex: 1 }} />
                    <Button title={t.rfq.reject} onPress={() => handleOfferAction(offer, "reject")} size="sm" variant="destructive" style={{ flex: 1 }} />
                  </View>
                ) : offer.status === OFFER_STATUS.ACCEPTED ? (
                  <Button
                    title={t.chat.title}
                    onPress={() => router.push(`/chat/${offer.id}`)}
                    size="sm"
                    variant="outline"
                    style={{ alignSelf: "flex-start" }}
                  />
                ) : undefined
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  rfqCard: { padding: 18, borderWidth: 1, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  category: { fontSize: 11, fontWeight: "700" as const, textTransform: "uppercase", letterSpacing: 0.6 },
  rfqTitle: { fontSize: 18, fontWeight: "700" as const, lineHeight: 25 },
  desc: { fontSize: 14, lineHeight: 21 },
  metaGrid: { flexDirection: "row", gap: 16, marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13 },
  sectionTitle: { fontSize: 17, fontWeight: "700" as const },
  emptyOffers: { borderWidth: 1, padding: 32, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14 },
  offerActions: { flexDirection: "row", gap: 7, marginTop: 4, flexWrap: "wrap", alignItems: "center" },
  priceSummary: { flexDirection: "row", borderWidth: 1, paddingVertical: 14, paddingHorizontal: 8 },
  priceSumItem: { flex: 1, alignItems: "center", gap: 3 },
  priceSumLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.4 },
  priceSumValue: { fontSize: 15 },
  priceSumDivider: { width: 1, alignSelf: "stretch", marginVertical: 4 },
});
