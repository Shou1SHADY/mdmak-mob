import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  Platform, StyleSheet, ScrollView, Modal, Alert, TextInput, Pressable,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useT, useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
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
        .sort((a, b) => {
          const ta = typeof a.createdAt?.toDate === "function" ? a.createdAt.toDate().getTime() : 0;
          const tb = typeof b.createdAt?.toDate === "function" ? b.createdAt.toDate().getTime() : 0;
          return tb - ta;
        });

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

  useEffect(() => { fetchOffers(); }, [user?.organizationId]);
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
        updatedAt: serverTimestamp(),
      });
      // Notify contractor
      const contractorId = (updatePriceOffer as any).contractorId;
      if (contractorId) {
        try {
          await addDoc(collection(db, "users", contractorId, "notifications"), {
            userId: contractorId,
            type: "price_updated",
            title: "💰 قام المورد بتحديث سعر عرضه",
            message: `تم تحديث السعر لمناقصة: ${updatePriceOffer.rfqTitle || ""}. السعر الجديد: ${newPrice} ر.س`,
            offerId: updatePriceOffer.id,
            rfqId: updatePriceOffer.rfqId,
            createdAt: serverTimestamp(),
            read: false,
          });
        } catch {}
      }
      setUpdatePriceOffer(null);
      setNewPrice("");
      fetchOffers();
    } catch {
      Alert.alert(t.common.error, isRTL ? "فشل تحديث السعر" : "Failed to update price");
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
      if (contractorId) {
        try {
          await addDoc(collection(db, "users", contractorId, "notifications"), {
            userId: contractorId,
            type: "offer_withdrawn",
            title: isRTL ? "تم سحب العرض" : "Offer Withdrawn",
            message: isRTL
              ? `قام المورد بسحب عرضه على مناقصة: ${rfqTitle}`
              : `The supplier withdrew their offer for: ${rfqTitle}`,
            rfqId: withdrawOffer.rfqId,
            createdAt: serverTimestamp(),
            read: false,
          });
        } catch {}
      }
      setWithdrawOffer(null);
      fetchOffers();
    } catch {
      Alert.alert(t.common.error, isRTL ? "فشل سحب العرض" : "Failed to withdraw offer");
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
          title={isRTL ? "فتح المحادثة" : "Open Chat"}
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
          title={isRTL ? "تحديث السعر" : "Update Price"}
          size="sm"
          onPress={() => { setUpdatePriceOffer(item); setNewPrice(item.price || ""); }}
        />
      );
    }
    if (item.status === OFFER_STATUS.UNDER_REVIEW) {
      nodes.push(
        <Button
          key="withdraw"
          title={isRTL ? "سحب العرض" : "Withdraw"}
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
            <Text style={[styles.statValue, { color: colors.warning, fontFamily: "HankenGrotesk_700Bold" }]}>{pendingCount}</Text>
            <Text style={[styles.statLabel, { color: colors.outline }]}>{isRTL ? "قيد المراجعة" : "Pending"}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success, fontFamily: "HankenGrotesk_700Bold" }]}>{acceptedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.outline }]}>{isRTL ? "مقبول" : "Accepted"}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.destructive, fontFamily: "HankenGrotesk_700Bold" }]}>{rejectedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.outline }]}>{isRTL ? "مرفوض" : "Rejected"}</Text>
          </View>
        </View>
      )}

      {/* Status filter chips */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
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
                <Text style={[styles.chipText, { color: active ? "#FFFFFF" : colors.onSurfaceVariant }]}>
                  {label}
                </Text>
                {statusCount > 0 && (
                  <View style={[styles.chipCount, { backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.border }]}>
                    <Text style={[styles.chipCountText, { color: active ? "#FFFFFF" : colors.outline }]}>
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
          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: colors.cta }]}
            onPress={() => { setLoading(true); fetchOffers(); }}
          >
            <Text style={[styles.retryBtnText, { color: colors.cta }]}>
              {isRTL ? "إعادة المحاولة" : "Retry"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
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
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 82) },
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
        <Pressable style={styles.modalOverlay} onPress={() => setUpdatePriceOffer(null)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={{ alignItems: "center", paddingBottom: 8 }}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>

            <Text style={[styles.modalTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
              {isRTL ? "تحديث سعر العرض" : "Update Offer Price"}
            </Text>

            {/* Show contractor's target price if set */}
            {(updatePriceOffer as any)?.targetPrice && (
              <View style={[styles.targetPriceBox, { backgroundColor: colors.warning + "12", borderColor: colors.warning + "40" }]}>
                <Feather name="alert-circle" size={14} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.targetLabel, { color: colors.warning }]}>
                    {isRTL ? "السعر المطلوب من المقاول:" : "Contractor's target price:"}
                  </Text>
                  <Text style={[styles.targetValue, { color: colors.warning }]}>
                    {new Intl.NumberFormat(isRTL ? "ar-SA" : "en-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format((updatePriceOffer as any).targetPrice)}
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
              {isRTL ? "سعرك الحالي:" : "Your current price:"}
              {"  "}
              <Text style={{ color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }}>
                {updatePriceOffer?.price ? `${Number(updatePriceOffer.price).toLocaleString(isRTL ? "ar-SA" : "en-SA")} ر.س` : "-"}
              </Text>
            </Text>

            <Text style={[styles.newPriceLabel, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
              {isRTL ? "السعر الجديد (ر.س) *" : "New Price (SAR) *"}
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
              placeholder={isRTL ? "أدخل السعر الجديد" : "Enter new price"}
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
                title={isRTL ? "تحديث السعر" : "Update Price"}
                style={{ flex: 2 }}
                loading={isUpdatingPrice}
                onPress={handleUpdatePrice}
                disabled={!newPrice.trim()}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Withdraw Confirm Modal ── */}
      <Modal
        visible={!!withdrawOffer}
        transparent
        animationType="fade"
        onRequestClose={() => setWithdrawOffer(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setWithdrawOffer(null)}>
          <Pressable
            style={[styles.withdrawSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.withdrawIcon, { backgroundColor: colors.destructive + "12" }]}>
              <Feather name="alert-triangle" size={28} color={colors.destructive} />
            </View>
            <Text style={[styles.withdrawTitle, { color: colors.foreground }]}>
              {isRTL ? "سحب العرض" : "Withdraw Offer"}
            </Text>
            <Text style={[styles.withdrawDesc, { color: colors.outline }]}>
              {isRTL
                ? "هل أنت متأكد من سحب هذا العرض؟ سيتم حذفه نهائياً وإشعار المقاول."
                : "Are you sure you want to withdraw this offer? It will be permanently deleted and the contractor will be notified."}
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
                title={isRTL ? "سحب العرض" : "Withdraw"}
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
  countText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  // Error state
  errorCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  errorMsg: { fontSize: 14, fontFamily: "Inter_500Medium", textAlign: "center" },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, marginTop: 4 },
  retryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },

  // Stats bar
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 20 },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.4 },
  statDivider: { width: 1, height: 28, marginHorizontal: 8 },

  // Filter
  filterBar: { paddingVertical: 10, borderBottomWidth: 1 },
  chipsScroll: { paddingHorizontal: 16, gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  chipCount: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: "center" },
  chipCountText: { fontSize: 10, fontFamily: "Inter_700Bold" },

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
  handle: { width: 40, height: 4, borderRadius: 2 },
  modalTitle: { fontSize: 18, fontFamily: "HankenGrotesk_700Bold" },

  targetPriceBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  targetLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.4 },
  targetValue: { fontSize: 18, fontFamily: "HankenGrotesk_700Bold", marginTop: 2 },

  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },

  currentLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  newPriceLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  priceInput: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontFamily: "HankenGrotesk_700Bold",
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
  withdrawTitle: { fontSize: 18, fontFamily: "HankenGrotesk_700Bold", textAlign: "center" },
  withdrawDesc: { fontSize: 14, lineHeight: 21, textAlign: "center", fontFamily: "Inter_400Regular" },
  withdrawRfqTitle: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
});
