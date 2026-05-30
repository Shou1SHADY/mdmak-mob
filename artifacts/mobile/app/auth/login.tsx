import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useT, useLanguage } from "@/context/LanguageContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, login, logout, signInWithGoogle } = useAuth();
  const t = useT();
  const { isRTL } = useLanguage();
  const pendingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = t.auth.validation.emailRequired;
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = t.auth.validation.emailInvalid;
    if (!password) e.password = t.auth.validation.passwordRequired;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  useEffect(() => {
    if (user && pendingRef.current) {
      pendingRef.current = false;
      const dashboard =
        user.role === "Supplier" ? "/(supplier)/dashboard" : "/(contractor)/dashboard";
      router.replace(dashboard);
    }
  }, [user]);

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const appUser = await login(email.trim(), password);
      if (appUser.role === "Admin") {
        await logout();
        Alert.alert(t.common.error, t.auth.errors.adminNotSupported);
        return;
      }
      pendingRef.current = true;
    } catch (err: any) {
      const msg =
        err.code === "auth/invalid-credential" || err.code === "auth/wrong-password"
          ? t.auth.errors.invalidCredentials
          : err.code === "auth/user-not-found"
          ? t.auth.errors.userNotFound
          : err.code === "auth/too-many-requests"
          ? t.auth.errors.tooManyRequests
          : err.code === "auth/user-disabled"
          ? t.auth.errors.userDisabled
          : err.code === "auth/network-request-failed"
          ? t.auth.errors.networkError
          : err.message || t.auth.errors.genericLogin;
      Alert.alert(t.auth.login.title, msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const appUser = await signInWithGoogle();
      if (appUser.role === "Admin") {
        await logout();
        Alert.alert(t.common.error, t.auth.errors.adminNotSupported);
        return;
      }
      pendingRef.current = true;
    } catch (err: any) {
      if (err.code === "auth/popup-closed-by-user") return;
      console.log("[Login] Google error:", err.code, err.message);
      const msg =
        err.code === "auth/popup-blocked"
          ? "Pop-up blocked. Please allow pop-ups for this site."
          : err.message || t.auth.errors.genericLogin;
      Alert.alert(t.auth.login.title, msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

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
        <View style={[styles.card, { borderRadius: colors.radius, backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.auth.login.title}</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{t.auth.login.subtitle}</Text>
          <View style={styles.form}>
            <Input
              label={t.auth.login.email}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
              error={errors.email}
              placeholder={t.auth.login.emailPlaceholder}
              isRTL={isRTL}
            />
            <Input
              label={t.auth.login.password}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              leftIcon="lock"
              rightIcon={showPass ? "eye-off" : "eye"}
              onRightIconPress={() => setShowPass(!showPass)}
              error={errors.password}
              placeholder={t.auth.login.passwordPlaceholder}
              isRTL={isRTL}
            />
            <Button title={t.auth.login.signIn} onPress={handleLogin} loading={loading} fullWidth size="lg" />

            <View style={[styles.separator, { borderBottomColor: colors.border }]}>
              <Text style={[styles.separatorText, { color: colors.mutedForeground, backgroundColor: colors.card }]}>
                {t.common.or}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.googleBtn, { borderColor: colors.border, borderRadius: colors.radiusSm }]}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              activeOpacity={0.7}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color={colors.secondary} />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={[styles.googleText, { color: colors.foreground }]}>
                    Continue with Google
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.link} onPress={() => router.push("/auth/register")}>
          <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
            {t.auth.login.noAccount}{" "}
            <Text style={{ color: colors.cta, fontWeight: "700" }}>{t.auth.login.signUp}</Text>
          </Text>
        </TouchableOpacity>
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
  separator: {
    borderBottomWidth: 1,
    alignItems: "center",
    marginVertical: 4,
  },
  separatorText: {
    fontSize: 13,
    paddingHorizontal: 12,
    position: "relative",
    top: 8,
  },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    paddingVertical: 14,
    minHeight: 48,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: "700" as const,
  },
  googleText: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  link: { alignItems: "center", paddingVertical: 20 },
  linkText: { fontSize: 14 },
});
