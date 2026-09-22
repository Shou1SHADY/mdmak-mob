import React, { useEffect, useMemo, useState } from "react";
import {
  View, FlatList, StyleSheet, Platform,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { tabScreenBottomPadding } from "@/lib/layout";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { OfferCard, OfferItem } from "@/components/OfferCard";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { OFFER_STATUS } from "@/constants/data";
import { useSupplierOrders } from "@/hooks/useSupplierOrders";
import { asSupplierSees } from "@/lib/procurement/supplier";

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const t = useT();
  const [awarded, setAwarded] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.organizationId) { setLoading(false); return; }
      setError(false);
      try {
        // No orderBy — avoids composite index requirement; filter + sort client-side
        const snap = await getDocs(
          query(
            collection(db, "offers"),
            where("organizationId", "==", user.organizationId),
            where("status", "==", OFFER_STATUS.ACCEPTED)
          )
        );
        const items: OfferItem[] = await Promise.all(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as OfferItem))
            .sort((a, b) => {
              const ta = typeof a.createdAt?.toDate === "function" ? a.createdAt.toDate().getTime() : 0;
              const tb = typeof b.createdAt?.toDate === "function" ? b.createdAt.toDate().getTime() : 0;
              return tb - ta;
            })
            .map(async (offer) => {
              try {
                const rfqDoc = await getDoc(doc(db, "rfqs", offer.rfqId));
                if (rfqDoc.exists()) offer.rfqTitle = (rfqDoc.data() as any).title;
              } catch {}
              return offer;
            })
        );
        setAwarded(items);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user?.organizationId, reloadKey]);

  // The query above asks the server for awards, which cannot know whether an
  // award has been disclosed: one still waiting for Finance to approve its
  // purchase order is not this supplier's order yet. Mapping the statuses and
  // keeping only what still reads as accepted drops exactly those.
  const { ordersById, ready: ordersReady } = useSupplierOrders(user?.organizationId);
  const orders = useMemo(
    () => asSupplierSees(awarded, ordersById).filter((o) => o.status === OFFER_STATUS.ACCEPTED),
    [awarded, ordersById]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.orders.title} showBack />
      {loading || !ordersReady ? (
        <View style={{ padding: 16, gap: 10 }}>{[1, 2].map((k) => <CardSkeleton key={k} />)}</View>
      ) : error ? (
        <EmptyState variant="error" icon="package" title={t.errors.somethingWentWrong} actionLabel={t.common.retry} onAction={() => { setLoading(true); setReloadKey((k) => k + 1); }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OfferCard
              offer={item}
              onPress={() => router.push(`/chat/${item.id}`)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: tabScreenBottomPadding(insets.bottom) }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState icon="package" title={t.orders.noOrders} subtitle={t.orders.noOrdersDesc} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
});
