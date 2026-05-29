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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40), paddingBottom: insets.bottom + 40 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={[styles.logo, { backgroundColor: colors.primary }]}>
          <Text style={styles.logoText}>م</Text>
        </View>
        <Text style={[styles.appName, { color: colors.foreground }]}>Mdmak Tech</Text>
        <Text style={[styles.appNameAr, { color: colors.primary }]}>مدماك تيك</Text>
        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
          Saudi B2B Construction Marketplace
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Sign in to your account</Text>

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
          <Button title="Sign In" onPress={handleLogin} loading={loading} fullWidth />
        </View>
      </View>

      <TouchableOpacity style={styles.registerLink} onPress={() => router.push("/auth/register")}>
        <Text style={[styles.registerText, { color: colors.mutedForeground }]}>
          Don't have an account?{" "}
          <Text style={{ color: colors.primary, fontWeight: "600" }}>Sign up</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, gap: 24 },
  header: { alignItems: "center", gap: 8, paddingVertical: 12 },
  logo: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 36, fontWeight: "700" as const, color: "#fff" },
  appName: { fontSize: 26, fontWeight: "800" as const },
  appNameAr: { fontSize: 20, fontWeight: "700" as const },
  tagline: { fontSize: 14, textAlign: "center" },
  card: { borderRadius: 20, padding: 24, borderWidth: 1, gap: 4 },
  title: { fontSize: 22, fontWeight: "700" as const },
  subtitle: { fontSize: 14, marginBottom: 16 },
  form: { gap: 14 },
  registerLink: { alignItems: "center", paddingVertical: 8 },
  registerText: { fontSize: 14 },
});
