import React, { useCallback, useMemo, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  StyleSheet, ScrollView, Modal, Alert, Pressable } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { tabScreenBottomPadding } from "@/lib/layout";
import { useAuth } from "@/context/AuthContext";
import { useT, useLanguage } from "@/context/LanguageContext";
import { auth, db } from "@/lib/firebase";
import { supplierAct } from "@/lib/site-api";
import { byNewest } from "@/lib/time";
import { OfferCard, OfferItem } from "@/components/OfferCard";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { OFFER_STATUSES, OFFER_STATUS } from "@/constants/data";
import { useSupplierOrders } from "@/hooks/useSupplierOrders";
import { asSupplierSees } from "@/lib/procurement/supplier";
import * as WebBrowser from "expo-web-browser";
import { siteUrl } from "@/lib/site-api";
import { SUPPLIER_OFFERS_PATH } from "@/lib/offer-sealing";

export default function MyOffersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [stored, setStored] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Withdraw state
  const [withdrawOffer, setWithdrawOffer] = useState<OfferItem | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const fetchOffers = async () => {
    const orgId = user?.organizationId;
    if (!orgId) { setLoading(false); return; }
    setFetchError(null);
    try {
      const snap = await getDocs(
        query(collection(db, "offers"), where("organizationId", "==", orgId))
      );
      const items: OfferItem[] = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as OfferItem))
        .filter((o: any) => !o.archived)
        .sort(byNewest);

      // For legacy offers missing rfqTitle, fetch in parallel with allSettled (partial failure is OK).
      const missing = items.filter((o) => !o.rfqTitle && o.rfqId);
      if (missing.length > 0) {
        const uniqueRfqIds = [...new Set(missing.map((o) => o.rfqId))];
        const results = await Promise.allSettled(
          uniqueRfqIds.map((rid) => getDoc(doc(db, "rfqs", rid)))
        );
        const rfqTitles: Record<string, string> = {};
        results.forEach((r) => {
          if (r.status === "fulfilled" && r.value.exists()) {
            rfqTitles[r.value.id] = (r.value.data() as any).title || "";
          }
        });
        items.forEach((o) => {
          if (!o.rfqTitle && rfqTitles[o.rfqId]) o.rfqTitle = rfqTitles[o.rfqId];
        });
      }

      setStored(items);
    } catch (e: any) {
      setFetchError(e?.message || "Failed to load offers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Submitting an offer returns to this list, which never unmounted.
  useFocusEffect(useCallback(() => { fetchOffers(); }, [user?.organizationId]));

  // An award is the buying company's decision until Finance has approved its
  // purchase order and it has been sent, so the whole screen — badges, counts,
  // the chips, the chat button — reads the status the supplier MAY see rather
  // than the one stored on the offer.
  const { ordersById, ready: ordersReady } = useSupplierOrders(user?.organizationId);
  const offers = useMemo(() => asSupplierSees(stored, ordersById), [stored, ordersById]);
  const filtered = useMemo(
    () => (statusFilter === "all" ? offers : offers.filter((o) => o.status === statusFilter)),
    [offers, statusFilter]
  );

  // Stats
  const pendingCount = offers.filter((o) => o.status === OFFER_STATUS.UNDER_REVIEW).length;
  const acceptedCount = offers.filter((o) => o.status === OFFER_STATUS.ACCEPTED).length;
  const rejectedCount = offers.filter((o) => o.status === OFFER_STATUS.REJECTED).length;

  // A revised price is not written here. On the website it updates the
  // offer's every line and delivery batch with the price (offer-pricing.ts
  // `revisePrice`); writing `price` alone left the lines at the old figure,
  // and the purchase order raised at award was priced from them.
  const handleReviseOnWeb = () => {
    Alert.alert(t.offers.reviseOnWeb, t.offers.reviseOnWebDesc, [
      { text: t.common.cancel, style: "cancel" },
      { text: t.rfq.openWebsite, onPress: () => void WebBrowser.openBrowserAsync(siteUrl(SUPPLIER_OFFERS_PATH)) },
    ]);
  };

  const handleWithdraw = async () => {
    if (!withdrawOffer) return;
    setIsWithdrawing(true);
    try {
      // The website marks it withdrawn (never deleted — the contractor keeps it, out of comparison and award), logs
      // who and when, and tells the contractor. Deleting it from the phone took the contractor's record with it.
      const token = await auth.currentUser?.getIdToken();
      const res = token ? await supplierAct(token, { action: "quote.withdraw", offerId: withdrawOffer.id }) : null;
      if (!res?.ok) throw new Error(res?.code || "no session");
      setWithdrawOffer(null);
      fetchOffers();
    } catch {
      Alert.alert(t.common.error, t.offers.failedToWithdrawOffer);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const filterOptions = [{ id: "all", label: t.common.all, labelAr: t.common.all }, ...OFFER_STATUSES];

  // Deciding on a half-read order map would show an award as accepted and then
  // take it back, so the list waits for both reads.
  const busy = loading || !ordersReady;

  const renderOfferActions = (item: OfferItem) => {
    const nodes: React.ReactNode[] = [];
    if (item.status === OFFER_STATUS.ACCEPTED) {
      nodes.push(
        <Button
          key="chat"
          title={t.offers.openChat}
          size="sm"
          variant="outline"
          onPress={() => router.push(`/chat/${item.id}`)}
        />
      );
    }
    if (item.status === OFFER_STATUS.PRICE_REDUCTION) {
      nodes.push(
        <Button
          key="revise"
          title={t.offers.reviseOnWeb}
          size="sm"
          onPress={handleReviseOnWeb}
        />
      );
    }
    if (item.status === OFFER_STATUS.UNDER_REVIEW) {
      nodes.push(
        <Button
          key="withdraw"
          title={t.offers.withdraw}
          size="sm"
          variant="destructive"
          onPress={() => setWithdrawOffer(item)}
        />
      );
    }
    return nodes.length > 0 ? (
      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
        {nodes}
      </View>
    ) : undefined;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.dashboard.myOffers}
        right={
          filtered.length > 0 ? (
            <View style={[styles.countBadge, { backgroundColor: colors.cta + "15", borderColor: colors.cta + "30" }]}>
              <Text style={[styles.countText, { color: colors.cta }]}>{filtered.length}</Text>
            </View>
          ) : undefined
        }
      />

      {/* Stats bar */}
      {!busy && offers.length > 0 && (
        <View style={[styles.statsBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.warning, fontFamily: "Inter_600SemiBold" }]}>{pendingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.outline }]}>{t.offers.pending}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success, fontFamily: "Inter_600SemiBold" }]}>{acceptedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.outline }]}>{t.offers.accepted}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.destructive, fontFamily: "Inter_600SemiBold" }]}>{rejectedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.outline }]}>{t.offers.rejected}</Text>
          </View>
        </View>
      )}

      {/* Status filter chips */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView keyboardShouldPersistTaps="handled"
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {filterOptions.map((s) => {
            const active = statusFilter === s.id;
            const label = s.id === "all" ? s.label : (isRTL && (s as any).labelAr ? (s as any).labelAr : s.label);
            const statusCount = s.id === "all" ? offers.length : offers.filter((o) => o.status === s.id).length;
            return (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.chip,
                  active
                    ? { backgroundColor: colors.cta, borderColor: colors.cta }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setStatusFilter(s.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.chipText, { color: active ? colors.ctaForeground : colors.onSurfaceVariant }]}>
                  {label}
                </Text>
                {statusCount > 0 && (
                  <View style={[styles.chipCount, { backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.border }]}>
                    <Text style={[styles.chipCountText, { color: active ? colors.ctaForeground : colors.outline }]}>
                      {statusCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {busy ? (
        <View style={{ padding: 16, gap: 10 }}>
          {[1, 2, 3].map((k) => <CardSkeleton key={k} />)}
        </View>
      ) : fetchError ? (
        <View style={styles.errorCenter}>
          <Feather name="alert-triangle" size={30} color={colors.destructive} />
          <Text style={[styles.errorMsg, { color: colors.destructive }]}>{fetchError}</Text>
          <TouchableOpacity accessibilityRole="button"
            style={[styles.retryBtn, { borderColor: colors.cta }]}
            onPress={() => { setLoading(true); fetchOffers(); }}
          >
            <Text style={[styles.retryBtnText, { color: colors.cta }]}>
              {t.common.retry}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList keyboardShouldPersistTaps="handled"
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OfferCard
              offer={item}
              onPress={item.status === OFFER_STATUS.ACCEPTED ? () => router.push(`/chat/${item.id}`) : undefined}
              actions={renderOfferActions(item)}
            />
          )}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: tabScreenBottomPadding(insets.bottom) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchOffers(); }}
              tintColor={colors.cta}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="tag"
              title={t.dashboard.noOffers}
              subtitle={statusFilter !== "all" ? t.offers.noOffersWithStatus : t.dashboard.noOffersDesc}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Withdraw Confirm Modal ── */}
      <Modal
        visible={!!withdrawOffer}
        transparent
        animationType="fade"
        onRequestClose={() => setWithdrawOffer(null)}
      >
        <Pressable accessible={false} style={styles.modalOverlay} onPress={() => setWithdrawOffer(null)}>
          <Pressable accessible={false}
            style={[styles.withdrawSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.withdrawIcon, { backgroundColor: colors.destructive + "12" }]}>
              <Feather name="alert-triangle" size={28} color={colors.destructive} />
            </View>
            <Text style={[styles.withdrawTitle, { color: colors.foreground }]}>
              {t.offers.withdrawOffer}
            </Text>
            <Text style={[styles.withdrawDesc, { color: colors.outline }]}>
              {t.offers.withdrawConfirm}
            </Text>
            {withdrawOffer?.rfqTitle && (
              <Text style={[styles.withdrawRfqTitle, { color: colors.mutedForeground }]} numberOfLines={2}>
                {withdrawOffer.rfqTitle}
              </Text>
            )}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10, marginTop: 8 }}>
              <Button
                title={t.common.cancel}
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => setWithdrawOffer(null)}
              />
              <Button
                title={t.offers.withdraw}
                variant="destructive"
                style={{ flex: 1 }}
                loading={isWithdrawing}
                onPress={handleWithdraw}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  countBadge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 },
  countText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },

  // Error state
  errorCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  errorMsg: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, marginTop: 4 },
  retryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, lineHeight: 24 },

  // Stats bar
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 17, lineHeight: 28 },
  statLabel: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular", },
  statDivider: { width: 1, height: 28, marginHorizontal: 8 },

  // Filter
  filterBar: { paddingVertical: 10, borderBottomWidth: 1 },
  chipsScroll: { paddingHorizontal: 16, gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  chipCount: { borderRadius: 12, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: "center" },
  chipCountText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },

  list: { padding: 16 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },

  // Withdraw modal
  withdrawSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 24,
  },
  withdrawIcon: { width: 60, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  withdrawTitle: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  withdrawDesc: { fontSize: 14, lineHeight: 24, textAlign: "center", fontFamily: "Inter_400Regular" },
  withdrawRfqTitle: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", textAlign: "center" },
});
