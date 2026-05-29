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
import { UserRole } from "@/context/AuthContext";
import { SAUDI_CITIES } from "@/constants/data";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole>("contractor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [city, setCity] = useState("Riyadh");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (step === 1) {
      if (!email.trim() || !password || !confirmPass || !displayName.trim()) {
        Alert.alert("Missing Fields", "Please fill in all fields.");
        return;
      }
      if (password !== confirmPass) {
        Alert.alert("Password Mismatch", "Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        Alert.alert("Weak Password", "Password must be at least 6 characters.");
        return;
      }
      setStep(2);
    }
  };

  const handleRegister = async () => {
    if (!orgName.trim()) {
      Alert.alert("Missing Fields", "Please enter your organization name.");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, displayName.trim(), role, orgName.trim(), city);
    } catch (err: any) {
      const msg =
        err.code === "auth/email-already-in-use"
          ? "This email is already registered."
          : "Registration failed. Please try again.";
      Alert.alert("Registration Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const roles: { id: UserRole; label: string; labelAr: string; desc: string }[] = [
    { id: "contractor", label: "Contractor", labelAr: "مقاول", desc: "Create RFQs and find suppliers" },
    { id: "supplier", label: "Supplier", labelAr: "مورد", desc: "Browse RFQs and submit offers" },
  ];

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
        <Text style={[styles.appName, { color: colors.foreground }]}>Create Account</Text>
        <View style={styles.steps}>
          {[1, 2].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                { backgroundColor: step >= s ? colors.primary : colors.border },
              ]}
            />
          ))}
        </View>
      </View>

      {step === 1 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Your details</Text>
          <View style={styles.form}>
            <Input
              label="Full Name"
              value={displayName}
              onChangeText={setDisplayName}
              leftIcon="user"
              placeholder="Ahmed Al-Rashidi"
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail"
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
              placeholder="••••••••"
            />
            <Input
              label="Confirm Password"
              value={confirmPass}
              onChangeText={setConfirmPass}
              secureTextEntry={!showPass}
              leftIcon="lock"
              placeholder="••••••••"
            />
            <Button title="Next" onPress={handleNext} fullWidth />
          </View>
        </View>
      )}

      {step === 2 && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Your role</Text>
          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.foreground }]}>I am a:</Text>
            <View style={styles.roleRow}>
              {roles.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.roleCard,
                    {
                      borderColor: role === r.id ? colors.primary : colors.border,
                      backgroundColor: role === r.id ? colors.primary + "10" : colors.card,
                    },
                  ]}
                  onPress={() => setRole(r.id)}
                >
                  <Text style={[styles.roleLabel, { color: role === r.id ? colors.primary : colors.foreground }]}>
                    {r.label}
                  </Text>
                  <Text style={[styles.roleAr, { color: colors.mutedForeground }]}>{r.labelAr}</Text>
                  <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>{r.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Organization Name"
              value={orgName}
              onChangeText={setOrgName}
              leftIcon="briefcase"
              placeholder="Al-Rashidi Construction Co."
            />

            <Text style={[styles.label, { color: colors.foreground }]}>City</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {SAUDI_CITIES.slice(0, 8).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.cityChip,
                      {
                        borderColor: city === c ? colors.primary : colors.border,
                        backgroundColor: city === c ? colors.primary : "transparent",
                      },
                    ]}
                    onPress={() => setCity(c)}
                  >
                    <Text style={[styles.cityText, { color: city === c ? "#fff" : colors.foreground }]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Button title="Create Account" onPress={handleRegister} loading={loading} fullWidth />
            <Button title="Back" onPress={() => setStep(1)} variant="ghost" fullWidth />
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.loginLink} onPress={() => router.push("/auth/login")}>
        <Text style={[styles.loginText, { color: colors.mutedForeground }]}>
          Already have an account?{" "}
          <Text style={{ color: colors.primary, fontWeight: "600" }}>Sign in</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, gap: 24 },
  header: { alignItems: "center", gap: 8, paddingVertical: 12 },
  logo: { width: 60, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 28, fontWeight: "700" as const, color: "#fff" },
  appName: { fontSize: 22, fontWeight: "700" as const },
  steps: { flexDirection: "row", gap: 8, marginTop: 8 },
  stepDot: { width: 32, height: 4, borderRadius: 2 },
  card: { borderRadius: 20, padding: 24, borderWidth: 1 },
  title: { fontSize: 20, fontWeight: "700" as const, marginBottom: 16 },
  form: { gap: 14 },
  label: { fontSize: 14, fontWeight: "500" as const },
  roleRow: { flexDirection: "row", gap: 12 },
  roleCard: { flex: 1, borderRadius: 14, borderWidth: 2, padding: 14, gap: 4 },
  roleLabel: { fontSize: 16, fontWeight: "700" as const },
  roleAr: { fontSize: 13 },
  roleDesc: { fontSize: 12, lineHeight: 17 },
  cityChip: { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 7 },
  cityText: { fontSize: 13, fontWeight: "500" as const },
  loginLink: { alignItems: "center", paddingVertical: 8 },
  loginText: { fontSize: 14 },
});
