import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { db } from "@/lib/firebase";
import { RFQItem } from "@/components/RFQCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { RFQ_STATUSES } from "@/constants/data";

export default function SupplierRFQDetailScreen() {
  const colors = useColors();
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

  const statusInfo = rfq ? (RFQ_STATUSES.find((s) => s.id === rfq.status) ?? { label: rfq.status, color: "#94a3b8" }) : null;

  if (loading || !rfq) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.mutedForeground }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10), backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>RFQ Detail</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.topRow}>
            <Text style={[styles.category, { color: colors.primary }]}>{rfq.category}</Text>
            {statusInfo && <StatusBadge label={statusInfo.label} color={statusInfo.color} />}
          </View>
          <Text style={[styles.rfqTitle, { color: colors.foreground }]}>{rfq.title}</Text>
          {rfq.description && (
            <Text style={[styles.desc, { color: colors.mutedForeground }]}>{rfq.description}</Text>
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
                  Deadline: {typeof rfq.deadline === "string" ? rfq.deadline : rfq.deadline?.toDate?.()?.toLocaleDateString("en-SA") ?? "—"}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.btnGroup}>
          <Button
            title="Submit Offer"
            onPress={() => router.push(`/(supplier)/submit-offer/${rfq.id}`)}
            fullWidth
          />
          <Button
            title="Message Contractor"
            onPress={() => {}}
            variant="outline"
            fullWidth
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" as const, color: "#F8FAFC", flex: 1, textAlign: "center", marginHorizontal: 8 },
  content: { padding: 16, gap: 16 },
  card: { borderRadius: 16, padding: 18, borderWidth: 1, gap: 10 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  category: { fontSize: 12, fontWeight: "600" as const, textTransform: "uppercase", letterSpacing: 0.5 },
  rfqTitle: { fontSize: 20, fontWeight: "700" as const, lineHeight: 26 },
  desc: { fontSize: 14, lineHeight: 22 },
  metaGrid: { gap: 8, marginTop: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontSize: 14 },
  btnGroup: { gap: 10 },
});
