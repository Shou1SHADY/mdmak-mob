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
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useT, useLanguage } from "@/context/LanguageContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const HERO_H = Math.max(SCREEN_H * 0.40, 260);

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
  const [resetLoading, setResetLoading] = useState(false);
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

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert(
        isRTL ? "استعادة كلمة المرور" : "Reset Password",
        isRTL ? "أدخل بريدك الإلكتروني أولاً في حقل البريد" : "Enter your email address above first, then tap 'Forgot password?' again."
      );
      return;
    }
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      Alert.alert(isRTL ? "بريد غير صالح" : "Invalid Email", t.auth.validation.emailInvalid);
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      Alert.alert(
        isRTL ? "تم إرسال الرابط ✓" : "Email Sent ✓",
        isRTL
          ? `تم إرسال رابط إعادة تعيين كلمة المرور إلى ${trimmedEmail}. تحقق من صندوق الوارد والبريد العشوائي.`
          : `A password reset link was sent to ${trimmedEmail}. Check your inbox and spam folder.`
      );
    } catch (err: any) {
      const msg =
        err.code === "auth/user-not-found"
          ? (isRTL ? "لا يوجد حساب بهذا البريد الإلكتروني" : "No account found with this email address.")
          : err.code === "auth/too-many-requests"
          ? (isRTL ? "طلبات كثيرة جداً. حاول لاحقاً." : "Too many requests. Please try again later.")
          : err.code === "auth/network-request-failed"
          ? t.auth.errors.networkError
          : (isRTL ? "فشل إرسال الرابط. حاول مرة أخرى." : "Failed to send reset email. Please try again.");
      Alert.alert(isRTL ? "خطأ" : "Error", msg);
    } finally {
      setResetLoading(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 72 : 20);

  return (
    <View style={[styles.root, { backgroundColor: "#0A1123" }]}>
      {/* ── Hero — background photo ── */}
      <View style={[styles.hero, { height: HERO_H }]}>
        {/* Background photo */}
        <Image
          source={require("@/assets/images/login.png")}
          style={{ position: "absolute", width: SCREEN_W, height: HERO_H }}
          contentFit="cover"
          contentPosition="center"
        />
        {/* Navy blue overlay */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(15,23,42,0.82)" }]} />
        {/* Logo + tagline centred in hero */}
        <View style={[styles.heroContent, { paddingTop: topPad }]}>
          <Image
            source={require("@/assets/images/figma/logo1.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <View style={styles.taglineRow}>
            <Text style={styles.tagline}>{t.common.tagline}</Text>
          </View>
        </View>
      </View>

      {/* ── Form panel — overlaps hero by 44px ── */}
      <KeyboardAvoidingView
        style={[styles.kav, { marginTop: -44 }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.panel, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* No scroll — all content fits in one view */}
          <View style={styles.inner}>
            {/* Heading */}
            <Text style={[styles.heading, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
              {t.auth.login.title}
            </Text>
            <Text style={[styles.subheading, { color: colors.outline, textAlign: isRTL ? "right" : "left" }]}>
              {t.auth.login.subtitle}
            </Text>

            {/* Fields */}
            <View style={styles.fields}>
              <Input
                label={t.auth.login.email}
                value={email}
                onChangeText={(v) => { setEmail(v); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon="mail"
                error={errors.email}
                placeholder={t.auth.login.emailPlaceholder}
                isRTL={isRTL}
              />
              <Input
                label={t.auth.login.password}
                value={password}
                onChangeText={(v) => { setPassword(v); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
                secureTextEntry={!showPass}
                autoComplete="current-password"
                leftIcon="lock"
                rightIcon={showPass ? "eye-off" : "eye"}
                onRightIconPress={() => setShowPass((p) => !p)}
                error={errors.password}
                placeholder={t.auth.login.passwordPlaceholder}
                isRTL={isRTL}
              />
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              style={[styles.forgot, { alignSelf: isRTL ? "flex-start" : "flex-end" }]}
              onPress={handleForgotPassword}
              disabled={resetLoading}
              activeOpacity={0.7}
            >
              {resetLoading ? (
                <ActivityIndicator size="small" color={colors.cta} />
              ) : (
                <Text style={[styles.forgotText, { color: colors.cta }]}>
                  {t.auth.login.forgotPassword}
                </Text>
              )}
            </TouchableOpacity>

            {/* Sign in */}
            <Button
              title={t.auth.login.signIn}
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
            />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.outline }]}>
                {t.auth.login.continueWith}
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* Social buttons */}
            <View style={[styles.socialRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <TouchableOpacity
                style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={handleGoogleSignIn}
                disabled={googleLoading}
                activeOpacity={0.75}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color={colors.outline} />
                ) : (
                  <>
                    <Text style={styles.googleG}>G</Text>
                    <Text style={[styles.socialLabel, { color: colors.foreground }]}>Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {Platform.OS === "ios" && (
                <TouchableOpacity
                  style={[styles.socialBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  activeOpacity={0.75}
                  onPress={() => Alert.alert(t.auth.login.comingSoon, t.auth.login.comingSoonApple)}
                >
                  <Ionicons name="logo-apple" size={18} color={colors.foreground} />
                  <Text style={[styles.socialLabel, { color: colors.foreground }]}>Apple</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Spacer pushes signup to bottom */}
            <View style={{ flex: 1 }} />

            {/* Sign up */}
            <TouchableOpacity
              style={styles.signupRow}
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
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  // Hero — photo background container
  hero: {
    overflow: "hidden",
  },
  heroContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 32,
    gap: 10,
  },
  logo: {
    width: 210,
    height: 70,
  },
  taglineRow: {
    paddingHorizontal: 8,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    lineHeight: 20,
  },

  // Form panel
  kav: {
    flex: 1,
  },
  panel: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
    opacity: 0.3,
  },

  // Static inner content (no scroll)
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  heading: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 22,
    marginBottom: 3,
  },
  subheading: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 14,
  },

  // Fields
  fields: {
    gap: 10,
    marginBottom: 8,
  },
  forgot: {
    paddingVertical: 12,
    marginBottom: 4,
    minHeight: 44,
    justifyContent: "center",
  },
  forgotText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },

  // Divider
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },

  // Social
  socialRow: {
    gap: 12,
  },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    paddingVertical: 13,
    minHeight: 50,
    borderRadius: 14,
  },
  googleG: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: "#4285F4",
    lineHeight: 20,
  },
  socialLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },

  // Sign up
  signupRow: {
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 14,
    minHeight: 44,
    justifyContent: "center",
  },
  signupText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
});
