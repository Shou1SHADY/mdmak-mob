import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { useInventoryItems, useWarehouses, type InventoryItem } from "@/hooks/useInventory";

/**
 * One warehouse's stock.
 *
 * Read-only. Stock levels move through the transactional paths in
 * lib/warehouse-requests.ts (release and confirm), through confirmed deliveries,
 * or through a waste record — never by editing a number, which is why there is
 * no edit affordance here at all.
 */
export default function WarehouseDetailScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { warehouses, isLoading: whLoading } = useWarehouses();
  const { items, isLoading } = useInventoryItems(id);

  const [search, setSearch] = useState("");

  const warehouse = useMemo(() => warehouses.find((w) => w.id === id), [warehouses, id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items
      .filter((i) => (q ? i.name?.toLowerCase().includes(q) : true))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [items, search]);

  const renderItem = ({ item }: { item: InventoryItem }) => {
    // `minQuantity` is the reorder point the website records; below it the row
    // is flagged rather than hidden, so a site visit surfaces what to reorder.
    const low = item.minQuantity != null && item.quantity <= item.minQuantity;
    return (
      <View
        style={[
          styles.row,
          { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={[styles.name, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View style={[styles.tagRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {low && (
              <View style={[styles.pill, { backgroundColor: colors.destructive + "18" }]}>
                <Text style={[styles.pillText, { color: colors.destructive }]}>
                  {t.inventory.lowStock}
                </Text>
              </View>
            )}
            {item.trackingMode === "unit" && (
              <View style={[styles.pill, { backgroundColor: colors.muted }]}>
                <Text style={[styles.pillText, { color: colors.mutedForeground }]}>
                  {t.inventory.unitTracked}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ alignItems: isRTL ? "flex-start" : "flex-end" }}>
          <Text style={[styles.qty, { color: low ? colors.destructive : colors.foreground }]}>
            {item.quantity}
          </Text>
          <Text style={[styles.unit, { color: colors.mutedForeground }]}>{item.unit}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={warehouse?.name ?? t.inventory.warehouses}
        subtitle={warehouse?.location ?? t.inventory.title}
        showBack
      />

      <View style={styles.controls}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              flexDirection: isRTL ? "row-reverse" : "row",
            },
          ]}
        >
          <Feather name="search" size={16} color={colors.outline} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.inventory.searchItems}
            placeholderTextColor={colors.outline}
            style={[styles.searchInput, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
          />
        </View>
      </View>

      {isLoading || whLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.cta} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: (insets.bottom || 0) + 96,
          }}
          ListEmptyComponent={
            <EmptyState
              icon="box"
              title={t.inventory.noItems}
              subtitle={t.inventory.noItemsHint}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  controls: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  searchBox: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  row: {
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    minHeight: 56,
  },
  name: { fontSize: 14, lineHeight: 23, fontFamily: "Inter_500Medium" },
  tagRow: { gap: 6, flexWrap: "wrap" },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7 },
  pillText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  qty: { fontSize: 16, lineHeight: 26, fontFamily: "Inter_600SemiBold" },
  unit: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
