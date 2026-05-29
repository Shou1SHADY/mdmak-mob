import React from "react";
import {
  View, Text, ScrollView, StyleSheet, Alert, Platform, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>

      <Card>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Account</Text>
        <View style={styles.infoGrid}>
          {[
            { label: "Name", value: user?.displayName },
            { label: "Email", value: user?.email },
            { label: "Role", value: "Administrator" },
          ].map((item) => (
            <View key={item.label} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{item.value}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Platform</Text>
        {[
          { icon: "globe" as const, label: "About Mdmak Tech" },
          { icon: "shield" as const, label: "Privacy Policy" },
          { icon: "file" as const, label: "Terms of Service" },
        ].map((item, i, arr) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
          >
            <Feather name={item.icon} size={18} color={colors.mutedForeground} />
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </Card>

      <Button title="Sign Out" onPress={handleLogout} variant="destructive" fullWidth />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  title: { fontSize: 24, fontWeight: "700" as const },
  sectionTitle: { fontSize: 16, fontWeight: "700" as const, marginBottom: 14 },
  infoGrid: { gap: 0 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: "500" as const },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  menuLabel: { flex: 1, fontSize: 15 },
});
