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
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
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
      if (err.message?.includes("cancelled") || err.message?.includes("cancel")) return;
      const msg =
        err.code === "auth/popup-blocked"
          ? t.auth.login.popupBlocked
          : err.message?.includes("not configured")
          ? t.auth.login.comingSoon
          : err.message || t.auth.errors.genericLogin;
      Alert.alert(t.auth.login.title, msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroGradient, { paddingTop: topPad + 32 }]}
      >
        <View style={[styles.heroBg, { opacity: 0.08 }]}>
          <Image
            source={require("@/assets/images/login.png")}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        </View>
        <View style={styles.heroContent}>
          <View style={[styles.logoBox, colors.shadow.logo]}>
            <Image
              source={require("@/assets/images/figma/mdmak-logo.png")}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>
          <Text style={styles.appName}>
            {isRTL ? t.common.appNameAr : t.common.appName}
          </Text>
          <Text style={styles.tagline}>{t.common.tagline}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1, marginTop: -20 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, ...colors.shadow.lg }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>
            {t.auth.login.title}
          </Text>
          <Text style={[styles.cardSub, { color: colors.outline }]}>{t.auth.login.subtitle}</Text>
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
            <Button
              title={t.auth.login.signIn}
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              style={colors.shadow.primary as any}
            />

            <View style={[styles.separator, { borderBottomColor: colors.border }]}>
              <Text style={[styles.separatorText, { color: colors.outline, backgroundColor: colors.card }]}>
                {t.auth.login.continueWith}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.socialBtn, { borderColor: colors.border }]}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              activeOpacity={0.7}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color={colors.foreground} />
              ) : (
                <>
                  <View style={styles.googleIconContainer}>
                    <Text style={styles.googleG}>G</Text>
                  </View>
                  <Text style={[styles.socialText, { color: colors.foreground }]}>
                    {t.auth.login.continueWithGoogle}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialBtn, { borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => Alert.alert(t.auth.login.comingSoon, t.auth.login.comingSoonApple)}
            >
              <View style={styles.appleIconContainer}>
                <Text style={styles.appleIcon}></Text>
              </View>
              <Text style={[styles.socialText, { color: colors.foreground }]}>
                {t.auth.login.continueWithApple}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={[styles.link, { paddingBottom: insets.bottom + 40 }]} onPress={() => router.push("/auth/register")}>
          <Text style={[styles.linkText, { color: colors.outline }]}>
            {t.auth.login.noAccount}{" "}
            <Text style={{ color: colors.primary, fontWeight: "700" }}>{t.auth.login.signUp}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroGradient: {
    paddingBottom: 48,
    paddingHorizontal: 24,
    overflow: "hidden",
    position: "relative",
  },
  heroBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroContent: {
    alignItems: "center",
    gap: 10,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  appName: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 24,
    color: "#FFFFFF",
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  card: {
    padding: 24,
    borderWidth: 1,
    gap: 4,
    borderRadius: 24,
  },
  cardTitle: { fontSize: 24 },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 12 },
  form: { gap: 14 },
  separator: {
    borderBottomWidth: 1,
    alignItems: "center",
    marginVertical: 4,
  },
  separatorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.6,
    paddingHorizontal: 12,
    position: "relative",
    top: 8,
  },
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    paddingVertical: 14,
    minHeight: 48,
    borderRadius: 24,
  },
  googleIconContainer: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4285F4",
  },
  appleIconContainer: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  appleIcon: {
    fontSize: 20,
    color: "#000",
  },
  socialText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  link: { alignItems: "center", paddingVertical: 20 },
  linkText: { fontFamily: "Inter_400Regular", fontSize: 14 },
});
