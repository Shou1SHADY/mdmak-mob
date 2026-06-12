import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Alert, TouchableOpacity, Platform, KeyboardAvoidingView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
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

export default function SubmitOfferScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { rfqId } = useLocalSearchParams<{ rfqId: string }>();
  const { user } = useAuth();
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    const checkDuplicate = async () => {
      if (!user?.organizationId || !rfqId) return;
      const q = query(
        collection(db, "offers"),
        where("rfqId", "==", rfqId),
        where("organizationId", "==", user.organizationId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) setAlreadySubmitted(true);
    };
    checkDuplicate();
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
      await addDoc(collection(db, "offers"), {
        rfqId,
        supplierId: user?.uid,
        organizationId: user?.organizationId,
        supplierName: user?.displayName,
        companyName: user?.orgName,
        submittedByUserId: user?.uid,
        submittedByUserName: user?.displayName,
        price,
        notes: notes.trim() || null,
        status: OFFER_STATUS.UNDER_REVIEW,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      Alert.alert(t.common.success, t.rfq.submitted, [
        { text: t.common.ok, onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(t.common.error, t.rfq.submitFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScreenHeader title={t.rfq.submitOffer} showBack />

      <ScrollView contentContainerStyle={[{ padding: 16, gap: 16, paddingBottom: insets.bottom + 60 }]} keyboardShouldPersistTaps="handled">
        <View style={[{ borderRadius: 16, padding: 18, borderWidth: 1, gap: 6, backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[{ fontSize: 18, fontWeight: "700" as const, color: colors.foreground }]}>{t.rfq.offerDetails}</Text>
          <Text style={[{ fontSize: 14, lineHeight: 21, color: colors.outline }]}>
            {t.rfq.offerSubmitInfo}
          </Text>
        </View>

        {alreadySubmitted && (
          <View style={[{ borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: colors.warning + "18", borderColor: colors.warning + "50" }]}>
            <Feather name="alert-circle" size={16} color={colors.warning} />
            <Text style={[{ flex: 1, fontSize: 13, lineHeight: 19, color: colors.warning }]}>
              {t.rfq.alreadySubmitted}
            </Text>
          </View>
        )}

        <View style={{ gap: 14, opacity: alreadySubmitted ? 0.5 : 1 }}>
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

          <View style={[{ borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: colors.accentBlueSoft, borderColor: colors.primary + "30" }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[{ flex: 1, fontSize: 13, lineHeight: 19, color: colors.primary }]}>
              {t.rfq.offerPriceInfo}
            </Text>
          </View>

          <Button title={t.rfq.submitOffer} onPress={handleSubmit} loading={loading} fullWidth disabled={alreadySubmitted} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
