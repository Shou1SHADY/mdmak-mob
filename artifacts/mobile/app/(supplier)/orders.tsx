import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, Platform,
} from "react-native";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useT, useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { OfferCard, OfferItem } from "@/components/OfferCard";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { router } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const t = useT();
  const { isRTL } = useLanguage();
  const [orders, setOrders] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.organizationId) return;
      try {
        const q = query(
          collection(db, "offers"),
          where("organizationId", "==", user.organizationId),
          where("status", "==", "مقبول"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const items: OfferItem[] = await Promise.all(
          snap.docs.map(async (d) => {
            const offer = { id: d.id, ...d.data() } as OfferItem;
            try {
              const rfqDoc = await getDoc(doc(db, "rfqs", offer.rfqId));
              if (rfqDoc.exists()) offer.rfqTitle = rfqDoc.data().title;
            } catch {}
            return offer;
          })
        );
        setOrders(items);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user?.organizationId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>{t.orders.title}</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading ? (
        <View style={{ padding: 16 }}>{[1, 2].map((k) => <CardSkeleton key={k} />)}</View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OfferCard offer={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          ListEmptyComponent={<EmptyState icon="package" title={t.orders.noOrders} subtitle={t.orders.noOrdersDesc} />}
          scrollEnabled={!!orders.length}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: "700" as const },
  list: { padding: 16 },
});
