import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { doc, updateDoc } from "firebase/firestore";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { router } from "expo-router";

export default function ContractorProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, organization, logout, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [orgName, setOrgName] = useState(organization?.name ?? "");
  const [city, setCity] = useState(organization?.city ?? "");
  const [crNumber, setCrNumber] = useState(organization?.crNumber ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user?.organizationId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "organizations", user.organizationId), {
        name: orgName, city, crNumber,
      });
      await refreshUser();
      setEditing(false);
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const menuItems = [
    { icon: "users" as const, label: "Team Members", onPress: () => router.push("/(contractor)/team") },
    { icon: "bell" as const, label: "Notifications", onPress: () => router.push("/(contractor)/notifications") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Dark hero header */}
      <View
        style={[
          styles.heroHeader,
          {
            backgroundColor: colors.primary,
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          },
        ]}
      >
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: "rgba(32,203,213,0.18)", borderColor: colors.accent, borderWidth: 2 }]}>
            <Text style={styles.avatarText}>{organization?.name?.charAt(0)?.toUpperCase() ?? "C"}</Text>
          </View>
          <Text style={[styles.name, { color: "#F8FAFC" }]}>{organization?.name ?? user?.displayName}</Text>
          <Text style={[styles.email, { color: "rgba(248,250,252,0.6)" }]}>{user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.accent + "20", borderColor: colors.accent + "50", borderWidth: 1 }]}>
            <Text style={[styles.roleText, { color: colors.accent }]}>Contractor</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 80 }]}
      >
        {/* Company Info */}
        <Card>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Company Info</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Feather name={editing ? "x" : "edit-2"} size={18} color={colors.cta} />
            </TouchableOpacity>
          </View>
          {editing ? (
            <View style={styles.form}>
              <Input label="Organization Name" value={orgName} onChangeText={setOrgName} leftIcon="briefcase" />
              <Input label="CR Number" value={crNumber} onChangeText={setCrNumber} leftIcon="hash" placeholder="1234567890" />
              <Input label="City" value={city} onChangeText={setCity} leftIcon="map-pin" />
              <Button title="Save Changes" onPress={handleSave} loading={saving} fullWidth />
            </View>
          ) : (
            <View style={styles.infoGrid}>
              {[
                { icon: "briefcase" as const, label: "Organization", value: organization?.name },
                { icon: "hash" as const, label: "CR Number", value: organization?.crNumber ?? "Not set" },
                { icon: "map-pin" as const, label: "City", value: organization?.city ?? user?.city },
                { icon: "mail" as const, label: "Email", value: user?.email },
              ].map((item) => (
                <View key={item.label} style={styles.infoRow}>
                  <Feather name={item.icon} size={15} color={colors.mutedForeground} />
                  <View>
                    <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                    <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value ?? "—"}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Menu */}
        <Card>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuRow,
                i < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
              onPress={item.onPress}
            >
              <Feather name={item.icon} size={18} color={colors.foreground} />
              <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </Card>

        <Button title="Sign Out" onPress={handleLogout} variant="destructive" fullWidth />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroHeader: { paddingHorizontal: 16, paddingBottom: 20 },
  avatarSection: { alignItems: "center", gap: 8, paddingVertical: 12 },
  avatar: { width: 80, height: 80, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 32, fontWeight: "700" as const, color: "#20CBD5" },
  name: { fontSize: 20, fontWeight: "700" as const },
  email: { fontSize: 13 },
  roleBadge: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5 },
  roleText: { fontSize: 13, fontWeight: "600" as const },
  container: { padding: 16, gap: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "700" as const },
  form: { gap: 12 },
  infoGrid: { gap: 14 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 15, fontWeight: "500" as const },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  menuLabel: { flex: 1, fontSize: 15 },
});
