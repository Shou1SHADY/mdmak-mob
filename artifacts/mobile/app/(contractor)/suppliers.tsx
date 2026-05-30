import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
} from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface Supplier {
  id: string;
  name: string;
  city?: string;
  specializations?: string[];
  serviceAreas?: string[];
  verified?: boolean;
  rating?: number;
}

export default function SuppliersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filtered, setFiltered] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchSuppliers = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "Supplier"));
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({
        id: d.id,
        name: d.data().orgName ?? d.data().displayName ?? "Unknown",
        city: d.data().city,
        specializations: d.data().specializations,
        serviceAreas: d.data().serviceAreas,
        verified: d.data().verified,
      } as Supplier));
      setSuppliers(items);
      setFiltered(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);
  useEffect(() => {
    if (!search.trim()) { setFiltered(suppliers); return; }
    setFiltered(suppliers.filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.city?.toLowerCase().includes(search.toLowerCase()) ||
      s.specializations?.some((sp) => sp.toLowerCase().includes(search.toLowerCase()))
    ));
  }, [search, suppliers]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>{t.suppliers.title}</Text>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder={t.suppliers.searchPlaceholder}
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>
          {[1, 2, 3].map((k) => <CardSkeleton key={k} />)}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.supplierName, { color: colors.foreground }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.verified && (
                      <StatusBadge label={t.suppliers.verified} color={colors.success} size="sm" />
                    )}
                  </View>
                  {item.city && (
                    <View style={styles.metaItem}>
                      <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.city}</Text>
                    </View>
                  )}
                </View>
              </View>
              {item.specializations && item.specializations.length > 0 && (
                <View style={styles.specRow}>
                  {item.specializations.slice(0, 3).map((spec, i) => (
                    <View key={i} style={[styles.specChip, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.specText, { color: colors.mutedForeground }]}>{spec}</Text>
                    </View>
                  ))}
                  {item.specializations.length > 3 && (
                    <Text style={[styles.moreText, { color: colors.mutedForeground }]}>
                      +{item.specializations.length - 3}
                    </Text>
                  )}
                </View>
              )}
            </Card>
          )}
          ListEmptyComponent={<EmptyState icon="users" title={t.suppliers.noSuppliers} subtitle={t.suppliers.noSuppliersDesc} />}
          scrollEnabled={!!filtered.length}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" as const },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, fontSize: 15 },
  list: { padding: 16, gap: 12 },
  card: { marginBottom: 12, gap: 12 },
  cardTop: { flexDirection: "row", gap: 14, alignItems: "center" },
  avatar: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20, fontWeight: "700" as const },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  supplierName: { fontSize: 16, fontWeight: "700" as const },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  metaText: { fontSize: 13 },
  specRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  specChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  specText: { fontSize: 12, fontWeight: "500" as const },
  moreText: { fontSize: 12, alignSelf: "center" },
});
