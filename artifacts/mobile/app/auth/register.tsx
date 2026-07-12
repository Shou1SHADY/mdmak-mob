import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useT, useLanguage } from "@/context/LanguageContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { UserRole } from "@/context/AuthContext";
import { SAUDI_CITIES, displayCity } from "@/constants/data";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, register, logout } = useAuth();
  const t = useT();
  const { isRTL } = useLanguage();
  const pendingRef = useRef(false);

  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole>("Contractor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [city, setCity] = useState("Riyadh");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleNext = () => {
    if (!email.trim() || !password || !confirmPass || !displayName.trim()) {
      Alert.alert(t.common.error, t.auth.validation.fieldsRequired);
      return;
    }
    if (password !== confirmPass) {
      Alert.alert(t.common.error, t.auth.validation.passwordMismatch);
      return;
    }
    if (password.length < 6) {
      Alert.alert(t.common.error, t.auth.validation.passwordWeak);
      return;
    }
    setStep(2);
  };

  const handleRegister = async () => {
    if (!orgName.trim()) {
      Alert.alert(t.common.error, t.auth.validation.orgNameRequired);
      return;
    }
    setLoading(true);
    try {
      const appUser = await register(email.trim(), password, displayName.trim(), role, orgName.trim(), city);
      if (appUser.role === "Admin") {
        await logout();
        Alert.alert(t.common.error, t.auth.errors.adminNotSupported);
        return;
      }
      pendingRef.current = true;
    } catch (err: any) {
      const msg =
        err.code === "auth/email-already-in-use"
          ? t.auth.errors.emailInUse
          : err.code === "auth/weak-password"
          ? t.auth.validation.passwordWeak
          : err.code === "auth/network-request-failed"
          ? t.auth.errors.networkError
          : err.message || t.auth.errors.genericRegister;
      Alert.alert(t.common.error, msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && pendingRef.current) {
      pendingRef.current = false;
      const dashboard =
        user.role === "Supplier" ? "/(supplier)/dashboard" : "/(contractor)/dashboard";
      router.replace(dashboard);
    }
  }, [user]);

  const roles: { id: UserRole; label: string; labelAr: string; desc: string }[] = [
    { id: "Contractor", label: t.auth.register.contractor, labelAr: "مقاول", desc: t.auth.register.contractorDesc },
    { id: "Supplier", label: t.auth.register.supplier, labelAr: "مورد", desc: t.auth.register.supplierDesc },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Dark header */}
      <View style={[styles.hero, { backgroundColor: colors.primary, paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => (step > 1 ? setStep(1) : router.back())} style={styles.backBtn}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.heroCenter}>
          <Text style={styles.heroTitle}>{t.auth.register.title}</Text>
          <View style={styles.stepTrack}>
            {[1, 2].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  { backgroundColor: step >= s ? "#FFFFFF" : "rgba(255,255,255,0.3)" },
                ]}
              />
            ))}
          </View>
        </View>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1, marginTop: -16 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { borderRadius: colors.radius3xl, backgroundColor: colors.card, borderColor: colors.border, ...colors.shadow.lg }]}>        
          {step === 1 && (
            <View style={styles.form}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.auth.register.step1}</Text>
              <Input label={t.auth.register.fullName} value={displayName} onChangeText={setDisplayName} leftIcon="user" placeholder={t.auth.register.namePlaceholder} isRTL={isRTL} />
              <Input label={t.auth.register.email} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" leftIcon="mail" placeholder={t.auth.login.emailPlaceholder} isRTL={isRTL} />
              <Input label={t.auth.register.password} value={password} onChangeText={setPassword} secureTextEntry={!showPass} leftIcon="lock" rightIcon={showPass ? "eye-off" : "eye"} onRightIconPress={() => setShowPass(!showPass)} placeholder={t.auth.validation.passwordWeak} isRTL={isRTL} />
              <Input label={t.auth.register.confirmPassword} value={confirmPass} onChangeText={setConfirmPass} secureTextEntry={!showPass} leftIcon="lock" isRTL={isRTL} />
              <Button title={t.auth.register.continue} onPress={handleNext} fullWidth size="lg" />
            </View>
          )}

          {step === 2 && (
            <View style={styles.form}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.auth.register.yourRole}</Text>

              <View style={styles.roleRow}>
                {roles.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.roleCard,
                      {
                        borderColor: role === r.id ? colors.accent : colors.border,
                        backgroundColor: role === r.id ? colors.accent + "12" : colors.muted,
                      },
                    ]}
                    onPress={() => setRole(r.id)}
                  >
                    <View style={[styles.roleIndicator, { backgroundColor: role === r.id ? colors.accent : colors.border }]} />
                    <Text style={[styles.roleLabel, { color: role === r.id ? colors.foreground : colors.secondary }]}>{r.label}</Text>
                    <Text style={[styles.roleAr, { color: role === r.id ? colors.accent : colors.mutedForeground }]}>{r.labelAr}</Text>
                    <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>{r.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input label={t.auth.register.orgName} value={orgName} onChangeText={setOrgName} leftIcon="briefcase" placeholder={t.auth.register.orgNamePlaceholder} isRTL={isRTL} />

              <View>
                <Text style={[styles.label, { color: colors.secondary }]}>{t.auth.register.city}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {SAUDI_CITIES.slice(0, 10).map((c) => (
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
                        <Text style={[styles.cityText, { color: city === c ? "#fff" : colors.secondary }]}>{displayCity(c, isRTL)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <Button title={t.auth.register.createAccount} onPress={handleRegister} loading={loading} fullWidth size="lg" />
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.link} onPress={() => router.push("/auth/login")}>
          <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
            {t.auth.register.haveAccount}{" "}
            <Text style={{ color: colors.cta, fontWeight: "700" }}>{t.auth.register.signIn}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 0,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  heroCenter: { flex: 1, alignItems: "center", gap: 10 },
  heroTitle: { fontSize: 20, fontWeight: "700" as const, color: "#FFFFFF" },
  stepTrack: { flexDirection: "row", gap: 8 },
  stepDot: { width: 36, height: 4, borderRadius: 2 },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  card: {
    padding: 24,
    borderWidth: 1,
  },
  form: { gap: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "700" as const, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: "500" as const },
  roleRow: { flexDirection: "row", gap: 12 },
  roleCard: { flex: 1, borderRadius: 10, borderWidth: 2, padding: 14, gap: 4, overflow: "hidden" },
  roleIndicator: { width: 14, height: 14, borderRadius: 7, marginBottom: 4 },
  roleLabel: { fontSize: 15, fontWeight: "700" as const },
  roleAr: { fontSize: 14, fontWeight: "600" as const },
  roleDesc: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  cityChip: { borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 11, minHeight: 44, justifyContent: "center" },
  cityText: { fontSize: 13, fontWeight: "500" as const },
  link: { alignItems: "center", paddingVertical: 20 },
  linkText: { fontSize: 14 },
});
