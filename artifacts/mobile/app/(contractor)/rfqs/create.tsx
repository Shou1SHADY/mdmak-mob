import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CATEGORIES, SAUDI_CITIES } from "@/constants/data";

export default function CreateRFQScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isDraft, setIsDraft] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (draft: boolean) => {
    if (!title.trim() || !category || !city) {
      Alert.alert("Missing Fields", "Please fill in title, category, and city.");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "rfqs"), {
        contractorOrgId: user?.organizationId,
        title: title.trim(),
        description: description.trim(),
        category,
        city,
        deadline: deadline || null,
        status: draft ? "draft" : "new",
        createdAt: serverTimestamp(),
        attachments: [],
      });
      Alert.alert("Success", draft ? "RFQ saved as draft." : "RFQ published successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Failed to create RFQ. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Dark header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10),
            backgroundColor: colors.primary,
          },
        ]}
      >
        <TouchableOpacity onPress={() => (step > 1 ? setStep(step - 1) : router.back())} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: "#F8FAFC" }]}>Create RFQ</Text>
        <Text style={[styles.stepLabel, { color: "rgba(248,250,252,0.6)" }]}>{step}/{totalSteps}</Text>
      </View>

      <View style={[styles.progressBar, { backgroundColor: "rgba(248,250,252,0.15)", marginTop: 0 }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.accent, width: `${(step / totalSteps) * 100}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <View style={styles.form}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>RFQ Details</Text>
            <Input
              label="Title *"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. 50 Tons of Steel Bars for Villa Project"
              leftIcon="file-text"
            />
            <Input
              label="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholder="Describe your requirements in detail..."
              style={{ height: 100, textAlignVertical: "top", paddingTop: 12 }}
            />

            <Text style={[styles.label, { color: colors.foreground }]}>Category *</Text>
            <View style={styles.grid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    {
                      borderColor: category === cat.label ? colors.accent : colors.border,
                      backgroundColor: category === cat.label ? colors.accent + "15" : colors.card,
                    },
                  ]}
                  onPress={() => setCategory(cat.label)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: category === cat.label ? colors.foreground : colors.secondary },
                    ]}
                    numberOfLines={2}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button title="Next" onPress={() => { if (!title.trim() || !category) { Alert.alert("Missing", "Fill in title and category."); return; } setStep(2); }} fullWidth />
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Location & Timeline</Text>

            <Text style={[styles.label, { color: colors.foreground }]}>City *</Text>
            <View style={styles.cityGrid}>
              {SAUDI_CITIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.cityChip,
                    {
                      borderColor: city === c ? colors.primary : colors.border,
                      backgroundColor: city === c ? colors.primary : "transparent",
                    },
                  ]}
                  onPress={() => setCity(c)}
                >
                  <Text style={[styles.cityText, { color: city === c ? "#fff" : colors.foreground }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Deadline (optional)"
              value={deadline}
              onChangeText={setDeadline}
              placeholder="e.g. 2026-07-15"
              leftIcon="calendar"
            />

            <View style={styles.btnRow}>
              <Button
                title="Save Draft"
                variant="outline"
                loading={loading && isDraft}
                style={{ flex: 1 }}
                onPress={() => { setIsDraft(true); handleSubmit(true); }}
              />
              <Button
                title="Publish"
                onPress={() => { setIsDraft(false); handleSubmit(false); }}
                loading={loading && !isDraft}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" as const },
  stepLabel: { fontSize: 14 },
  progressBar: { height: 3 },
  progressFill: { height: 3, borderRadius: 2 },
  content: { padding: 20 },
  form: { gap: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "700" as const, marginBottom: 4 },
  label: { fontSize: 14, fontWeight: "500" as const },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: { borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, width: "47%" },
  categoryText: { fontSize: 13, fontWeight: "500" as const, textAlign: "center" },
  cityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cityChip: { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 7 },
  cityText: { fontSize: 13, fontWeight: "500" as const },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 8 },
});
