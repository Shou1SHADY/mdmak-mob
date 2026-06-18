import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useT, useLanguage } from "@/context/LanguageContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SAUDI_CITIES, displayCity, CITIES_EN } from "@/constants/data";
import { doc, collection, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

function generateId(): string {
  return doc(collection(db, "_ids")).id;
}

function CityPickerModal({
  visible,
  selected,
  onSelect,
  onClose,
  isRTL,
  colors,
}: {
  visible: boolean;
  selected: string;
  onSelect: (city: string) => void;
  onClose: () => void;
  isRTL: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SAUDI_CITIES;
    return SAUDI_CITIES.filter((c) => {
      const ar = c.toLowerCase();
      const en = (CITIES_EN[c] ?? "").toLowerCase();
      return ar.includes(q) || en.includes(q);
    });
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* Full-screen wrapper — overlay behind, sheet in front */}
      <View style={styles.modalRoot}>
        {/* Dim overlay */}
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => { onClose(); setQuery(""); }} />

        {/* Bottom sheet */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[styles.sheetInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>
                {isRTL ? "اختر المدينة" : "Select City"}
              </Text>
              <TouchableOpacity
                onPress={() => { onClose(); setQuery(""); }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={[styles.closeBtn, { backgroundColor: colors.muted }]}
              >
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={[styles.searchRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder={isRTL ? "ابحث عن مدينة..." : "Search cities..."}
                placeholderTextColor={colors.mutedForeground}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
                textAlign={isRTL ? "right" : "left"}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x-circle" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            {/* Result count hint when searching */}
            {query.length > 0 && (
              <Text style={[styles.resultCount, { color: colors.mutedForeground }]}>
                {filtered.length} {isRTL ? "نتيجة" : filtered.length === 1 ? "result" : "results"}
              </Text>
            )}

            {/* List */}
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={styles.cityList}
              contentContainerStyle={styles.cityListContent}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => (
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyState}>
                  <Feather name="map-pin" size={28} color={colors.mutedForeground} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    {isRTL ? "لا توجد نتائج" : "No cities found"}
                  </Text>
                  <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
                    {isRTL ? `"${query}" غير موجودة في القائمة` : `Try searching in Arabic or English`}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => {
                const isSelected = item === selected;
                return (
                  <TouchableOpacity
                    style={[styles.cityRow, isSelected && { backgroundColor: colors.accent + "18" }]}
                    onPress={() => { onSelect(item); onClose(); setQuery(""); }}
                    activeOpacity={0.65}
                  >
                    <View style={styles.cityRowLeft}>
                      <View style={[styles.cityDot, { backgroundColor: isSelected ? colors.accent : colors.border }]} />
                      <View style={styles.cityRowContent}>
                        <Text style={[styles.cityRowAr, { color: isSelected ? colors.accent : colors.foreground }]}>
                          {item}
                        </Text>
                        {CITIES_EN[item] && (
                          <Text style={[styles.cityRowEn, { color: colors.mutedForeground }]}>
                            {CITIES_EN[item]}
                          </Text>
                        )}
                      </View>
                    </View>
                    {isSelected ? (
                      <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
                        <Feather name="check" size={12} color="#fff" />
                      </View>
                    ) : (
                      <View style={[styles.checkBadge, { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border }]} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const t = useT();
  const { isRTL } = useLanguage();

  const [orgName, setOrgName] = useState("");
  const [city, setCity] = useState("الرياض");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleCompleteSetup = async () => {
    if (!orgName.trim()) {
      Alert.alert(t.common.error, t.auth.validation.orgNameRequired);
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      const organizationId = generateId();
      await setDoc(
        doc(db, "users", user.uid),
        {
          organizationId,
          companyName: orgName.trim(),
          organizationRole: "owner",
          city,
          profileCompleted: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await refreshUser();
      const dashboard =
        user.role === "Supplier" ? "/(supplier)/dashboard" : "/(contractor)/dashboard";
      router.replace(dashboard);
    } catch (err: any) {
      Alert.alert(t.common.error, err.message || t.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = user?.role ?? "";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topPad + 32 }]}
      >
        <View style={[styles.logoBox, colors.shadow.logo]}>
          <Image
            source={require("@/assets/images/figma/logo2.png")}
            style={styles.logoImage}
            contentFit="contain"
          />
        </View>
        <Text style={[styles.appName, { fontFamily: "HankenGrotesk_700Bold" }]}>
          {isRTL ? t.common.appNameAr : t.common.appName}
        </Text>
        <Text style={styles.tagline}>{t.common.tagline}</Text>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1, marginTop: -20 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              ...colors.shadow.lg,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>
            {t.onboarding.title}
          </Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
            {t.onboarding.subtitle}
          </Text>

          <View style={styles.form}>
            <Input
              label={t.onboarding.orgName}
              value={orgName}
              onChangeText={setOrgName}
              leftIcon="briefcase"
              placeholder={t.onboarding.orgNamePlaceholder}
              isRTL={isRTL}
            />

            <View>
              <Text style={[styles.label, { color: colors.secondary }]}>
                {t.onboarding.city}
              </Text>
              <TouchableOpacity
                style={[
                  styles.citySelector,
                  { borderColor: colors.border, backgroundColor: colors.muted },
                ]}
                onPress={() => setShowCityPicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.citySelectorLeft}>
                  <Feather name="map-pin" size={17} color={colors.accent} />
                  <View>
                    <Text style={[styles.citySelectorAr, { color: colors.foreground }]}>
                      {city}
                    </Text>
                    {CITIES_EN[city] && (
                      <Text style={[styles.citySelectorEn, { color: colors.mutedForeground }]}>
                        {CITIES_EN[city]}
                      </Text>
                    )}
                  </View>
                </View>
                <Feather name="chevron-down" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <CityPickerModal
              visible={showCityPicker}
              selected={city}
              onSelect={setCity}
              onClose={() => setShowCityPicker(false)}
              isRTL={isRTL}
              colors={colors}
            />

            <View>
              <Text style={[styles.label, { color: colors.secondary }]}>
                {t.onboarding.role}
              </Text>
              <View
                style={[
                  styles.roleDisplay,
                  {
                    backgroundColor: colors.muted,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Feather name="user" size={17} color={colors.mutedForeground} />
                <Text style={[styles.roleText, { color: colors.foreground }]}>
                  {roleLabel}
                </Text>
              </View>
            </View>

            <Button
              title={t.onboarding.completeSetup}
              onPress={handleCompleteSetup}
              loading={loading}
              fullWidth
              size="lg"
              style={colors.shadow.primary as any}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    paddingBottom: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  appName: { fontSize: 24, color: "#FFFFFF" },
  tagline: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(248,250,252,0.6)", textAlign: "center" },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  card: {
    padding: 24,
    borderWidth: 1,
    gap: 4,
    borderRadius: 24,
  },
  cardTitle: { fontSize: 20 },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 12 },
  form: { gap: 14 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 6 },

  /* City selector field */
  citySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  citySelectorLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  citySelectorAr: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  citySelectorEn: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },

  /* Modal root — full screen, dim bg, sheet at bottom */
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetInner: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 2,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  sheetTitle: { fontSize: 18 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Search bar */
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    paddingVertical: 0,
  },
  resultCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 2,
  },

  /* City list */
  cityList: { maxHeight: 380 },
  cityListContent: { paddingBottom: 24 },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 20 },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  cityRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  cityDot: { width: 8, height: 8, borderRadius: 4 },
  cityRowContent: { gap: 2 },
  cityRowAr: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  cityRowEn: { fontFamily: "Inter_400Regular", fontSize: 12 },
  checkBadge: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", gap: 8, paddingVertical: 48 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15 },
  emptyHint: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center", paddingHorizontal: 32 },

  roleDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderRadius: 6,
  },
  roleText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
