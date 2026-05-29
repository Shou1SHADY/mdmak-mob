import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function SubmitOfferScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { rfqId } = useLocalSearchParams<{ rfqId: string }>();
  const { user } = useAuth();
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      Alert.alert("Invalid Price", "Please enter a valid price in SAR.");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "offers"), {
        rfqId,
        supplierOrgId: user?.organizationId,
        price: priceNum,
        notes: notes.trim(),
        status: "pending",
        attachments: [],
        createdAt: serverTimestamp(),
      });
      Alert.alert("Success", "Your offer has been submitted!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Failed to submit offer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10), backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Offer</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 60 }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Offer Details</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Your offer will be submitted to the contractor for review.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Price (SAR) *"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            leftIcon="dollar-sign"
            placeholder="e.g. 45000"
          />
          <Input
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            placeholder="Add any relevant details about your offer, delivery time, terms..."
            style={{ height: 100, textAlignVertical: "top", paddingTop: 12 }}
          />

          <View style={[styles.summaryCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[styles.summaryText, { color: colors.primary }]}>
              Your price will be compared with other suppliers. The contractor will review and may accept, reject, or request a price reduction.
            </Text>
          </View>

          <Button title="Submit Offer" onPress={handleSubmit} loading={loading} fullWidth />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" as const, color: "#F8FAFC" },
  content: { padding: 16, gap: 16 },
  card: { borderRadius: 16, padding: 18, borderWidth: 1, gap: 6 },
  sectionTitle: { fontSize: 18, fontWeight: "700" as const },
  subtitle: { fontSize: 14, lineHeight: 21 },
  form: { gap: 14 },
  summaryCard: { borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  summaryText: { flex: 1, fontSize: 13, lineHeight: 19 },
});
