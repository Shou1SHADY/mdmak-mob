import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
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
  const t = useT();
  const { setLanguage, isRTL } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [orgName, setOrgName] = useState(organization?.name ?? "");
  const [city, setCity] = useState(organization?.city ?? "");
  const [crNumber, setCrNumber] = useState(organization?.crNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalRfqs: 0, activeRfqs: 0, totalOffers: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.organizationId) { setLoadingStats(false); return; }
      try {
        const rfqQ = query(collection(db, "rfqs"), where("organizationId", "==", user.organizationId));
        const rfqSnap = await getDocs(rfqQ);
        const rfqs = rfqSnap.docs.map((d) => d.data());
        const active = rfqs.filter((r) => ["New", "Active", "Under Review", "Awarded"].includes(r.status)).length;
        let offers = 0;
        for (const rfq of rfqs) {
          const offSnap = await getDocs(query(collection(db, "offers"), where("rfqId", "==", rfqSnap.docs.find((d) => d.data().title === rfq.title)?.id || "")));
          offers += offSnap.size;
        }
        setStats({ totalRfqs: rfqs.length, activeRfqs: active, totalOffers: offers });
      } catch (e) {
        console.warn("[Profile] Stats fetch failed:", e);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [user?.organizationId]);

  const handleSave = async () => {
    if (!user?.organizationId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        companyName: orgName, orgName, city, crNumber,
      });
      await refreshUser();
      setEditing(false);
    } catch {
      Alert.alert(t.common.error, t.profile.saveFailed);
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
    !!organization?.city,
    !!organization?.crNumber,
    !!user?.displayName,
    !!user?.email,
  ];
  const completeness = Math.round((completenessFields.filter(Boolean).length / completenessFields.length) * 100);

  const menuItems = [
    { icon: "users" as const, label: t.profile.teamMembers, onPress: () => router.push("/(contractor)/team") },
    { icon: "bell" as const, label: t.profile.notifications, onPress: () => router.push("/(contractor)/notifications") },
    { icon: "globe" as const, label: isRTL ? "English" : "العربية", onPress: () => setLanguage(isRTL ? "en" : "ar") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.heroHeader,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16) },
        ]}
      >
        <View style={styles.avatarSection}>
          <View style={[styles.avatarRing, { borderColor: colors.textWhite40 }]}>
            <View style={[styles.avatar, { backgroundColor: colors.textWhite12 }]}>
              <Text style={[styles.avatarText, { fontFamily: "HankenGrotesk_700Bold" }]}>
                {organization?.name?.charAt(0)?.toUpperCase() ?? "C"}
              </Text>
            </View>
          </View>
          <Text style={[styles.name, { color: colors.textWhite, fontFamily: "HankenGrotesk_700Bold" }]}>
            {organization?.name ?? user?.displayName}
          </Text>
          <Text style={[styles.email, { color: colors.textWhite60, fontFamily: "Inter_400Regular" }]}>
            {user?.email}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.textWhite12, borderColor: colors.textWhite40, borderWidth: 1 }]}>
            <Text style={[styles.roleText, { color: colors.accentBlueSoft, fontFamily: "Inter_600SemiBold" }]}>
              {t.auth.register.contractor}
            </Text>
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
              {completeness < 60 ? "Complete your profile to get more offers" : "Almost there! Add missing details"}
            </Text>
          )}
        </Card>

        {/* Quick Stats */}
        <Card style={[styles.statsCard, { borderColor: colors.border }]}>
          <View style={[styles.statsRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {[
              { label: "RFQs", value: stats.totalRfqs, icon: "file-text", color: colors.primary },
              { label: "Active", value: stats.activeRfqs, icon: "activity", color: colors.cta },
              { label: "Offers", value: stats.totalOffers, icon: "tag", color: colors.success },
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

        {/* Organization Info */}
        <Card style={[styles.orgCard, { borderColor: colors.border }]}>
          <View style={[styles.cardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.primary + "14" }]}>
                <Feather name="briefcase" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "HankenGrotesk_600SemiBold" }]}>
                {t.profile.organization}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => { if (editing) { setOrgName(organization?.name ?? ""); setCity(organization?.city ?? ""); setCrNumber(organization?.crNumber ?? ""); } setEditing(!editing); }}
              style={[styles.editBtn, { backgroundColor: editing ? colors.accentBlueSoft : colors.muted }]}
            >
              <Feather name={editing ? "check" : "edit-2"} size={15} color={editing ? colors.cta : colors.primary} />
            </TouchableOpacity>
          </View>
          {editing ? (
            <View style={styles.form}>
              <Input label={t.profile.companyName} value={orgName} onChangeText={setOrgName} leftIcon="briefcase" />
              <Input label={t.profile.crNumber} value={crNumber} onChangeText={setCrNumber} leftIcon="hash" placeholder="1234567890" />
              <Input label={t.profile.city} value={city} onChangeText={setCity} leftIcon="map-pin" />
              <Button title={t.common.save} onPress={handleSave} loading={saving} fullWidth />
            </View>
          ) : (
            <View style={styles.infoGrid}>
              {[
                { icon: "briefcase" as const, label: t.profile.companyName, value: organization?.name },
                { icon: "hash" as const, label: t.profile.crNumber, value: organization?.crNumber ?? t.profile.notSet },
                { icon: "map-pin" as const, label: t.profile.city, value: organization?.city ?? user?.city ?? t.profile.notSet },
                { icon: "mail" as const, label: t.auth.login.email, value: user?.email },
              ].map((item) => (
                <View key={item.label} style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.infoIconWrap, { backgroundColor: colors.muted }]}>
                    <Feather name={item.icon} size={14} color={colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoLabel, { color: colors.outline, textAlign: isRTL ? "right" : "left" }]}>{item.label}</Text>
                    <Text style={[styles.infoValue, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1} ellipsizeMode="tail">{item.value ?? "\u2014"}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Menu */}
        <Card style={[styles.menuCard, { borderColor: colors.border }]}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuRow,
                { flexDirection: isRTL ? "row-reverse" : "row" },
                i < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
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
  roleBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, marginTop: 2 },
  roleText: { fontSize: 12 },
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

  // Organization
  orgCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
  cardHeader: { alignItems: "center", justifyContent: "space-between" },
  cardHeaderIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  editBtn: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 16 },
  form: { gap: 12 },
  infoGrid: { gap: 12 },
  infoRow: { alignItems: "center", gap: 12 },
  infoIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 15, fontFamily: "Inter_500Medium" },

  // Menu
  menuCard: { borderRadius: 14, borderWidth: 1, padding: 4 },
  menuRow: { alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: 12 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuLabel: { flex: 1, fontSize: 15 },
});
