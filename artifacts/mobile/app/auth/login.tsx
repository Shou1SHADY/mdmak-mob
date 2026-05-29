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
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const msg =
        err.code === "auth/invalid-credential" || err.code === "auth/wrong-password"
          ? "Invalid email or password"
          : err.code === "auth/user-not-found"
          ? "No account found with this email"
          : err.code === "auth/too-many-requests"
          ? "Too many attempts. Please try again later."
          : "Login failed. Please try again.";
      Alert.alert("Login Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Dark hero header */}
      <View style={[styles.hero, { backgroundColor: colors.primary, paddingTop: topPad + 32 }]}>
        <View style={[styles.logoRing, { borderColor: colors.accent }]}>
          <Text style={styles.logoGlyph}>م</Text>
        </View>
        <Text style={styles.appName}>Mdmak Tech</Text>
        <Text style={styles.appNameAr}>مدماك تيك</Text>
        <Text style={styles.tagline}>Saudi B2B Construction Marketplace</Text>
      </View>

      {/* Card form */}
      <ScrollView
        style={{ flex: 1, marginTop: -20 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { borderRadius: colors.radius, backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Welcome back</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Sign in to your account</Text>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
              error={errors.email}
              placeholder="your@email.com"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              leftIcon="lock"
              rightIcon={showPass ? "eye-off" : "eye"}
              onRightIconPress={() => setShowPass(!showPass)}
              error={errors.password}
              placeholder="••••••••"
            />
            <Button title="Sign In" onPress={handleLogin} loading={loading} fullWidth size="lg" />
          </View>
        </View>

        <TouchableOpacity style={styles.link} onPress={() => router.push("/auth/register")}>
          <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
            Don't have an account?{" "}
            <Text style={{ color: colors.cta, fontWeight: "700" }}>Sign up</Text>
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
  link: { alignItems: "center", paddingVertical: 20 },
  linkText: { fontSize: 14 },
});
