import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { doc, updateDoc } from "firebase/firestore";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useT, useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { router } from "expo-router";
import { CATEGORIES, SAUDI_CITIES } from "@/constants/data";

export default function SupplierProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { setLanguage, isRTL } = useLanguage();
  const { user, organization, logout, refreshUser } = useAuth();
  const [editingSpecs, setEditingSpecs] = useState(false);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>(organization?.specializations ?? []);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(organization?.serviceAreas ?? []);
  const [saving, setSaving] = useState(false);

  const toggleSpec = (spec: string) => {
    setSelectedSpecs((prev) => prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]);
  };
  const toggleArea = (area: string) => {
    setSelectedAreas((prev) => prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]);
  };

  const handleSave = async () => {
    if (!user?.organizationId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        specializations: selectedSpecs,
        serviceAreas: selectedAreas,
      });
      await refreshUser();
      setEditingSpecs(false);
    } catch {
      Alert.alert(t.common.error, t.supplierProfile.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.replace("/auth/login");
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      handleSignOut();
    } else {
      Alert.alert(t.common.signOut, t.common.signOutConfirm, [
        { text: t.common.cancel, style: "cancel" },
        { text: t.common.signOut, style: "destructive", onPress: handleSignOut },
      ]);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), paddingBottom: insets.bottom + 80 }]}
    >
      <View style={styles.avatarSection}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={styles.avatarText}>{organization?.name?.charAt(0)?.toUpperCase() ?? "S"}</Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{organization?.name ?? user?.displayName}</Text>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
        <View style={styles.badges}>
          <View style={[styles.roleBadge, { backgroundColor: colors.accent + "20" }]}>
            <Text style={[styles.roleText, { color: colors.accent }]}>{t.auth.register.supplier}</Text>
          </View>
          {organization?.verified && (
            <StatusBadge label={t.supplierProfile.verified} color={colors.success} size="sm" />
          )}
        </View>
      </View>

      {/* Specializations */}
      <Card>
        <View style={styles.cardHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.supplierProfile.specializations}</Text>
          <TouchableOpacity onPress={() => setEditingSpecs(!editingSpecs)}>
            <Feather name={editingSpecs ? "x" : "edit-2"} size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        {editingSpecs ? (
          <View style={{ gap: 14 }}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{t.supplierProfile.selectCategories}</Text>
            <View style={styles.chipsGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, { borderColor: selectedSpecs.includes(cat.label) ? colors.primary : colors.border, backgroundColor: selectedSpecs.includes(cat.label) ? colors.primary + "15" : "transparent" }]}
                  onPress={() => toggleSpec(cat.label)}
                >
                  <Text style={[styles.chipText, { color: selectedSpecs.includes(cat.label) ? colors.primary : colors.foreground }]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{t.supplierProfile.serviceAreas}:</Text>
            <View style={styles.chipsGrid}>
              {SAUDI_CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[styles.chip, { borderColor: selectedAreas.includes(city) ? colors.primary : colors.border, backgroundColor: selectedAreas.includes(city) ? colors.primary + "15" : "transparent" }]}
                  onPress={() => toggleArea(city)}
                >
                  <Text style={[styles.chipText, { color: selectedAreas.includes(city) ? colors.primary : colors.foreground }]}>{city}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title={t.common.save} onPress={handleSave} loading={saving} fullWidth />
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {(organization?.specializations?.length ?? 0) > 0 ? (
              <View style={styles.chipsGrid}>
                {organization?.specializations?.map((spec, i) => (
                  <View key={i} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                    <Text style={[styles.chipText, { color: colors.mutedForeground }]}>{spec}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.supplierProfile.noSpecializations}</Text>
            )}
          </View>
        )}
      </Card>

      <Card>
        {[
          { icon: "users" as const, label: t.profile.teamMembers, onPress: () => router.push("/(supplier)/team") },
          { icon: "bell" as const, label: t.profile.notifications, onPress: () => router.push("/(supplier)/notifications") },
          { icon: "package" as const, label: t.profile.orders, onPress: () => router.push("/(supplier)/orders") },
          { icon: "globe" as const, label: isRTL ? "English" : "العربية", onPress: () => setLanguage(isRTL ? "en" : "ar") },
        ].map((item, i, arr) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            onPress={item.onPress}
          >
            <Feather name={item.icon} size={18} color={colors.foreground} />
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
            <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </Card>

      <Button title={t.common.signOut} onPress={handleLogout} variant="destructive" fullWidth />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  avatarSection: { alignItems: "center", gap: 8, paddingVertical: 16 },
  avatar: { width: 80, height: 80, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 32, fontWeight: "700" as const, color: "#FFFFFF" },
  name: { fontSize: 22, fontWeight: "700" as const },
  email: { fontSize: 14 },
  badges: { flexDirection: "row", gap: 8 },
  roleBadge: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 5 },
  roleText: { fontSize: 13, fontWeight: "600" as const },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "700" as const },
  label: { fontSize: 13 },
  chipsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: "500" as const },
  emptyText: { fontSize: 14 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
  menuLabel: { flex: 1, fontSize: 15 },
});
