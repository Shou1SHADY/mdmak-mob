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
import { useT, useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CATEGORIES, SAUDI_CITIES } from "@/constants/data";

export default function CreateRFQScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const t = useT();
  const { isRTL } = useLanguage();

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
      Alert.alert(t.rfq.missingTitle, t.rfq.missingFields);
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "rfqs"), {
        contractorId: user?.uid,
        organizationId: user?.organizationId,
        createdByUserId: user?.uid,
        createdByUserName: user?.displayName,
        title: title.trim(),
        description: description.trim(),
        category,
        city,
        deadline: deadline || null,
        status: draft ? "Draft" : "New",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      Alert.alert(t.common.success, draft ? t.rfq.savedDraft : t.rfq.published, [
        { text: t.common.ok, onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert(t.common.error, t.rfq.createFailed);
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10),
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => (step > 1 ? setStep(step - 1) : router.back())} style={styles.backBtn}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{t.dashboard.createRfq}</Text>
        <Text style={[styles.stepLabel, { color: colors.outline }]}>{step}/{totalSteps}</Text>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.border, marginTop: 0 }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${(step / totalSteps) * 100}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <View style={styles.form}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.rfq.rfqDetails}</Text>
            <Input
              label={t.rfq.title}
              required
              value={title}
              onChangeText={setTitle}
              placeholder={t.rfq.titlePlaceholder}
              leftIcon="file-text"
              isRTL={isRTL}
            />
            <Input
              label={t.rfq.description}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholder={t.rfq.descriptionPlaceholder}
              style={{ height: 100, textAlignVertical: "top", paddingTop: 12 }}
              isRTL={isRTL}
            />

            <Text style={[styles.label, { color: colors.foreground }]}>{t.rfq.category} *</Text>
            <View style={styles.grid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    {
                      borderColor: category === cat.label ? colors.primary : colors.border,
                      backgroundColor: category === cat.label ? colors.accentBlueSoft : colors.card,
                    },
                  ]}
                  onPress={() => setCategory(cat.label)}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      { color: category === cat.label ? colors.primary : colors.onSurfaceVariant },
                    ]}
                    numberOfLines={2}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button title={t.common.next} onPress={() => { if (!title.trim() || !category) { Alert.alert(t.rfq.missingTitle, t.rfq.fillTitleCategory); return; } setStep(2); }} fullWidth />
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.rfq.locationTimeline}</Text>

            <Text style={[styles.label, { color: colors.foreground }]}>{t.rfq.city} *</Text>
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
              label={t.rfq.deadlineOptional}
              value={deadline}
              onChangeText={setDeadline}
              placeholder={t.rfq.deadlinePlaceholder}
              leftIcon="calendar"
              isRTL={isRTL}
            />

            <View style={styles.btnRow}>
              <Button
                title={t.rfq.saveDraft}
                variant="outline"
                loading={loading && isDraft}
                style={{ flex: 1 }}
                onPress={() => { setIsDraft(true); handleSubmit(true); }}
              />
              <Button
                title={t.rfq.publish}
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
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  headerTitle: { fontSize: 18, fontWeight: "700" as const },
  stepLabel: { fontSize: 14 },
  progressBar: { height: 3 },
  progressFill: { height: 3, borderRadius: 2 },
  content: { padding: 20 },
  form: { gap: 16 },
  sectionTitle: { fontSize: 20, fontWeight: "700" as const, marginBottom: 4 },
  label: { fontSize: 14, fontWeight: "500" as const, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 8, width: "47%" },
  categoryText: { fontSize: 13, fontWeight: "500" as const, textAlign: "center" },
  cityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cityChip: { borderRadius: 24, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 7 },
  cityText: { fontSize: 13, fontWeight: "500" as const },
  btnRow: { flexDirection: "row", gap: 12, marginTop: 8 },
});
