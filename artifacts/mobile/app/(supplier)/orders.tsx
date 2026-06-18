import React, { useEffect, useState } from "react";
import {
  View, FlatList, StyleSheet, Platform,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { OfferCard, OfferItem } from "@/components/OfferCard";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { OFFER_STATUS } from "@/constants/data";

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const t = useT();
  const [orders, setOrders] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.organizationId) { setLoading(false); return; }
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
        setOrders(items);
      } catch (e: any) {
        console.warn("[Orders]", e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user?.organizationId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.orders.title} showBack />
      {loading ? (
        <View style={{ padding: 16, gap: 10 }}>{[1, 2].map((k) => <CardSkeleton key={k} />)}</View>
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
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 82) }]}
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
