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

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleNext = () => {
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
    { id: "contractor", label: "Contractor", labelAr: "مقاول", desc: "Post RFQs & source suppliers" },
    { id: "supplier", label: "Supplier", labelAr: "مورد", desc: "Browse RFQs & submit offers" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Dark header */}
      <View style={[styles.hero, { backgroundColor: colors.primary, paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => (step > 1 ? setStep(1) : router.back())} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={styles.heroCenter}>
          <Text style={styles.heroTitle}>Create Account</Text>
          <View style={styles.stepTrack}>
            {[1, 2].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  { backgroundColor: step >= s ? colors.accent : "rgba(248,250,252,0.3)" },
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
        <View style={[styles.card, { borderRadius: colors.radius, backgroundColor: colors.card, borderColor: colors.border }]}>
          {step === 1 && (
            <View style={styles.form}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your details</Text>
              <Input label="Full Name" value={displayName} onChangeText={setDisplayName} leftIcon="user" placeholder="Ahmed Al-Rashidi" />
              <Input label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" leftIcon="mail" placeholder="your@email.com" />
              <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPass} leftIcon="lock" rightIcon={showPass ? "eye-off" : "eye"} onRightIconPress={() => setShowPass(!showPass)} placeholder="At least 6 characters" />
              <Input label="Confirm Password" value={confirmPass} onChangeText={setConfirmPass} secureTextEntry={!showPass} leftIcon="lock" placeholder="Repeat password" />
              <Button title="Continue" onPress={handleNext} fullWidth size="lg" />
            </View>
          )}

          {step === 2 && (
            <View style={styles.form}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your role</Text>

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
                    <Text style={[styles.roleAr, { color: role === r.id ? colors.accent : colors.mutedForeground, letterSpacing: 0 }]}>{r.labelAr}</Text>
                    <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>{r.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input label="Organization Name" value={orgName} onChangeText={setOrgName} leftIcon="briefcase" placeholder="Al-Rashidi Construction Co." />

              <View>
                <Text style={[styles.label, { color: colors.secondary }]}>City</Text>
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
                        <Text style={[styles.cityText, { color: city === c ? "#fff" : colors.secondary }]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <Button title="Create Account" onPress={handleRegister} loading={loading} fullWidth size="lg" />
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.link} onPress={() => router.push("/auth/login")}>
          <Text style={[styles.linkText, { color: colors.mutedForeground }]}>
            Already have an account?{" "}
            <Text style={{ color: colors.cta, fontWeight: "700" }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  heroCenter: { flex: 1, alignItems: "center", gap: 10 },
  heroTitle: { fontSize: 20, fontWeight: "700" as const, color: "#F8FAFC" },
  stepTrack: { flexDirection: "row", gap: 8 },
  stepDot: { width: 36, height: 4, borderRadius: 2 },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  card: {
    padding: 24,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
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
  cityChip: { borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 8 },
  cityText: { fontSize: 13, fontWeight: "500" as const },
  link: { alignItems: "center", paddingVertical: 20 },
  linkText: { fontSize: 14 },
});
