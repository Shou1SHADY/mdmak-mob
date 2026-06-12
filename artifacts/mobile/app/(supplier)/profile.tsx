import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  const [stats, setStats] = useState({ totalOffers: 0, acceptedOffers: 0, activeRfqs: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.organizationId) { setLoadingStats(false); return; }
      try {
        const offQ = query(collection(db, "offers"), where("organizationId", "==", user.organizationId));
        const offSnap = await getDocs(offQ);
        const offers = offSnap.docs.map((d) => d.data());
        const accepted = offers.filter((o) => o.status === "مقبول").length;
        setStats({ totalOffers: offers.length, acceptedOffers: accepted, activeRfqs: 0 });
      } catch (e) {
        console.warn("[Profile] Stats fetch failed:", e);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [user?.organizationId]);

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

  // Profile completeness
  const completenessFields = [
    !!organization?.name,
    (organization?.specializations?.length ?? 0) > 0,
    (organization?.serviceAreas?.length ?? 0) > 0,
    !!user?.displayName,
    !!user?.email,
  ];
  const completeness = Math.round((completenessFields.filter(Boolean).length / completenessFields.length) * 100);

  const menuItems = [
    { icon: "users" as const, label: t.profile.teamMembers, onPress: () => router.push("/(supplier)/team") },
    { icon: "bell" as const, label: t.profile.notifications, onPress: () => router.push("/(supplier)/notifications") },
    { icon: "package" as const, label: t.profile.orders, onPress: () => router.push("/(supplier)/orders") },
    { icon: "globe" as const, label: isRTL ? "English" : "العربية", onPress: () => setLanguage(isRTL ? "en" : "ar") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={["#0F3460", "#0369A1"] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroHeader, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) }]}
      >
        <View style={styles.avatarSection}>
          <View style={[styles.avatarRing, { borderColor: colors.textWhite40 }]}>
            <View style={[styles.avatar, { backgroundColor: colors.tealAccent }]}>
              <Text style={[styles.avatarText, { fontFamily: "HankenGrotesk_700Bold" }]}>
                {organization?.name?.charAt(0)?.toUpperCase() ?? "S"}
              </Text>
            </View>
          </View>
          <Text style={[styles.name, { color: colors.textWhite, fontFamily: "HankenGrotesk_700Bold" }]}>
            {organization?.name ?? user?.displayName}
          </Text>
          <Text style={[styles.email, { color: colors.textWhite60, fontFamily: "Inter_400Regular" }]}>
            {user?.email}
          </Text>
          <View style={styles.badges}>
            <View style={[styles.roleBadge, { backgroundColor: colors.textWhite12, borderColor: colors.textWhite40, borderWidth: 1 }]}>
              <Text style={[styles.roleText, { color: colors.tealAccent, fontFamily: "Inter_600SemiBold" }]}>
                {t.auth.register.supplier}
              </Text>
            </View>
            {organization?.verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.success + "20" }]}>
                <Feather name="check-circle" size={12} color={colors.success} />
                <Text style={[styles.verifiedText, { color: colors.success }]}>{t.supplierProfile.verified}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Completeness */}
        <Card style={[styles.completenessCard, { borderColor: colors.border }]}>
          <View style={[styles.completenessHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.completenessIcon, { backgroundColor: colors.accentBlueSoft }]}>
              <Feather name="check-circle" size={14} color={colors.cta} />
            </View>
            <Text style={[styles.completenessTitle, { color: colors.foreground }]}>
              {completeness === 100 ? "Profile Complete" : "Profile Completeness"}
            </Text>
            <Text style={[styles.completenessPct, { color: completeness === 100 ? colors.success : colors.cta }]}>
              {completeness}%
            </Text>
          </View>
          <View style={[styles.completenessBar, { backgroundColor: colors.border }]}>
            <View style={[styles.completenessFill, { width: `${completeness}%`, backgroundColor: completeness === 100 ? colors.success : colors.cta }]} />
          </View>
          {completeness < 100 && (
            <Text style={[styles.completenessHint, { color: colors.outline }]}>
              {completeness < 60 ? "Complete your profile to get more RFQ matches" : "Add specializations and service areas"}
            </Text>
          )}
        </Card>

        {/* Quick Stats */}
        <Card style={[styles.statsCard, { borderColor: colors.border }]}>
          <View style={[styles.statsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {[
              { label: "Offers", value: stats.totalOffers, icon: "tag", color: colors.primary },
              { label: "Accepted", value: stats.acceptedOffers, icon: "check-circle", color: colors.success },
              { label: "Win Rate", value: stats.totalOffers > 0 ? Math.round((stats.acceptedOffers / stats.totalOffers) * 100) + "%" : "0%", icon: "percent", color: colors.cta },
            ].map((item) => (
              <View key={item.label} style={styles.statItem}>
                <View style={[styles.statIconWrap, { backgroundColor: item.color + "18" }]}>
                  <Feather name={item.icon as any} size={14} color={item.color} />
                </View>
                <Text style={[styles.statValue, { color: item.color, fontFamily: "HankenGrotesk_700Bold" }]}>
                  {loadingStats ? "—" : item.value}
                </Text>
                <Text style={[styles.statLabel, { color: colors.outline }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Specializations */}
        <Card style={[styles.specsCard, { borderColor: colors.border }]}>
          <View style={[styles.cardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.tealAccent + "20" }]}>
                <Feather name="layers" size={14} color={colors.tealAccent} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "HankenGrotesk_600SemiBold" }]}>
                {t.supplierProfile.specializations}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => { if (editingSpecs) { setSelectedSpecs(organization?.specializations ?? []); setSelectedAreas(organization?.serviceAreas ?? []); } setEditingSpecs(!editingSpecs); }}
              style={[styles.editBtn, { backgroundColor: editingSpecs ? colors.accentBlueSoft : colors.muted }]}
            >
              <Feather name={editingSpecs ? "check" : "edit-2"} size={15} color={editingSpecs ? colors.cta : colors.primary} />
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
                    <Text style={[styles.chipText, { color: selectedSpecs.includes(cat.label) ? colors.primary : colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">{cat.label}</Text>
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
                    <Text style={[styles.chipText, { color: selectedAreas.includes(city) ? colors.primary : colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">{city}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Button title={t.common.save} onPress={handleSave} loading={saving} fullWidth />
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {(organization?.specializations?.length ?? 0) > 0 ? (
                <View style={styles.chipsGrid}>
                  {organization?.specializations?.map((spec, i) => (
                    <View key={i} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                      <Text style={[styles.chipText, { color: colors.mutedForeground }]} numberOfLines={1} ellipsizeMode="tail">{spec}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={[styles.emptyState, { backgroundColor: colors.muted + "40" }]}>
                  <Feather name="layers" size={20} color={colors.outline} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.supplierProfile.noSpecializations}</Text>
                  <TouchableOpacity onPress={() => setEditingSpecs(true)}>
                    <Text style={[styles.emptyAction, { color: colors.cta }]}>Add Specializations</Text>
                  </TouchableOpacity>
                </View>
              )}
              {(organization?.serviceAreas?.length ?? 0) > 0 && (
                <View style={{ gap: 6 }}>
                  <Text style={[styles.subLabel, { color: colors.outline }]}>{t.supplierProfile.serviceAreas}</Text>
                  <View style={styles.chipsGrid}>
                    {organization?.serviceAreas?.map((area, i) => (
                      <View key={i} style={[styles.areaChip, { backgroundColor: colors.accentBlueSoft }]}>
                        <Feather name="map-pin" size={10} color={colors.cta} />
                        <Text style={[styles.areaChipText, { color: colors.cta }]} numberOfLines={1} ellipsizeMode="tail">{area}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* Menu */}
        <Card style={[styles.menuCard, { borderColor: colors.border }]}>
          {menuItems.map((item, i, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuRow,
                { flexDirection: isRTL ? "row-reverse" : "row" },
                i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
              onPress={item.onPress}
            >
              <View style={[styles.menuIconBox, { backgroundColor: colors.accentBlueSoft }]}>
                <Feather name={item.icon} size={16} color={colors.cta} />
              </View>
              <Text style={[styles.menuLabel, { color: colors.foreground, fontFamily: "Inter_500Medium", textAlign: isRTL ? "right" : "left" }]} numberOfLines={1} ellipsizeMode="tail">
                {item.label}
              </Text>
              <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={colors.outline} />
            </TouchableOpacity>
          ))}
        </Card>

        <Button title={t.common.signOut} onPress={handleLogout} variant="destructive" fullWidth />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroHeader: { paddingHorizontal: 16, paddingBottom: 28 },
  avatarSection: { alignItems: "center", gap: 10, paddingVertical: 16 },
  avatarRing: { width: 90, height: 90, borderRadius: 26, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatar: { width: 82, height: 82, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 34, color: "#FFFFFF" },
  name: { fontSize: 22, textAlign: "center" },
  email: { fontSize: 13, textAlign: "center" },
  badges: { flexDirection: "row", gap: 8, marginTop: 2 },
  roleBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  roleText: { fontSize: 12 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  verifiedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  container: { padding: 16, gap: 14 },

  // Completeness
  completenessCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  completenessHeader: { alignItems: "center", justifyContent: "space-between" },
  completenessIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  completenessTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, marginHorizontal: 8 },
  completenessPct: { fontSize: 16, fontFamily: "HankenGrotesk_700Bold" },
  completenessBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  completenessFill: { height: "100%", borderRadius: 3 },
  completenessHint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Stats
  statsCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  statsRow: { alignItems: "center", justifyContent: "space-around" },
  statItem: { alignItems: "center", gap: 6, flex: 1 },
  statIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22 },
  statLabel: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase" as const, letterSpacing: 0.3 },

  // Specializations
  specsCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
  cardHeader: { alignItems: "center", justifyContent: "space-between" },
  cardHeaderIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  editBtn: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 16 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  subLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" as const, letterSpacing: 0.5 },
  chipsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 140 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  areaChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  areaChipText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  emptyState: { alignItems: "center", gap: 8, padding: 20, borderRadius: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  emptyAction: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // Menu
  menuCard: { borderRadius: 14, borderWidth: 1, padding: 4 },
  menuRow: { alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 12 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 15 },
});
