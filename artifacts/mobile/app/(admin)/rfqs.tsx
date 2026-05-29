import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, RefreshControl, Platform,
} from "react-native";
import { router } from "expo-router";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { db } from "@/lib/firebase";
import { RFQCard, RFQItem } from "@/components/RFQCard";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AdminRFQsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [rfqs, setRfqs] = useState<RFQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRFQs = async () => {
    try {
      const snap = await getDocs(query(collection(db, "rfqs"), orderBy("createdAt", "desc")));
      setRfqs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RFQItem)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchRFQs(); }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>All RFQs</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>{rfqs.length} total</Text>
      </View>
      {loading ? (
        <View style={{ padding: 16 }}>{[1, 2, 3].map((k) => <CardSkeleton key={k} />)}</View>
      ) : (
        <FlatList
          data={rfqs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RFQCard rfq={item} onPress={() => {}} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRFQs(); }} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="file-text" title="No RFQs yet" subtitle="Platform RFQs will appear here" />}
          scrollEnabled={!!rfqs.length}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 4 },
  title: { fontSize: 24, fontWeight: "700" as const },
  count: { fontSize: 14 },
  list: { padding: 16 },
});
