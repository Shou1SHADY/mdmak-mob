import React, { useState } from "react";
import {
  View, Text, ScrollView, Alert, TouchableOpacity, Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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

  const handleSubmit = async () => {
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
        status: "قيد المراجعة",
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10), backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: "700" as const, color: colors.foreground }}>{t.rfq.submitOffer}</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={[{ padding: 16, gap: 16, paddingBottom: insets.bottom + 60 }]} keyboardShouldPersistTaps="handled">
        <View style={[{ borderRadius: 16, padding: 18, borderWidth: 1, gap: 6, backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[{ fontSize: 18, fontWeight: "700" as const, color: colors.foreground }]}>{t.rfq.offerDetails}</Text>
          <Text style={[{ fontSize: 14, lineHeight: 21, color: colors.outline }]}>
            {t.rfq.offerSubmitInfo}
          </Text>
        </View>

        <View style={{ gap: 14 }}>
          <Input
            label={t.rfq.price}
            required
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            leftIcon="dollar-sign"
            placeholder={t.rfq.pricePlaceholder}
            isRTL={isRTL}
          />
          <Input
            label={t.rfq.notes}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            placeholder={t.rfq.notesPlaceholder}
            isRTL={isRTL}
            style={{ height: 100, textAlignVertical: "top", paddingTop: 12 }}
          />

          <View style={[{ borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: colors.accentBlueSoft, borderColor: colors.primary + "30" }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[{ flex: 1, fontSize: 13, lineHeight: 19, color: colors.primary }]}>
              {t.rfq.offerPriceInfo}
            </Text>
          </View>

          <Button title={t.rfq.submitOffer} onPress={handleSubmit} loading={loading} fullWidth />
        </View>
      </ScrollView>
    </View>
  );
}
