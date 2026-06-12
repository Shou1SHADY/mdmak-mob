import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator, ScrollView,
} from "react-native";
import { collection, query, where, getDocs, orderBy, updateDoc, doc, addDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { EmptyState } from "@/components/ui/EmptyState";

interface RFQRow {
  id: string;
  title: string;
  status: string;
  deadline?: string;
  offersCount: number;
}

interface OfferRow {
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

  const [rfqs, setRfqs] = useState<RFQRow[]>([]);
  const [rfqLoading, setRfqLoading] = useState(true);

  const [selectedRfq, setSelectedRfq] = useState<RFQRow | null>(null);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("price");
  const [processing, setProcessing] = useState<string | null>(null);

  /* ── Load RFQs that have offers ── */
  useEffect(() => {
    const load = async () => {
      const orgId = user?.organizationId;
      if (!orgId) { setRfqLoading(false); return; }
      try {
        const snap = await getDocs(query(
          collection(db, "rfqs"),
          where("organizationId", "==", orgId),
          orderBy("createdAt", "desc"),
        ));
        const rows: RFQRow[] = [];
        for (const d of snap.docs) {
          const offSnap = await getDocs(query(collection(db, "offers"), where("rfqId", "==", d.id)));
          if (offSnap.size > 0) {
            rows.push({ id: d.id, offersCount: offSnap.size, ...(d.data() as any) });
          }
        }
        setRfqs(rows);
      } catch (e) { console.warn(e); }
      finally { setRfqLoading(false); }
    };
    load();
  }, [user?.organizationId]);

  /* ── Load offers for selected RFQ ── */
  const loadOffers = useCallback(async (rfq: RFQRow) => {
    setSelectedRfq(rfq);
    setOffersLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, "offers"),
        where("rfqId", "==", rfq.id),
        orderBy("createdAt", "desc"),
      ));
      setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() } as OfferRow)));
    } catch (e) { console.warn(e); }
    finally { setOffersLoading(false); }
  }, []);

  /* ── Accept offer ── */
  const handleAccept = async (offer: OfferRow) => {
    if (!user || !selectedRfq) return;
    setProcessing(offer.id);
    try {
      await updateDoc(doc(db, "offers", offer.id), {
        status: "مقبول",
        decidedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, "rfqs", selectedRfq.id), {
        status: "Awarded",
        awardedAt: new Date().toISOString(),
      });
      if (offer.supplierId) {
        await addDoc(collection(db, "users", offer.supplierId, "notifications"), {
          userId: offer.supplierId,
          type: "offer_accepted",
          title: isRTL ? "تم قبول عرضك" : "Your offer was accepted",
          message: isRTL
            ? `تم قبول عرضك لـ "${offer.rfqTitle ?? selectedRfq.title}"`
            : `Your offer for "${offer.rfqTitle ?? selectedRfq.title}" was accepted`,
          offerId: offer.id,
          rfqId: selectedRfq.id,
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
      setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: "مقبول" } : o));
    } catch (e) { console.warn(e); }
    finally { setProcessing(null); }
  };

  /* ── Helpers ── */
  const durInDays = (o: OfferRow) => {
    const n = parseInt(o.executionDuration ?? "") || 0;
    if (!n) return Infinity;
    const u = o.executionDurationUnit ?? "";
    return n * (u === "أشهر" ? 30 : u === "أسابيع" ? 7 : 1);
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
    if (s === "مقبول") return t.compare.accepted;
    if (s === "مرفوض") return t.compare.rejected;
    if (s === "مطلوب تخفيض") return t.compare.reduction;
    return t.compare.pending;
  };
  const statusColor = (s: string) => {
    if (s === "مقبول") return colors.success;
    if (s === "مرفوض") return colors.destructive;
    if (s === "مطلوب تخفيض") return colors.warning;
    return colors.cta;
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 16);

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
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : rfqs.length === 0 ? (
          <EmptyState icon="bar-chart-2" title={t.compare.noRfqs} subtitle={t.compare.noRfqsDesc} />
        ) : (
          <FlatList
            data={rfqs}
            keyExtractor={r => r.id}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 80 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
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
        <TouchableOpacity
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
          <TouchableOpacity
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
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : sortedOffers.length === 0 ? (
        <EmptyState icon="inbox" title={t.compare.noOffers} subtitle={t.compare.noOffersDesc} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
        >
          {sortedOffers.map((offer, idx) => {
            const price = parseFloat(String(offer.price)) || 0;
            const isBest = price === lowestPrice && offer.status !== "مرفوض";
            const isPending = offer.status === "قيد المراجعة";
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
                    <Text style={[styles.rankText, { color: isBest ? "#fff" : colors.outline }]}>
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
                  <View style={[styles.metricBlock, { backgroundColor: (isBest ? colors.success : colors.primary) + "0D" }]}>
                    <Text style={[styles.metricValue, { color: isBest ? colors.success : colors.primary }]}>
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
                      <Text style={[styles.metricValue, { color: colors.onSurfaceVariant, fontSize: 13 }]}>
                        {fmtDate(offer.createdAt)}
                      </Text>
                      <Text style={[styles.metricLabel, { color: colors.outline }]}>{t.compare.sortDate}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Accept button — only for pending offers */}
                {isPending && (
                  <TouchableOpacity
                    style={[styles.acceptBtn, { backgroundColor: isBest ? colors.success : colors.cta }]}
                    onPress={() => handleAccept(offer)}
                    disabled={processing === offer.id}
                    activeOpacity={0.8}
                  >
                    {processing === offer.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Feather name="check-circle" size={15} color="#fff" />
                    }
                    <Text style={styles.acceptText}>{t.compare.accept}</Text>
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
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 20,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  backRow: {
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  backLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  /* RFQ list */
  rfqCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  rfqTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
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
    fontSize: 12,
  },
  rfqDeadline: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
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
    fontSize: 12.5,
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
    fontFamily: "Inter_700Bold",
    fontSize: 11.5,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11.5,
  },
  supplierName: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 16,
  },
  metricsRow: {
    gap: 8,
  },
  metricBlock: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 2,
  },
  metricValue: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 16,
  },
  metricLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#fff",
  },
});
