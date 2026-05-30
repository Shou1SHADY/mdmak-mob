import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useT, useLanguage } from "@/context/LanguageContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SAUDI_CITIES } from "@/constants/data";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const t = useT();
  const { isRTL } = useLanguage();

  const [orgName, setOrgName] = useState("");
  const [city, setCity] = useState("Riyadh");
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.hero, { backgroundColor: colors.primary, paddingTop: topPad + 32 }]}>
        <View style={[styles.logoRing, { borderColor: colors.accent }]}>
          <Text style={styles.logoGlyph}>م</Text>
        </View>
        <Text style={styles.appName}>{isRTL ? t.common.appNameAr : t.common.appName}</Text>
        <Text style={styles.appNameAr}>{isRTL ? t.common.appName : t.common.appNameAr}</Text>
        <Text style={styles.tagline}>{t.common.tagline}</Text>
      </View>

      <ScrollView
        style={{ flex: 1, marginTop: -20 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.card,
            {
              borderRadius: colors.radius,
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>
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
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 8 }}
              >
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {SAUDI_CITIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.cityChip,
                        {
                          borderColor: city === c ? colors.accent : colors.border,
                          backgroundColor: city === c ? colors.accent : "transparent",
                          borderRadius: colors.radiusSm,
                        },
                      ]}
                      onPress={() => setCity(c)}
                    >
                      <Text
                        style={[
                          styles.cityText,
                          { color: city === c ? "#fff" : colors.secondary },
                        ]}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

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
                    borderRadius: colors.radiusSm,
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
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    paddingBottom: 48,
    paddingHorizontal: 24,
    gap: 6,
  },
  logoRing: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(32,203,213,0.15)",
    marginBottom: 4,
  },
  logoGlyph: { fontSize: 36, fontWeight: "700" as const, color: "#20CBD5" },
  appName: { fontSize: 24, fontWeight: "800" as const, color: "#F8FAFC" },
  appNameAr: { fontSize: 18, fontWeight: "700" as const, color: "#20CBD5", letterSpacing: 0 },
  tagline: { fontSize: 13, color: "rgba(248,250,252,0.6)", textAlign: "center" },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  card: {
    padding: 24,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    gap: 4,
  },
  cardTitle: { fontSize: 20, fontWeight: "700" as const },
  cardSub: { fontSize: 14, marginBottom: 12 },
  form: { gap: 14 },
  label: { fontSize: 13, fontWeight: "500" as const, marginBottom: 2 },
  cityChip: { borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 8 },
  cityText: { fontSize: 13, fontWeight: "500" as const },
  roleDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
  },
  roleText: { fontSize: 15, fontWeight: "600" as const },
});
