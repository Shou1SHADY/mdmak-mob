import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet,
  Modal, Pressable, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";

export interface BOQItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  specs?: string;
}

const BOQ_UNITS = [
  { id: "طن",   labelAr: "طن",   labelEn: "Ton"   },
  { id: "م²",   labelAr: "م²",   labelEn: "m²"    },
  { id: "م³",   labelAr: "م³",   labelEn: "m³"    },
  { id: "م.ط", labelAr: "م.ط",  labelEn: "LM"    },
  { id: "قطعة",labelAr: "قطعة", labelEn: "Piece" },
  { id: "كجم",  labelAr: "كجم",  labelEn: "KG"    },
  { id: "لتر",  labelAr: "لتر",  labelEn: "Liter" },
  { id: "متر",  labelAr: "متر",  labelEn: "Meter" },
  { id: "كيس",  labelAr: "كيس",  labelEn: "Bag"   },
  { id: "طقم",  labelAr: "طقم",  labelEn: "Set"   },
  { id: "وحدة",labelAr: "وحدة", labelEn: "Unit"  },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

interface ItemFormProps {
  item: Partial<BOQItem>;
  onChange: (item: Partial<BOQItem>) => void;
  isRTL: boolean;
  colors: ReturnType<typeof useColors>;
  t: ReturnType<typeof useT>;
}

function ItemForm({ item, onChange, isRTL, colors, t }: ItemFormProps) {
  const [unitModal, setUnitModal] = useState(false);
  const selectedUnit = BOQ_UNITS.find((u) => u.id === item.unit) ?? BOQ_UNITS[0];

  return (
    <View style={{ gap: 10 }}>
      {/* Description */}
      <View style={{ gap: 4 }}>
        <Text style={[styles.fieldLabel, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
          {t.boq.description} <Text style={{ color: colors.destructive }}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, textAlign: isRTL ? "right" : "left" }]}
          value={item.description ?? ""}
          onChangeText={(v) => onChange({ ...item, description: v })}
          placeholder={t.boq.descriptionPlaceholder}
          placeholderTextColor={colors.outline}
        />
      </View>

      {/* Unit + Quantity row */}
      <View style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {/* Quantity */}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.fieldLabel, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
            {t.boq.quantity} <Text style={{ color: colors.destructive }}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, textAlign: isRTL ? "right" : "left" }]}
            value={item.quantity ? String(item.quantity) : ""}
            onChangeText={(v) => onChange({ ...item, quantity: parseFloat(v) || 0 })}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.outline}
          />
        </View>

        {/* Unit picker */}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.fieldLabel, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
            {t.boq.unit}
          </Text>
          <TouchableOpacity
            style={[styles.input, styles.unitBtn, { borderColor: colors.border, backgroundColor: colors.background, flexDirection: isRTL ? "row-reverse" : "row" }]}
            onPress={() => setUnitModal(true)}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground }}>
              {isRTL ? selectedUnit.labelAr : selectedUnit.labelEn}
            </Text>
            <Feather name="chevron-down" size={14} color={colors.outline} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Specs */}
      <View style={{ gap: 4 }}>
        <Text style={[styles.fieldLabel, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
          {t.boq.specs}
        </Text>
        <TextInput
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background, textAlign: isRTL ? "right" : "left", height: 72, textAlignVertical: "top", paddingTop: 10 }]}
          value={item.specs ?? ""}
          onChangeText={(v) => onChange({ ...item, specs: v })}
          placeholder={t.boq.specsPlaceholder}
          placeholderTextColor={colors.outline}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Unit picker modal */}
      <Modal visible={unitModal} transparent animationType="fade" onRequestClose={() => setUnitModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setUnitModal(false)}>
          <View style={[styles.unitPickerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.unitPickerTitle, { color: colors.foreground }]}>{t.boq.unit}</Text>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {BOQ_UNITS.map((u, i) => {
                const active = item.unit === u.id;
                return (
                  <TouchableOpacity
                    key={u.id}
                    style={[
                      styles.unitRow,
                      { borderBottomColor: colors.border, borderBottomWidth: i < BOQ_UNITS.length - 1 ? 1 : 0 },
                      active && { backgroundColor: colors.primary + "10" },
                    ]}
                    onPress={() => { onChange({ ...item, unit: u.id }); setUnitModal(false); }}
                  >
                    <Text style={{ fontSize: 15, fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular", color: active ? colors.primary : colors.foreground }}>
                      {isRTL ? u.labelAr : u.labelEn}
                    </Text>
                    {active && <Feather name="check" size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

interface Props {
  items: BOQItem[];
  onChange: (items: BOQItem[]) => void;
  readonly?: boolean;
}

export function BOQEditor({ items, onChange, readonly = false }: Props) {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<BOQItem>>({});
  const [addModalVisible, setAddModalVisible] = useState(false);

  const openAdd = () => {
    setDraft({ unit: "قطعة", quantity: 1 });
    setEditingId(null);
    setAddModalVisible(true);
  };

  const openEdit = (item: BOQItem) => {
    setDraft({ ...item });
    setEditingId(item.id);
    setAddModalVisible(true);
  };

  const handleSave = () => {
    if (!draft.description?.trim()) {
      Alert.alert("", isRTL ? "وصف البند مطلوب" : "Item description is required");
      return;
    }
    if (!draft.quantity || draft.quantity <= 0) {
      Alert.alert("", isRTL ? "الكمية يجب أن تكون أكبر من صفر" : "Quantity must be greater than 0");
      return;
    }
    const item: BOQItem = {
      id: editingId ?? generateId(),
      description: draft.description.trim(),
      unit: draft.unit ?? "قطعة",
      quantity: draft.quantity,
      specs: draft.specs?.trim() || undefined,
    };
    if (editingId) {
      onChange(items.map((i) => (i.id === editingId ? item : i)));
    } else {
      onChange([...items, item]);
    }
    setAddModalVisible(false);
  };

  const handleRemove = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  return (
    <View style={{ gap: 12 }}>
      {/* Header */}
      <View style={[styles.sectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
          <View style={[styles.headerIcon, { backgroundColor: colors.cta + "14" }]}>
            <Feather name="list" size={15} color={colors.cta} />
          </View>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.boq.title}</Text>
            {!readonly && (
              <Text style={[styles.sectionSub, { color: colors.outline }]}>{t.boq.subtitle}</Text>
            )}
          </View>
        </View>
        {!readonly && (
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={openAdd}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color="#FFF" />
            <Text style={styles.addBtnText}>{t.boq.addItem}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Items list */}
      {items.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.muted + "50", borderColor: colors.border }]}>
          <Feather name="clipboard" size={22} color={colors.outline} />
          <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>{t.boq.noItems}</Text>
          {!readonly && (
            <Text style={[styles.emptyDesc, { color: colors.outline }]}>{t.boq.noItemsDesc}</Text>
          )}
        </View>
      ) : (
        items.map((item, idx) => {
          const unitObj = BOQ_UNITS.find((u) => u.id === item.unit);
          const unitLabel = unitObj ? (isRTL ? unitObj.labelAr : unitObj.labelEn) : item.unit;
          return (
            <View
              key={item.id}
              style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              {/* Index badge + description row */}
              <View style={[styles.itemHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.indexBadge, { backgroundColor: colors.primary + "12" }]}>
                  <Text style={[styles.indexText, { color: colors.primary }]}>{idx + 1}</Text>
                </View>
                <Text style={[styles.itemDesc, { color: colors.foreground, flex: 1, textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>
                  {item.description}
                </Text>
                {!readonly && (
                  <View style={[styles.itemActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Feather name="edit-2" size={14} color={colors.cta} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Feather name="trash-2" size={14} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Qty + Unit + Specs */}
              <View style={[styles.itemMeta, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.metaChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Feather name="hash" size={11} color={colors.outline} />
                  <Text style={[styles.metaChipText, { color: colors.secondary }]}>
                    {item.quantity} {unitLabel}
                  </Text>
                </View>
                {item.specs && (
                  <View style={[styles.metaChip, { backgroundColor: colors.background, borderColor: colors.border, flex: 1 }]}>
                    <Feather name="file-text" size={11} color={colors.outline} />
                    <Text style={[styles.metaChipText, { color: colors.secondary }]} numberOfLines={1}>{item.specs}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })
      )}

      {/* Add/Edit modal */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setAddModalVisible(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              {editingId ? (isRTL ? "تعديل البند" : "Edit Item") : t.boq.addItem}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <ItemForm item={draft} onChange={setDraft} isRTL={isRTL} colors={colors} t={t} />
            </ScrollView>

            <View style={[styles.sheetActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <TouchableOpacity style={[styles.sheetBtn, { borderWidth: 1, borderColor: colors.border }]} onPress={() => setAddModalVisible(false)}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.outline }}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: colors.primary, flex: 2 }]} onPress={handleSave}>
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF" }}>{t.common.save}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { alignItems: "center", justifyContent: "space-between" },
  headerIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 15, fontFamily: "HankenGrotesk_600SemiBold" },
  sectionSub: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
  },
  addBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFF" },

  emptyBox: { borderRadius: 14, borderWidth: 1, borderStyle: "dashed", padding: 28, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },

  itemCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  itemHeader: { alignItems: "flex-start", gap: 10 },
  indexBadge: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  indexText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  itemDesc: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  itemActions: { gap: 8, flexShrink: 0 },
  iconBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  itemMeta: { gap: 6, flexWrap: "wrap" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  metaChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  // Form fields
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  input: { height: 50, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, fontSize: 14, fontFamily: "Inter_400Regular" },
  unitBtn: { height: 50, justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14 },
  row: { gap: 10 },

  // Unit picker modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 32 },
  unitPickerCard: { width: "100%", borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  unitPickerTitle: { fontSize: 15, fontFamily: "HankenGrotesk_600SemiBold", padding: 16, paddingBottom: 8 },
  unitRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },

  // Bottom sheet
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 16, maxHeight: "90%" },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontFamily: "HankenGrotesk_700Bold" },
  sheetActions: { gap: 10, marginTop: 8 },
  sheetBtn: { flex: 1, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
