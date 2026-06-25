import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, Platform,
  KeyboardAvoidingView, Dimensions,
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
import { CATEGORIES, SAUDI_CITIES, CITIES_DISTRICTS, displayCity } from "@/constants/data";
import { ProfileIncompleteGate, useProfileGate } from "@/components/ProfileIncompleteGate";
import { BOQEditor, type BOQItem } from "@/components/BOQEditor";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W > 400 ? 140 : 120;
const CARD_H = 100;

// Map category icons to Feather icons
const ICON_MAP: Record<string, keyof typeof Feather.glyphMap> = {
  iron_metals: "layers",
  cement_concrete: "box",
  bricks_blocks: "grid",
  flooring_finishes: "square",
  doors_windows: "sidebar",
  electrical_lighting: "zap",
  sanitary_plumbing: "droplet",
  insulation_roofing: "home",
  paints_colors: "pen-tool",
  gypsum_ceilings: "minimize-2",
  ready_mix: "truck",
  equipment_machinery: "settings",
  adhesives_chemicals: "box",
  blacksmithing: "tool",
  hvac: "wind",
  wood: "feather",
};

export default function CreateRFQScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, organization } = useAuth();
  const t = useT();
  const { isRTL } = useLanguage();
  const { isComplete, missingFields } = useProfileGate("contractor", organization ?? null);

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [deadline, setDeadline] = useState("");
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
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
        district: district.trim() || null,
        deadline: deadline || null,
        boqItems: boqItems.length > 0 ? boqItems : null,
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

  const totalSteps = 3;

  const selectedCat = CATEGORIES.find((c) => c.label === category || c.labelAr === category);
  const isSmall = SCREEN_W < 375;

  if (!isComplete) {
    return (
      <ProfileIncompleteGate
        role="contractor"
        organization={organization ?? null}
        missingFields={missingFields}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 48 : 10),
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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

            {/* ── Category Selection ── */}
            <View style={styles.catSection}>
              <View style={[styles.catHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>{t.rfq.category}</Text>
                <Text style={[styles.required, { color: colors.destructive }]}>*</Text>
              </View>
              {selectedCat && (
                <View style={[styles.selectedChip, { backgroundColor: colors.primary + "12", borderColor: colors.primary }]}
                  >
                  <Feather name={ICON_MAP[selectedCat.id] || "tag"} size={14} color={colors.primary} />
                  <Text style={[styles.selectedChipText, { color: colors.primary }]}>
                    {isRTL ? selectedCat.labelAr : selectedCat.label}
                  </Text>
                  <TouchableOpacity onPress={() => setCategory("")} style={{ padding: 2 }}>
                    <Feather name="x" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Horizontal scrollable category cards */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catScroll}
              directionalLockEnabled
            >
              {CATEGORIES.map((cat) => {
                const isActive = category === cat.labelAr;
                const icon = ICON_MAP[cat.id] || "tag";
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catCard,
                      {
                        width: isSmall ? 110 : CARD_W,
                        height: isSmall ? 88 : CARD_H,
                        backgroundColor: isActive ? colors.primary + "10" : colors.card,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setCategory(isActive ? "" : cat.labelAr)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.catIconBox, {
                      backgroundColor: isActive ? colors.primary + "18" : colors.muted + "60",
                    }]}>
                      <Feather name={icon} size={20} color={isActive ? colors.primary : colors.outline} />
                    </View>
                    <Text
                      style={[
                        styles.catCardText,
                        { color: isActive ? colors.primary : colors.foreground },
                        isActive && { fontFamily: "Inter_600SemiBold" },
                      ]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {isRTL ? cat.labelAr : cat.label}
                    </Text>
                    {isActive && (
                      <View style={[styles.checkMark, { backgroundColor: colors.primary }]}>
                        <Feather name="check" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Button
              title={t.common.next}
              onPress={() => {
                if (!title.trim() || !category) {
                  Alert.alert(t.rfq.missingTitle, t.rfq.fillTitleCategory);
                  return;
                }
                setStep(2);
              }}
              fullWidth
              size="lg"
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.form}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.rfq.locationTimeline}</Text>

            {/* ── City Selection ── */}
            <View style={styles.catSection}>
              <View style={[styles.catHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Text style={[styles.label, { color: colors.foreground }]}>{t.rfq.city}</Text>
                <Text style={[styles.required, { color: colors.destructive }]}>*</Text>
              </View>
              {city && (
                <View style={[styles.selectedChip, { backgroundColor: colors.cta + "12", borderColor: colors.cta }]}>
                  <Feather name="map-pin" size={14} color={colors.cta} />
                  <Text style={[styles.selectedChipText, { color: colors.cta }]}>{displayCity(city, isRTL)}</Text>
                  <TouchableOpacity onPress={() => setCity("")} style={{ padding: 2 }}>
                    <Feather name="x" size={14} color={colors.cta} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cityScroll}
              directionalLockEnabled
            >
              {SAUDI_CITIES.map((c) => {
                const isActive = city === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.cityCard,
                      {
                        backgroundColor: isActive ? colors.cta + "10" : colors.card,
                        borderColor: isActive ? colors.cta : colors.border,
                      },
                    ]}
                    onPress={() => {
                      const next = isActive ? "" : c;
                      setCity(next);
                      setDistrict(""); // reset district on city change
                    }}
                    activeOpacity={0.75}
                  >
                    <Feather name="map-pin" size={14} color={isActive ? colors.cta : colors.outline} />
                    <Text
                      style={[
                        styles.cityCardText,
                        { color: isActive ? colors.cta : colors.foreground },
                        isActive && { fontFamily: "Inter_600SemiBold" },
                      ]}
                      numberOfLines={1}
                    >
                      {displayCity(c, isRTL)}
                    </Text>
                    {isActive && (
                      <View style={[styles.checkMark, { backgroundColor: colors.cta }]}>
                        <Feather name="check" size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* ── District Selection (city-dependent) ── */}
            {city && CITIES_DISTRICTS[city] && (
              <View style={styles.catSection}>
                <View style={[styles.catHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text style={[styles.label, { color: colors.foreground }]}>{t.rfq.district}</Text>
                  <Text style={[{ fontSize: 12, color: colors.outline, fontFamily: "Inter_400Regular" }]}>
                    {" "}({isRTL ? "اختياري" : "optional"})
                  </Text>
                </View>
                {district && (
                  <View style={[styles.selectedChip, { backgroundColor: colors.purpleAccent + "15", borderColor: colors.purpleAccent }]}>
                    <Feather name="navigation" size={14} color={colors.purpleAccent} />
                    <Text style={[styles.selectedChipText, { color: colors.purpleAccent }]}>{district}</Text>
                    <TouchableOpacity onPress={() => setDistrict("")} style={{ padding: 2 }}>
                      <Feather name="x" size={14} color={colors.purpleAccent} />
                    </TouchableOpacity>
                  </View>
                )}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cityScroll}
                  directionalLockEnabled
                >
                  {(CITIES_DISTRICTS[city] ?? []).map((dist) => {
                    const isDistActive = district === dist;
                    return (
                      <TouchableOpacity
                        key={dist}
                        style={[
                          styles.cityCard,
                          {
                            backgroundColor: isDistActive ? (colors.purpleAccent + "14") : colors.card,
                            borderColor: isDistActive ? colors.purpleAccent : colors.border,
                          },
                        ]}
                        onPress={() => setDistrict(isDistActive ? "" : dist)}
                        activeOpacity={0.75}
                      >
                        <Feather name="navigation" size={13} color={isDistActive ? colors.purpleAccent : colors.outline} />
                        <Text
                          style={[
                            styles.cityCardText,
                            { color: isDistActive ? colors.purpleAccent : colors.foreground },
                            isDistActive && { fontFamily: "Inter_600SemiBold" },
                          ]}
                          numberOfLines={1}
                        >
                          {dist}
                        </Text>
                        {isDistActive && (
                          <View style={[styles.checkMark, { backgroundColor: colors.purpleAccent }]}>
                            <Feather name="check" size={10} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <Input
              label={t.rfq.deadlineOptional}
              value={deadline}
              onChangeText={setDeadline}
              placeholder={t.rfq.deadlinePlaceholder}
              leftIcon="calendar"
              isRTL={isRTL}
            />

            <Button
              title={t.common.next}
              onPress={() => setStep(3)}
              fullWidth
              size="lg"
            />
          </View>
        )}

        {step === 3 && (
          <View style={styles.form}>
            <View style={{ gap: 4 }}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.boq.title}</Text>
              <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.outline }}>
                {isRTL ? "اختياري — أضف بنوداً لتحديد المواد والكميات التي يحتاجها الموردون" : "Optional — add items so suppliers know exactly what to price"}
              </Text>
            </View>

            <BOQEditor items={boqItems} onChange={setBoqItems} />

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    fontFamily: "HankenGrotesk_700Bold",
  },
  stepLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  progressBar: {
    height: 3,
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  content: {
    padding: 20,
  },
  form: {
    gap: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    fontFamily: "HankenGrotesk_700Bold",
    marginBottom: 4,
  },

  // Category section
  catSection: {
    gap: 10,
  },
  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  required: {
    fontSize: 14,
    fontWeight: "700" as const,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  selectedChipText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  // Category cards
  catScroll: {
    gap: 10,
    paddingRight: 20,
  },
  catCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  catIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  catCardText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 16,
  },
  checkMark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  // City cards
  cityScroll: {
    gap: 8,
    paddingRight: 20,
  },
  cityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 44,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  cityCardText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
});
