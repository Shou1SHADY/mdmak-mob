import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
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

const { height: SCREEN_H } = Dimensions.get("window");
const isSmall = SCREEN_H < 700;

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
      if (!user.profileCompleted) {
        router.replace("/onboarding");
      } else {
        const dashboard =
          user.role === "Supplier" ? "/(supplier)/dashboard" : "/(contractor)/dashboard";
        router.replace(dashboard);
      }
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
  const heroH = isSmall ? SCREEN_H * 0.28 : SCREEN_H * 0.32;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Hero gradient banner ── */}
        <LinearGradient
          colors={colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { height: heroH, paddingTop: topPad }]}
        >
          {/* subtle background texture */}
          <View style={styles.heroBg}>
            <Image
              source={require("@/assets/images/login.png")}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          </View>

          {/* Logo + brand */}
          <View style={styles.heroContent}>
            <Image
              source={require("@/assets/images/figma/logo1.png")}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={[styles.tagline, { color: "rgba(255,255,255,0.6)" }]}>
              {t.common.tagline}
            </Text>
          </View>
        </LinearGradient>

        {/* ── Form card ── */}
        <View style={[styles.card, { backgroundColor: colors.card, ...colors.shadow.lg }]}>

          {/* Card handle indicator */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <Text style={[styles.cardTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
            {t.auth.login.title}
          </Text>
          <Text style={[styles.cardSub, { color: colors.outline, textAlign: isRTL ? "right" : "left" }]}>
            {t.auth.login.subtitle}
          </Text>

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
            <View>
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
              {/* Forgot password */}
              <TouchableOpacity
                style={[styles.forgotBtn, { alignSelf: isRTL ? "flex-start" : "flex-end" }]}
                onPress={() => Alert.alert(t.auth.login.comingSoon, t.auth.login.comingSoon)}
                activeOpacity={0.7}
              >
                <Text style={[styles.forgotText, { color: colors.cta }]}>
                  {t.auth.login.forgotPassword}
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              title={t.auth.login.signIn}
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              style={colors.shadow.primary as any}
            />

            {/* Separator */}
            <View style={styles.separatorRow}>
              <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.separatorLabel, { color: colors.outline }]}>
                {t.auth.login.continueWith}
              </Text>
              <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Social buttons row */}
            <View style={styles.socialRow}>
              {/* Google */}
              <TouchableOpacity
                style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
                activeOpacity={0.75}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color={colors.foreground} />
                ) : (
                  <>
                    <Text style={styles.googleG}>G</Text>
                    <Text style={[styles.socialLabel, { color: colors.foreground }]}>Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Apple */}
              <TouchableOpacity
                style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                activeOpacity={0.75}
                onPress={() => Alert.alert(t.auth.login.comingSoon, t.auth.login.comingSoonApple)}
              >
                <Text style={styles.appleIcon}></Text>
                <Text style={[styles.socialLabel, { color: colors.foreground }]}>Apple</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Sign up link ── */}
        <TouchableOpacity
          style={[styles.signupRow, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}
          onPress={() => router.push("/auth/register")}
          activeOpacity={0.7}
        >
          <Text style={[styles.signupText, { color: colors.outline }]}>
            {t.auth.login.noAccount}{" "}
            <Text style={{ color: colors.cta, fontFamily: "Inter_700Bold" }}>
              {t.auth.login.signUp}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: {
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.07,
  },
  heroContent: {
    alignItems: "center",
    gap: 6,
    paddingBottom: 28,
  },
  logo: {
    width: isSmall ? 160 : 190,
    height: isSmall ? 52 : 62,
  },
  appName: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: isSmall ? 20 : 22,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 32,
  },

  card: {
    marginTop: -24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    flex: 1,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
    opacity: 0.4,
  },
  cardTitle: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 24,
    letterSpacing: -0.3,
  },
  cardSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
  },

  form: { gap: 14 },

  forgotBtn: {
    marginTop: 6,
    paddingVertical: 2,
  },
  forgotText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12.5,
  },

  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 2,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.3,
  },

  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    paddingVertical: 12,
    minHeight: 48,
    borderRadius: 14,
  },
  googleG: {
    fontSize: 17,
    fontWeight: "800",
    color: "#4285F4",
    lineHeight: 20,
  },
  appleIcon: {
    fontSize: 19,
    color: "#000",
    lineHeight: 21,
  },
  socialLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },

  signupRow: {
    alignItems: "center",
    paddingTop: 16,
    backgroundColor: "transparent",
  },
  signupText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
  },
});
