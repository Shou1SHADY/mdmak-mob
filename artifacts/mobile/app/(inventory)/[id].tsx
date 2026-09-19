import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/context/ToastContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { tabScreenBottomPadding } from "@/lib/layout";
import { type, space, radius, MIN_TOUCH } from "@/lib/design";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { CrmSheet } from "@/components/crm/CrmSheet";
import { CrmChoice } from "@/components/crm/CrmChoice";
import { db } from "@/lib/firebase";
import { INVENTORY_UNIT_CODES, type InventoryUnitCode } from "@/lib/inventory-units";
import { ar as inventoryAr } from "@/i18n/modules/inventory";
import { useInventoryItems, useWarehouses, type InventoryItem } from "@/hooks/useInventory";

/**
 * One warehouse's stock.
 *
 * Two writes, both the website's: adding an item (WarehouseInventoryPanel's
 * add dialog, same field set) and correcting a quantity after a count. Stock
 * that MOVES still goes through the transactional paths — requests between
 * warehouses, confirmed deliveries, waste records — never by editing a number,
 * which is why the quantity sheet says what it is for. Both need
 * `warehouses.manage`, as on the website.
 */
export default function WarehouseDetailScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { can } = usePermissions();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { warehouses, isLoading: whLoading } = useWarehouses();
  const { items, isLoading } = useInventoryItems(id);
  const canManage = can("warehouses.manage");

  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState<InventoryUnitCode>(INVENTORY_UNIT_CODES[0]);
  const [newQty, setNewQty] = useState("");
  const [newMin, setNewMin] = useState("");
  const [countTarget, setCountTarget] = useState<InventoryItem | null>(null);
  const [countQty, setCountQty] = useState("");

  const unitOptions = INVENTORY_UNIT_CODES.map((code) => ({ value: code, label: t.inventory.units[code] }));

  const doAdd = async () => {
    if (!newName.trim() || !id || !user?.organizationId) { Alert.alert(t.common.error, t.inventory.itemName); return; }
    setBusy(true);
    try {
      // The website's item shape (WarehouseInventoryPanel handleSave), minus
      // the desktop-only fields (sku, unitCost, typeId) written as null.
      await addDoc(collection(db, "warehouses", id, "inventoryItems"), {
        name: newName.trim(),
        sku: null,
        quantity: Math.max(0, parseFloat(newQty) || 0),
        // The website stores the display name beside the code; Arabic is the
        // canonical vocabulary in Firestore, as for cities and categories.
        unit: inventoryAr.inventory.units[newUnit],
        unitCode: newUnit,
        unitCost: null,
        minStockLevel: newMin.trim() ? Math.max(0, parseFloat(newMin) || 0) : null,
        typeId: null,
        trackingMode: null,
        organizationId: user.organizationId,
        warehouseId: id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast(t.inventory.itemAdded, "success");
      setAddOpen(false);
      setNewName(""); setNewQty(""); setNewMin(""); setNewUnit(INVENTORY_UNIT_CODES[0]);
    } catch {
      Alert.alert(t.common.error, t.inventory.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const doCount = async () => {
    if (!countTarget || !id) return;
    const qty = parseFloat(countQty);
    if (!Number.isFinite(qty) || qty < 0) { Alert.alert(t.common.error, t.inventory.newQuantity); return; }
    setBusy(true);
    try {
      await updateDoc(doc(db, "warehouses", id, "inventoryItems", countTarget.id), { quantity: qty, updatedAt: serverTimestamp() });
      showToast(t.inventory.quantityUpdated, "success");
      setCountTarget(null);
      setCountQty("");
    } catch {
      Alert.alert(t.common.error, t.inventory.saveFailed);
    } finally {
      setBusy(false);
    }
  };

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
    const editable = canManage && item.trackingMode !== "unit";
    return (
      <TouchableOpacity
        onPress={editable ? () => { setCountTarget(item); setCountQty(String(item.quantity)); } : undefined}
        disabled={!editable}
        activeOpacity={0.8}
        accessibilityRole={editable ? "button" : undefined}
        accessibilityLabel={editable ? `${item.name}: ${t.inventory.editQuantity}` : undefined}
        style={[
          styles.row,
          { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <View style={{ flex: 1, gap: 4 }}>
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
        {editable && <Feather name="edit-2" size={14} color={colors.outline} />}
      </TouchableOpacity>
    );
  };

  const addButton = canManage ? (
    <TouchableOpacity
      onPress={() => setAddOpen(true)}
      style={[styles.headerBtn, { backgroundColor: colors.ctaSoft }]}
      accessibilityRole="button"
      accessibilityLabel={t.inventory.addItem}
    >
      <Feather name="plus" size={18} color={colors.cta} />
    </TouchableOpacity>
  ) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={warehouse?.name ?? t.inventory.warehouses}
        subtitle={warehouse?.location ?? t.inventory.title}
        showBack
        right={addButton}
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
        <FlatList keyboardShouldPersistTaps="handled"
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: tabScreenBottomPadding(insets.bottom),
          }}
          ListEmptyComponent={
            <EmptyState
              icon="box"
              title={t.inventory.noItems}
              subtitle={t.inventory.noItemsHint}
              actionLabel={canManage ? t.inventory.addItem : undefined}
              onAction={canManage ? () => setAddOpen(true) : undefined}
            />
          }
        />
      )}

      <CrmSheet visible={addOpen} title={t.inventory.addItem} onClose={() => setAddOpen(false)} onSubmit={doAdd} submitLabel={t.common.save} submitting={busy}>
        <Input label={t.inventory.itemName} value={newName} onChangeText={setNewName} required isRTL={isRTL} containerStyle={{ marginBottom: space.md }} />
        <CrmChoice label={t.inventory.itemUnit} options={unitOptions} value={newUnit} onChange={setNewUnit} scroll required />
        <Input label={t.inventory.itemQuantity} value={newQty} onChangeText={setNewQty} keyboardType="numeric" isRTL={isRTL} containerStyle={{ marginBottom: space.md }} />
        <Input label={`${t.inventory.itemMinStock} (${t.common.optional})`} value={newMin} onChangeText={setNewMin} keyboardType="numeric" isRTL={isRTL} />
      </CrmSheet>

      <CrmSheet visible={!!countTarget} title={t.inventory.editQuantity} onClose={() => setCountTarget(null)} onSubmit={doCount} submitLabel={t.common.save} submitting={busy}>
        <Text style={[type.body, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{countTarget?.name}</Text>
        <Text style={[type.caption, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left", marginBottom: space.md }]}>{t.inventory.editQuantityHint}</Text>
        <Input label={t.inventory.newQuantity} value={countQty} onChangeText={setCountQty} keyboardType="numeric" helperText={countTarget ? `${countTarget.quantity} ${countTarget.unit}` : undefined} isRTL={isRTL} />
      </CrmSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerBtn: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  controls: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBox: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  row: {
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    minHeight: 56,
  },
  name: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  tagRow: { gap: 8, flexWrap: "wrap" },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  qty: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
  unit: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
});
