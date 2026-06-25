import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Alert, TouchableOpacity, Platform, KeyboardAvoidingView, Modal, Pressable, TextInput,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { collection, addDoc, getDocs, query, where, serverTimestamp, getDoc, doc, updateDoc, increment } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { OFFER_STATUS } from "@/constants/data";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ProfileIncompleteGate, useProfileGate } from "@/components/ProfileIncompleteGate";
import type { BOQItem } from "@/components/BOQEditor";

const DURATION_UNITS = [
  { id: "أيام", labelAr: "أيام", labelEn: "Days" },
  { id: "أسابيع", labelAr: "أسابيع", labelEn: "Weeks" },
  { id: "أشهر", labelAr: "أشهر", labelEn: "Months" },
];

export default function SubmitOfferScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { rfqId } = useLocalSearchParams<{ rfqId: string }>();
  const { user, organization } = useAuth();
  const { isComplete, missingFields } = useProfileGate("supplier", organization ?? null);

  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [executionDuration, setExecutionDuration] = useState("");
  const [executionDurationUnit, setExecutionDurationUnit] = useState("أيام");
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [rfqTitle, setRfqTitle] = useState("");
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [boqPricing, setBoqPricing] = useState<Record<string, string>>({}); // boqItemId -> unitPrice string

  useEffect(() => {
    const init = async () => {
      if (!rfqId) return;
      // Check duplicate
      if (user?.organizationId) {
        const q = query(
          collection(db, "offers"),
          where("rfqId", "==", rfqId),
          where("organizationId", "==", user.organizationId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) setAlreadySubmitted(true);
      }
      // Load RFQ info
      try {
        const rfqDoc = await getDoc(doc(db, "rfqs", rfqId));
        if (rfqDoc.exists()) {
          const data = rfqDoc.data();
          setRfqTitle(data.title || "");
          setContractorId(data.contractorId || null);
          if (data.boqItems && Array.isArray(data.boqItems)) {
            setBoqItems(data.boqItems as BOQItem[]);
          }
        }
      } catch (e: any) {
        console.warn("[SubmitOffer] Failed to load RFQ:", e.message);
      }
    };
    init();
  }, [rfqId, user?.organizationId]);

  const handleSubmit = async () => {
    if (alreadySubmitted) return;
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      Alert.alert(t.common.error, t.rfq.invalidPrice);
      return;
    }
    setLoading(true);
    try {
      // Build BOQ pricing array
      const boqPricingArray = boqItems.length > 0
        ? boqItems.map((item) => {
            const unitPriceStr = boqPricing[item.id] ?? "";
            const unitPrice = parseFloat(unitPriceStr) || 0;
            return { boqItemId: item.id, unitPrice, totalPrice: unitPrice * item.quantity };
          }).filter((p) => p.unitPrice > 0)
        : null;

      const offerData: Record<string, any> = {
        rfqId,
        rfqTitle,
        supplierId: user?.uid,
        organizationId: user?.organizationId,
        supplierName: user?.displayName,
        companyName: user?.orgName,
        submittedByUserId: user?.uid,
        submittedByUserName: user?.displayName,
        contractorId: contractorId || null,
        price,
        notes: notes.trim() || null,
        deliveryLocation: deliveryLocation.trim() || null,
        deliveryBatches: [{ deliveryDate: "", price, location: deliveryLocation.trim() || "" }],
        boqPricing: boqPricingArray,
        status: OFFER_STATUS.UNDER_REVIEW,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (executionDuration.trim()) {
        offerData.executionDuration = executionDuration.trim();
        offerData.executionDurationUnit = executionDurationUnit;
      }

      await addDoc(collection(db, "offers"), offerData);

      // Notify contractor + increment offersCount (best-effort — don't fail the whole submit)
      if (contractorId) {
        try {
          await addDoc(collection(db, "users", contractorId, "notifications"), {
            userId: contractorId,
            type: "new_offer",
            title: "عرض سعر جديد",
            message: `قدم المورد ${user?.orgName || user?.displayName || "مورد"} عرضاً بمبلغ ${Number(price).toLocaleString("ar-SA")} ر.س على مناقصة: ${rfqTitle}`,
            rfqId,
            createdAt: serverTimestamp(),
            read: false,
          });
        } catch (e: any) {
          console.warn("[SubmitOffer] Contractor notification failed:", e.message);
        }
        try {
          await updateDoc(doc(db, "rfqs", rfqId), { offersCount: increment(1) });
        } catch (e: any) {
          console.warn("[SubmitOffer] offersCount increment failed:", e.message);
        }
      }

      Alert.alert(t.common.success, t.rfq.submitted, [
        { text: t.common.ok, onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(t.common.error, t.rfq.submitFailed);
    } finally {
      setLoading(false);
    }
  };

  if (!isComplete) {
    return (
      <ProfileIncompleteGate
        role="supplier"
        organization={organization ?? null}
        missingFields={missingFields}
      />
    );
  }

  const selectedUnit = DURATION_UNITS.find((u) => u.id === executionDurationUnit);
  const unitLabel = isRTL ? selectedUnit?.labelAr : selectedUnit?.labelEn;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScreenHeader title={t.rfq.submitOffer} showBack />

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 60 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* RFQ context card */}
        {rfqTitle ? (
          <View style={{ borderRadius: 16, padding: 16, borderWidth: 1, gap: 4, backgroundColor: colors.card, borderColor: colors.border }}>
            <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.outline, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {isRTL ? "المناقصة" : "Tender"}
            </Text>
            <Text style={{ fontSize: 15, fontFamily: "HankenGrotesk_700Bold", color: colors.foreground }} numberOfLines={2}>
              {rfqTitle}
            </Text>
          </View>
        ) : (
          <View style={{ borderRadius: 16, padding: 16, borderWidth: 1, gap: 6, backgroundColor: colors.card, borderColor: colors.border }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>{t.rfq.offerDetails}</Text>
            <Text style={{ fontSize: 14, lineHeight: 21, color: colors.outline }}>{t.rfq.offerSubmitInfo}</Text>
          </View>
        )}

        {/* Already submitted warning */}
        {alreadySubmitted && (
          <View style={{ borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: isRTL ? "row-reverse" : "row", gap: 10, alignItems: "flex-start", backgroundColor: colors.warning + "18", borderColor: colors.warning + "50" }}>
            <Feather name="alert-circle" size={16} color={colors.warning} />
            <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: colors.warning }}>
              {t.rfq.alreadySubmitted}
            </Text>
          </View>
        )}

        <View style={{ gap: 14, opacity: alreadySubmitted ? 0.5 : 1 }}>
          {/* Price — required */}
          <Input
            label={t.rfq.price}
            required
            value={price}
            onChangeText={alreadySubmitted ? undefined : setPrice}
            keyboardType="numeric"
            leftIcon="dollar-sign"
            placeholder={t.rfq.pricePlaceholder}
            isRTL={isRTL}
            editable={!alreadySubmitted}
          />

          {/* Execution duration */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {isRTL ? "مدة التنفيذ (اختياري)" : "Execution Duration (optional)"}
            </Text>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input
                  value={executionDuration}
                  onChangeText={alreadySubmitted ? undefined : setExecutionDuration}
                  keyboardType="numeric"
                  placeholder={isRTL ? "مثال: ١٤" : "e.g. 14"}
                  leftIcon="clock"
                  isRTL={isRTL}
                  editable={!alreadySubmitted}
                />
              </View>
              <TouchableOpacity
                onPress={() => !alreadySubmitted && setUnitPickerVisible(true)}
                style={{
                  height: 52,
                  paddingHorizontal: 16,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: isRTL ? "row-reverse" : "row",
                  gap: 6,
                  minWidth: 110,
                }}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: colors.foreground }}>{unitLabel}</Text>
                <Feather name="chevron-down" size={14} color={colors.outline} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Delivery location */}
          <Input
            label={isRTL ? "موقع التسليم (اختياري)" : "Delivery Location (optional)"}
            value={deliveryLocation}
            onChangeText={alreadySubmitted ? undefined : setDeliveryLocation}
            placeholder={isRTL ? "مثال: حي النرجس، الرياض" : "e.g. Al Narjis, Riyadh"}
            leftIcon="map-pin"
            isRTL={isRTL}
            editable={!alreadySubmitted}
          />

          {/* Notes */}
          <Input
            label={t.rfq.notes}
            value={notes}
            onChangeText={alreadySubmitted ? undefined : setNotes}
            multiline
            numberOfLines={4}
            placeholder={t.rfq.notesPlaceholder}
            isRTL={isRTL}
            style={{ height: 100, textAlignVertical: "top", paddingTop: 12 }}
            editable={!alreadySubmitted}
          />

          {/* BOQ Pricing section */}
          {boqItems.length > 0 && (
            <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, gap: 14 }}>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: colors.cta + "14", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="list" size={14} color={colors.cta} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: "HankenGrotesk_600SemiBold", color: colors.foreground }}>{t.boq.pricingTitle}</Text>
                  <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.outline, marginTop: 2 }}>{t.boq.pricingDesc}</Text>
                </View>
              </View>
              {boqItems.map((item, idx) => (
                <View key={item.id} style={{ gap: 6 }}>
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: colors.primary + "12", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: colors.primary }}>{idx + 1}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground, flex: 1, textAlign: isRTL ? "right" : "left" }} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, alignItems: "center" }}>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.outline, flex: 1 }}>
                      {isRTL ? "الكمية:" : "Qty:"} {item.quantity} {item.unit}
                    </Text>
                    <TextInput
                      style={{
                        flex: 1, height: 44, borderWidth: 1.5, borderRadius: 10,
                        borderColor: boqPricing[item.id] ? colors.cta : colors.border,
                        paddingHorizontal: 12, fontSize: 14, fontFamily: "Inter_500Medium",
                        color: colors.foreground, backgroundColor: colors.background,
                        textAlign: isRTL ? "right" : "left",
                      }}
                      value={boqPricing[item.id] ?? ""}
                      onChangeText={(v) => !alreadySubmitted && setBoqPricing((prev) => ({ ...prev, [item.id]: v }))}
                      keyboardType="numeric"
                      placeholder={isRTL ? "سعر الوحدة (ر.س)" : "Unit price (SAR)"}
                      placeholderTextColor={colors.outline}
                      editable={!alreadySubmitted}
                    />
                  </View>
                  {boqPricing[item.id] && parseFloat(boqPricing[item.id]) > 0 && (
                    <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.success, textAlign: isRTL ? "right" : "left" }}>
                      {t.boq.totalPrice}: {new Intl.NumberFormat(isRTL ? "ar-SA" : "en-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(parseFloat(boqPricing[item.id]) * item.quantity)}
                    </Text>
                  )}
                  {idx < boqItems.length - 1 && <View style={{ height: 1, backgroundColor: colors.border, marginTop: 4 }} />}
                </View>
              ))}
            </View>
          )}

          {/* Info banner */}
          <View style={{ borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: isRTL ? "row-reverse" : "row", gap: 10, alignItems: "flex-start", backgroundColor: colors.accentBlueSoft, borderColor: colors.primary + "30" }}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: colors.primary }}>
              {t.rfq.offerPriceInfo}
            </Text>
          </View>

          <Button
            title={t.rfq.submitOffer}
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            disabled={alreadySubmitted}
          />
        </View>
      </ScrollView>

      {/* Duration unit picker modal */}
      <Modal visible={unitPickerVisible} transparent animationType="fade" onRequestClose={() => setUnitPickerVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" }} onPress={() => setUnitPickerVisible(false)}>
          <View style={{ backgroundColor: colors.card, borderRadius: 20, width: 220, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
            {DURATION_UNITS.map((unit, i) => (
              <TouchableOpacity
                key={unit.id}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderBottomWidth: i < DURATION_UNITS.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                  backgroundColor: executionDurationUnit === unit.id ? colors.primary + "10" : "transparent",
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onPress={() => { setExecutionDurationUnit(unit.id); setUnitPickerVisible(false); }}
              >
                <Text style={{ fontSize: 15, fontFamily: executionDurationUnit === unit.id ? "Inter_600SemiBold" : "Inter_400Regular", color: executionDurationUnit === unit.id ? colors.primary : colors.foreground }}>
                  {isRTL ? unit.labelAr : unit.labelEn}
                </Text>
                {executionDurationUnit === unit.id && <Feather name="check" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
