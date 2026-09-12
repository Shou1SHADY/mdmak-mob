import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { headerTopPadding } from "@/lib/layout";
import { type, space, radius } from "@/lib/design";
import {
  extractInviteToken,
  lookupInvitation,
  REQUEST_ACCESS_URL,
  type InvitationInfo,
} from "@/lib/site-api";

/**
 * Registration by invitation — the same flow as the website's /register page.
 *
 * There is no public sign-up: the website removed it and firestore.rules
 * reserves profile creation for the server. A person arrives here with an
 * invitation (a supplier invited by a contractor, or a member invited to a
 * team). Step one resolves the invitation so they can see who invited them
 * before typing anything; step two creates the account. A company with no
 * invitation yet is sent to the website's access-request form rather than to
 * a form that could never succeed.
 */

type Step = "invite" | "details";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { isRTL } = useLanguage();
  const { user, registerWithInvitation, logout } = useAuth();
  const { showToast } = useToast();
  const pendingRef = useRef(false);
  const initialUrl = Linking.useURL();

  const [step, setStep] = useState<Step>("invite");
  const [inviteText, setInviteText] = useState("");
  const [inviteError, setInviteError] = useState<string | undefined>();
  const [checking, setChecking] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [info, setInfo] = useState<InvitationInfo | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const align = isRTL ? "right" : "left";
  const row = isRTL ? "row-reverse" : "row";

  const lookupMessage = (code: string) => {
    switch (code) {
      case "INVALID_TOKEN":
        return t.auth.register.inviteInvalid;
      case "NOT_FOUND":
        return t.auth.register.inviteNotFound;
      case "INVITATION_NOT_PENDING":
        return t.auth.register.inviteExpired;
      default:
        return t.auth.register.inviteLookupFailed;
    }
  };

  const verify = async (raw: string) => {
    const candidate = extractInviteToken(raw);
    if (!candidate) {
      setInviteError(t.auth.register.inviteInvalid);
      return;
    }
    setChecking(true);
    setInviteError(undefined);
    const result = await lookupInvitation(candidate);
    setChecking(false);
    if (!result.ok) {
      setInviteError(lookupMessage(result.code));
      return;
    }
    setToken(candidate);
    setInfo(result.data);
    setEmail((prev) => prev || result.data.email || "");
    setName((prev) =>
      prev || (result.data.type === "team_invite" ? result.data.name ?? "" : result.data.companyName ?? "")
    );
    setStep("details");
  };

  // Opened from an invitation link (the website's /register?invite=… or the
  // app's own scheme): skip the paste step.
  useEffect(() => {
    if (!initialUrl || token) return;
    const fromLink = Linking.parse(initialUrl).queryParams?.invite;
    const candidate = extractInviteToken(typeof fromLink === "string" ? fromLink : initialUrl);
    if (candidate) {
      setInviteText(candidate);
      void verify(candidate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl]);

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = t.auth.validation.fieldsRequired;
    if (!email.trim()) e.email = t.auth.validation.emailRequired;
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = t.auth.validation.emailInvalid;
    if (!password) e.password = t.auth.validation.passwordRequired;
    else if (password.length < 6) e.password = t.auth.validation.passwordWeak;
    if (password !== confirm) e.confirm = t.auth.validation.passwordMismatch;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!token || !validate()) return;
    setLoading(true);
    setFormError(null);
    try {
      const appUser = await registerWithInvitation({
        email: email.trim(),
        password,
        name: name.trim(),
        phone: phone.trim() || undefined,
        token,
      });
      if (appUser.role === "Admin") {
        await logout();
        setFormError(t.auth.errors.adminNotSupported);
        return;
      }
      const message =
        info?.type === "team_invite"
          ? t.auth.register.joinedTeam.replace("{org}", info.orgName)
          : t.auth.register.joinedSupplier.replace(
              "{contractor}",
              info?.type === "supplier_invite" ? info.contractorName : ""
            );
      showToast(message, "success");
      pendingRef.current = true;
    } catch (err: any) {
      setFormError(
        err.code === "auth/email-already-in-use"
          ? t.auth.errors.emailInUse
          : err.code === "auth/weak-password"
          ? t.auth.validation.passwordWeak
          : err.code === "auth/invalid-email"
          ? t.auth.validation.emailInvalid
          : err.code === "auth/network-request-failed"
          ? t.auth.errors.networkError
          : err.code === "invite/accept-failed"
          ? err.inviteCode === "INVITATION_NOT_PENDING"
            ? t.auth.register.inviteExpired
            : t.auth.register.acceptFailed
          : t.auth.errors.genericRegister
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && pendingRef.current) {
      pendingRef.current = false;
      if (!user.profileCompleted) {
        router.replace("/onboarding");
      } else {
        router.replace(user.role === "Supplier" ? "/(supplier)/dashboard" : "/(contractor)/dashboard");
      }
    }
  }, [user]);

  const inviteSummary = !info
    ? ""
    : info.type === "team_invite"
    ? t.auth.register.invitedToTeam
        .replace("{org}", info.orgName)
        .replace("{role}", info.role === "Supplier" ? t.auth.register.supplier : t.auth.register.contractor)
    : t.auth.register.invitedAsSupplier.replace("{name}", info.contractorName || t.common.appName);

  const emailMatchesInvite =
    !!info?.email && email.trim().toLowerCase() === info.email.toLowerCase();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Hero */}
      <View
        style={[
          styles.hero,
          { backgroundColor: colors.primary, paddingTop: headerTopPadding(insets.top, 12), flexDirection: row },
        ]}
      >
        <TouchableOpacity
          onPress={() => (step === "details" ? setStep("invite") : router.back())}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t.common.back}
        >
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={colors.primaryForeground} />
        </TouchableOpacity>
        <View style={styles.heroCenter}>
          <Text style={[type.title, { color: colors.primaryForeground }]}>{t.auth.register.title}</Text>
          <View style={[styles.stepTrack, { flexDirection: row }]}>
            {(["invite", "details"] as Step[]).map((s, i) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  { backgroundColor: i === 0 || step === "details" ? colors.primaryForeground : colors.textWhite40 },
                ]}
              />
            ))}
          </View>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1, marginTop: -16 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {step === "invite" ? (
            <View style={styles.form}>
              <Text style={[type.title, { color: colors.foreground, textAlign: align }]}>
                {t.auth.register.inviteStep}
              </Text>
              <Text style={[type.body, { color: colors.mutedForeground, textAlign: align }]}>
                {t.auth.register.inviteHint}
              </Text>
              <Input
                label={t.auth.register.inviteLabel}
                value={inviteText}
                onChangeText={(v) => {
                  setInviteText(v);
                  if (inviteError) setInviteError(undefined);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon="link"
                placeholder={t.auth.register.invitePlaceholder}
                error={inviteError}
                isRTL={isRTL}
                returnKeyType="go"
                onSubmitEditing={() => verify(inviteText)}
              />
              <Button
                title={t.auth.register.checkInvite}
                onPress={() => verify(inviteText)}
                loading={checking}
                fullWidth
                size="lg"
              />
            </View>
          ) : (
            <View style={styles.form}>
              <View
                style={[
                  styles.banner,
                  { backgroundColor: colors.accent + "14", borderColor: colors.accent + "40", flexDirection: row },
                ]}
              >
                <Feather name={info?.type === "team_invite" ? "users" : "truck"} size={18} color={colors.accentForeground} />
                <Text style={[type.body, { color: colors.foreground, flex: 1, textAlign: align }]}>{inviteSummary}</Text>
              </View>
              <Text style={[type.title, { color: colors.foreground, textAlign: align }]}>
                {t.auth.register.detailsStep}
              </Text>
              <Input
                label={t.auth.register.fullName}
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
                }}
                autoComplete="name"
                leftIcon="user"
                placeholder={t.auth.register.namePlaceholder}
                error={errors.name}
                isRTL={isRTL}
              />
              <Input
                label={t.auth.register.email}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                leftIcon="mail"
                placeholder={t.auth.login.emailPlaceholder}
                error={errors.email}
                helperText={emailMatchesInvite ? t.auth.register.emailLocked : undefined}
                isRTL={isRTL}
              />
              <Input
                label={t.auth.register.phone}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                leftIcon="phone"
                placeholder={t.auth.register.phonePlaceholder}
                isRTL={isRTL}
              />
              <Input
                label={t.auth.register.password}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                }}
                secureTextEntry={!showPass}
                autoComplete="new-password"
                leftIcon="lock"
                rightIcon={showPass ? "eye-off" : "eye"}
                onRightIconPress={() => setShowPass((p) => !p)}
                placeholder={t.auth.login.passwordPlaceholder}
                error={errors.password}
                isRTL={isRTL}
              />
              <Input
                label={t.auth.register.confirmPassword}
                value={confirm}
                onChangeText={(v) => {
                  setConfirm(v);
                  if (errors.confirm) setErrors((p) => ({ ...p, confirm: undefined }));
                }}
                secureTextEntry={!showPass}
                autoComplete="new-password"
                leftIcon="lock"
                placeholder={t.auth.login.passwordPlaceholder}
                error={errors.confirm}
                isRTL={isRTL}
              />
              {formError && (
                <Text style={[type.caption, { color: colors.destructive, textAlign: align }]}>{formError}</Text>
              )}
              <Button
                title={t.auth.register.createAccount}
                onPress={handleRegister}
                loading={loading}
                fullWidth
                size="lg"
              />
            </View>
          )}
        </View>

        {/* No invitation yet: the website's access-request form, not a dead end. */}
        <View style={[styles.footer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[type.captionStrong, { color: colors.mutedForeground, textAlign: align }]}>
            {t.auth.register.noInvite}
          </Text>
          <TouchableOpacity
            onPress={() => void WebBrowser.openBrowserAsync(REQUEST_ACCESS_URL)}
            accessibilityRole="link"
            style={[styles.linkRow, { flexDirection: row }]}
          >
            <Text style={[type.bodyStrong, { color: colors.cta, textAlign: align }]}>
              {t.auth.register.requestAccess}
            </Text>
            <Feather name="external-link" size={14} color={colors.cta} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.link} onPress={() => router.push("/auth/login")} accessibilityRole="button">
          <Text style={[type.body, { color: colors.mutedForeground }]}>
            {t.auth.register.haveAccount}{" "}
            <Text style={[type.bodyStrong, { color: colors.cta }]}>{t.auth.register.signIn}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", paddingHorizontal: space.lg, paddingBottom: space.xxl },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  heroCenter: { flex: 1, alignItems: "center", gap: space.sm },
  stepTrack: { gap: space.sm },
  stepDot: { width: 36, height: 4, borderRadius: radius.hairline },
  scroll: { paddingHorizontal: space.lg, paddingTop: space.xs },
  card: { padding: space.xl, borderWidth: 1, borderRadius: radius.card },
  form: { gap: space.lg },
  banner: { alignItems: "center", gap: space.md, padding: space.md, borderWidth: 1, borderRadius: radius.control },
  footer: { marginTop: space.md, padding: space.lg, borderWidth: 1, borderRadius: radius.card, gap: space.xs },
  linkRow: { alignItems: "center", gap: space.sm, minHeight: 44 },
  link: { alignItems: "center", paddingVertical: space.xl, minHeight: 44 },
});
