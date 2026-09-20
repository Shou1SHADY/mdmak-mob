import React, { useCallback, useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  Platform, StyleSheet, ScrollView, Modal, Alert, TextInput, Pressable, KeyboardAvoidingView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, increment } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { formatSar } from "@/lib/crm-display";
import { tabScreenBottomPadding } from "@/lib/layout";
import { useAuth } from "@/context/AuthContext";
import { useT, useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { byNewest } from "@/lib/time";
import { OfferCard, OfferItem } from "@/components/OfferCard";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { OFFER_STATUSES, OFFER_STATUS } from "@/constants/data";

export default function MyOffersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [filtered, setFiltered] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Update price state
  const [updatePriceOffer, setUpdatePriceOffer] = useState<OfferItem | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

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

      setOffers(items);
      applyFilter(items, statusFilter);
    } catch (e: any) {
      setFetchError(e?.message || "Failed to load offers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = (items: OfferItem[], status: string) => {
    setFiltered(status === "all" ? items : items.filter((o) => o.status === status));
  };

  // Submitting an offer returns to this list, which never unmounted.
  useFocusEffect(useCallback(() => { fetchOffers(); }, [user?.organizationId]));
  useEffect(() => { applyFilter(offers, statusFilter); }, [statusFilter, offers]);

  // Stats
  const pendingCount = offers.filter((o) => o.status === OFFER_STATUS.UNDER_REVIEW).length;
  const acceptedCount = offers.filter((o) => o.status === OFFER_STATUS.ACCEPTED).length;
  const rejectedCount = offers.filter((o) => o.status === OFFER_STATUS.REJECTED).length;

  const handleUpdatePrice = async () => {
    if (!updatePriceOffer || !newPrice.trim()) return;
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert(t.common.error, t.rfq.invalidPrice);
      return;
    }
    setIsUpdatingPrice(true);
    try {
      await updateDoc(doc(db, "offers", updatePriceOffer.id), {
        price: newPrice,
        status: OFFER_STATUS.UNDER_REVIEW,
        updatedAt: new Date().toISOString(),
      });
      // Notify contractor
      const contractorId = (updatePriceOffer as any).contractorId;
      if (contractorId) {
        try {
          await addDoc(collection(db, "users", contractorId, "notifications"), {
            userId: contractorId,
            type: "price_updated",
            i18n: { title: "pn_price_updated_title", message: "pn_price_updated", params: { rfq: updatePriceOffer.rfqTitle || "", price: String(newPrice) } },
            title: "قام المورد بتحديث سعر عرضه",  // ui-ok: fallback text for push; readers get i18n
            message: `تم تحديث السعر لمناقصة: ${updatePriceOffer.rfqTitle || ""}. السعر الجديد: ${newPrice} ر.س`,  // ui-ok: fallback text for push; readers get i18n
            offerId: updatePriceOffer.id,
            rfqId: updatePriceOffer.rfqId,
            createdAt: new Date().toISOString(),
            read: false,
          });
        } catch {}
      }
      setUpdatePriceOffer(null);
      setNewPrice("");
      fetchOffers();
    } catch {
      Alert.alert(t.common.error, t.offers.failedToUpdatePrice);
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawOffer) return;
    setIsWithdrawing(true);
    try {
      const contractorId = (withdrawOffer as any).contractorId;
      const rfqTitle = withdrawOffer.rfqTitle || "";
      await deleteDoc(doc(db, "offers", withdrawOffer.id));
      // Submitting incremented this; without the matching decrement the RFQ
      // keeps reporting an offer the contractor can no longer open. Best
      // effort, exactly as the increment is on submission.
      if (withdrawOffer.rfqId) {
        try {
          await updateDoc(doc(db, "rfqs", withdrawOffer.rfqId), { offersCount: increment(-1) });
        } catch {}
      }
      if (contractorId) {
        try {
          await addDoc(collection(db, "users", contractorId, "notifications"), {
            userId: contractorId,
            type: "offer_withdrawn",
            i18n: { title: "pn_offer_withdrawn_title", message: "pn_offer_withdrawn", params: { rfq: rfqTitle || "" } },
            title: isRTL ? "تم سحب العرض" : "Offer Withdrawn",  // ui-ok: fallback text for push; readers get i18n
            message: isRTL
              ? `قام المورد بسحب عرضه على مناقصة: ${rfqTitle}`  // ui-ok: fallback text for push; readers get i18n
              : `The supplier withdrew their offer for: ${rfqTitle}`,
            rfqId: withdrawOffer.rfqId,
            createdAt: new Date().toISOString(),
            read: false,
          });
        } catch {}
      }
      setWithdrawOffer(null);
      fetchOffers();
    } catch {
      Alert.alert(t.common.error, t.offers.failedToWithdrawOffer);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const filterOptions = [{ id: "all", label: t.common.all, labelAr: t.common.all }, ...OFFER_STATUSES];

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
          key="update"
          title={t.offers.updatePrice}
          size="sm"
          onPress={() => { setUpdatePriceOffer(item); setNewPrice(item.price || ""); }}
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
      {!loading && offers.length > 0 && (
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

      {loading ? (
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

      {/* ── Update Price Modal ── */}
      <Modal
        visible={!!updatePriceOffer}
        transparent
        animationType="slide"
        onRequestClose={() => setUpdatePriceOffer(null)}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable accessible={false} style={styles.modalOverlay} onPress={() => setUpdatePriceOffer(null)}>
            <Pressable accessible={false}
              style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Handle */}
              <View style={{ alignItems: "center", paddingBottom: 8 }}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
              </View>

              <Text style={[styles.modalTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
                {t.offers.updateOfferPrice}
              </Text>

              {/* Show contractor's target price if set */}
              {(updatePriceOffer as any)?.targetPrice && (
                <View style={[styles.targetPriceBox, { backgroundColor: colors.warning + "12", borderColor: colors.warning + "40" }]}>
                  <Feather name="alert-circle" size={14} color={colors.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.targetLabel, { color: colors.warning }]}>
                      {t.offers.contractorSTargetPrice}
                    </Text>
                    <Text style={[styles.targetValue, { color: colors.warning }]}>
                      {formatSar((updatePriceOffer as any).targetPrice, isRTL)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Show contractor's note if present */}
              {(updatePriceOffer as any)?.reductionNote && (
                <View style={[styles.noteBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Feather name="message-square" size={13} color={colors.outline} />
                  <Text style={[styles.noteText, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
                    {(updatePriceOffer as any).reductionNote}
                  </Text>
                </View>
              )}

              <Text style={[styles.currentLabel, { color: colors.outline, textAlign: isRTL ? "right" : "left" }]}>
                {t.offers.yourCurrentPrice}
                {"  "}
                <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
                  {updatePriceOffer?.price ? `${Number(updatePriceOffer.price).toLocaleString(isRTL ? "ar-SA" : "en-SA")} ${t.offers.sarUnit}` : "-"}
                </Text>
              </Text>

              <Text style={[styles.newPriceLabel, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
                {t.offers.newPriceSar}
              </Text>
              <TextInput
                style={[
                  styles.priceInput,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    textAlign: isRTL ? "right" : "left",
                  },
                ]}
                value={newPrice}
                onChangeText={setNewPrice}
                keyboardType="numeric"
                placeholder={t.offers.enterNewPrice}
                placeholderTextColor={colors.outline}
                autoFocus
              />

              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10, marginTop: 16 }}>
                <Button
                  title={t.common.cancel}
                  variant="outline"
                  style={{ flex: 1 }}
                  onPress={() => { setUpdatePriceOffer(null); setNewPrice(""); }}
                />
                <Button
                  title={t.offers.updatePrice}
                  style={{ flex: 2 }}
                  loading={isUpdatingPrice}
                  onPress={handleUpdatePrice}
                  disabled={!newPrice.trim()}
                />
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

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
  handle: { width: 40, height: 4, borderRadius: 4 },
  modalTitle: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" },

  targetPriceBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  targetLabel: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular", },
  targetValue: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold", marginTop: 2 },

  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  noteText: { flex: 1, fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular" },

  currentLabel: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular" },
  newPriceLabel: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  priceInput: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 17, lineHeight: 28,
    fontFamily: "Inter_600SemiBold",
  },

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
