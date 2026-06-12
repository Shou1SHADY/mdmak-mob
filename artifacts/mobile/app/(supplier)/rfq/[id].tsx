import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { RFQItem } from "@/components/RFQCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { RFQ_STATUSES } from "@/constants/data";

export default function SupplierRFQDetailScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rfq, setRfq] = useState<RFQItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const rfqDoc = await getDoc(doc(db, "rfqs", id));
      if (rfqDoc.exists()) setRfq({ id: rfqDoc.id, ...rfqDoc.data() } as RFQItem);
      setLoading(false);
    };
    fetch();
  }, [id]);

  const statusData = rfq ? RFQ_STATUSES.find((s) => s.id === rfq.status) : null;
  const statusInfo = statusData
    ? { label: isRTL ? statusData.labelAr : statusData.label, color: statusData.color }
    : rfq ? { label: rfq.status, color: colors.outline } : null;

  if (loading || !rfq) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.mutedForeground }}>{t.common.loading}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.rfq.detail} showBack />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...colors.shadow.sm }]}>
          <View style={styles.topRow}>
            <Text style={[styles.category, { color: colors.primary }]}>{rfq.category}</Text>
            {statusInfo && <StatusBadge label={statusInfo.label} color={statusInfo.color} />}
          </View>
          <Text style={[styles.rfqTitle, { color: colors.foreground, lineHeight: isRTL ? 34 : 26 }]} numberOfLines={3} ellipsizeMode="tail">{rfq.title}</Text>
           {rfq.description && (
            <Text style={[styles.desc, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={4} ellipsizeMode="tail">{rfq.description}</Text>
           )}
          <View style={styles.metaGrid}>
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={14} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{rfq.city}</Text>
            </View>
            {rfq.deadline && (
              <View style={styles.metaRow}>
                <Feather name="calendar" size={14} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {t.rfq.deadline}: {typeof rfq.deadline === "string" ? rfq.deadline : rfq.deadline?.toDate?.()?.toLocaleDateString(isRTL ? "ar-SA" : "en-SA") ?? "—"}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.btnGroup}>
          <Button
            title={t.rfq.submitOffer}
            onPress={() => router.push(`/(supplier)/submit-offer/${rfq.id}`)}
            fullWidth
          />
          <Button
            title={t.rfq.messageContractor}
            onPress={() => router.push("/(supplier)/chats")}
            variant="outline"
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  card: { borderRadius: 16, padding: 18, borderWidth: 1, gap: 10 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  category: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "Inter_600SemiBold", flex: 1, marginRight: 8 },
  rfqTitle: { fontSize: 20, fontWeight: "700", lineHeight: 26, fontFamily: "HankenGrotesk_700Bold" },
  desc: { fontSize: 14, lineHeight: 22, fontFamily: "Inter_400Regular" },
  metaGrid: { gap: 8, marginTop: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  btnGroup: { gap: 10 },
});
