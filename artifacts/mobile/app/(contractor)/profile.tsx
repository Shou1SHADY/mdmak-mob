import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, Platform,
  Animated,
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

/* ─── Quick Action Pill ─── */
function QuickActionPill({
  icon, label, color, onPress,
}: {
  icon: keyof typeof Feather.glyphMap; label: string; color: string; onPress: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.pill, { backgroundColor: color + "15", borderColor: color + "30" }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Feather name={icon} size={16} color={color} />
      <Text style={[styles.pillText, { color }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ─── Menu Row ─── */
function MenuRow({
  icon, label, subtitle, color, onPress, isLast, isRTL,
}: {
  icon: keyof typeof Feather.glyphMap; label: string; subtitle?: string; color: string;
  onPress: () => void; isLast?: boolean; isRTL?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[
        styles.menuRow,
        { flexDirection: isRTL ? "row-reverse" : "row" },
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border + "60" },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconBox, { backgroundColor: color + "15" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.menuLabel, { color: colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">
          {label}
        </Text>
        {subtitle && (
          <Text style={[styles.menuSubtitle, { color: colors.outline }]} numberOfLines={1} ellipsizeMode="tail">
            {subtitle}
          </Text>
        )}
      </View>
      <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={colors.outline} />
    </TouchableOpacity>
  );
}

/* ─── Main Screen ─── */
export default function ContractorProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, organization, logout, refreshUser } = useAuth();
  const t = useT();
  const { setLanguage, isRTL, language } = useLanguage();

  const [editing, setEditing] = useState(false);
  const [orgName, setOrgName] = useState(organization?.name ?? "");
  const [city, setCity] = useState(organization?.city ?? "");
  const [crNumber, setCrNumber] = useState(organization?.crNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalRfqs: 0, activeRfqs: 0, totalOffers: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // Fade animation for edit mode
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: editing ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [editing]);

  const fetchStats = useCallback(async () => {
    if (!user?.organizationId) { setLoadingStats(false); return; }
    try {
      const rfqSnap = await getDocs(query(collection(db, "rfqs"), where("organizationId", "==", user.organizationId)));
      const rfqs = rfqSnap.docs;
      const active = rfqs.filter((d) => ["New", "Active", "Under Review", "Awarded"].includes(d.data().status)).length;
      let offers = 0;
      for (const rfqDoc of rfqs) {
        const offSnap = await getDocs(query(collection(db, "offers"), where("rfqId", "==", rfqDoc.id)));
        offers += offSnap.size;
      }
      setStats({ totalRfqs: rfqs.length, activeRfqs: active, totalOffers: offers });
    } catch (e) {
      console.warn("[Profile] Stats fetch failed:", e);
    } finally {
      setLoadingStats(false);
    }
  }, [user?.organizationId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleSave = async () => {
    if (!user?.organizationId) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { companyName: orgName, orgName, city, crNumber });
      await refreshUser();
      setEditing(false);
    } catch {
      Alert.alert(t.common.error, t.profile.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setOrgName(organization?.name ?? "");
    setCity(organization?.city ?? "");
    setCrNumber(organization?.crNumber ?? "");
    setEditing(false);
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
  const missingFields = completenessFields
    .map((v, i) => v ? null : [t.profile.companyName, t.profile.city, t.profile.crNumber, "Name", t.auth.login.email][i])
    .filter(Boolean);

  const initial = (organization?.name ?? user?.displayName ?? "C").trim().charAt(0).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ── */}
      <LinearGradient
        colors={colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 48 : 12) }]}>
        {/* Top bar */}
        <View style={[styles.headerTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Text style={[styles.headerTitle, { color: "#FFFFFF" }]}>{t.profile.title}</Text>
          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: "rgba(255,255,255,0.12)" }]}
            onPress={() => setEditing(!editing)}
            activeOpacity={0.7}
          >
            <Feather name={editing ? "x" : "settings"} size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarRing, { borderColor: "rgba(255,255,255,0.3)" }]}>
            <View style={[styles.avatar, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <Text style={[styles.avatarText, { fontFamily: "HankenGrotesk_700Bold" }]}>{initial}</Text>
            </View>
          </View>
          <Text style={[styles.name, { color: "#FFFFFF" }]} numberOfLines={1} ellipsizeMode="tail">
            {organization?.name ?? user?.displayName}
          </Text>
          <Text style={[styles.email, { color: "rgba(255,255,255,0.6)" }]} numberOfLines={1} ellipsizeMode="tail">
            {user?.email}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.25)" }]}>
              <Feather name="shield" size={10} color="#20CBD5" />
            <Text style={[styles.roleText, { color: "#20CBD5" }]}>{t.auth.register.contractor}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Quick Actions ── */}
      <View style={[styles.quickActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <QuickActionPill icon="file-text" label={t.dashboard.totalRfqs} color={colors.primary} onPress={() => router.push("/(contractor)/rfqs/index")} />
        <QuickActionPill icon="activity" label={t.dashboard.active} color={colors.cta} onPress={() => router.push("/(contractor)/rfqs/index")} />
        <QuickActionPill icon="tag" label={t.dashboard.offersIn} color={colors.success} onPress={() => router.push("/(contractor)/rfqs/index")} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Completeness ── */}
        <Card style={{ borderRadius: 16, borderWidth: 1, borderColor: completeness === 100 ? colors.success + "30" : colors.border }}>
          <View style={[styles.compHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.compIcon, { backgroundColor: completeness === 100 ? colors.success + "15" : colors.accentBlueSoft }]}>
              <Feather name={completeness === 100 ? "check-circle" : "shield"} size={16} color={completeness === 100 ? colors.success : colors.cta} />
            </View>
            <View style={{ flex: 1, marginHorizontal: 10 }}>
              <Text style={[styles.compTitle, { color: colors.foreground }]}>
                {completeness === 100 ? t.common.success : "Profile Completeness"}
              </Text>
              <Text style={[styles.compSubtitle, { color: colors.outline }]}>
                {completeness === 100 ? "Your profile is complete" : `${missingFields.length} fields remaining`}
              </Text>
            </View>
            <Text style={[styles.compPct, { color: completeness === 100 ? colors.success : colors.cta }]}>
              {completeness}%
            </Text>
          </View>
          <View style={[styles.compBar, { backgroundColor: colors.border }]}>
            <View style={[styles.compFill, { width: `${completeness}%`, backgroundColor: completeness === 100 ? colors.success : colors.cta }]} />
          </View>
          {completeness < 100 && (
            <View style={[styles.compMissing, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Feather name="alert-circle" size={12} color={colors.warning} />
              <Text style={[styles.compMissingText, { color: colors.warning }]}>
                {isRTL ? `ناقص: ${missingFields.join("، ")}` : `Missing: ${missingFields.join(", ")}`}
              </Text>
            </View>
          )}
        </Card>

        {/* ── Stats ── */}
        <View style={[styles.statsGrid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {[
            { label: t.dashboard.totalRfqs, value: stats.totalRfqs, icon: "file-text", color: colors.primary, bg: colors.primary + "10" },
            { label: t.dashboard.active, value: stats.activeRfqs, icon: "activity", color: colors.cta, bg: colors.cta + "10" },
            { label: t.dashboard.offersIn, value: stats.totalOffers, icon: "tag", color: colors.success, bg: colors.success + "10" },
          ].map((s) => (
            <Card key={s.label} style={[styles.statCard, { borderColor: s.color + "20" }]}>
              <View style={[styles.statIconBox, { backgroundColor: s.bg }]}>
                <Feather name={s.icon as any} size={18} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {loadingStats ? "—" : s.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.outline }]} numberOfLines={1} ellipsizeMode="tail">{s.label}</Text>
            </Card>
          ))}
        </View>

        {/* ── Organization Info ── */}
        <Card style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
          <View style={[styles.cardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.primary + "12" }]}>
                <Feather name="briefcase" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.profile.organization}</Text>
            </View>
            {!editing && (
              <TouchableOpacity onPress={() => setEditing(true)} style={[styles.editBtn, { backgroundColor: colors.accentBlueSoft }]}>
                <Feather name="edit-2" size={15} color={colors.cta} />
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            <Animated.View style={{ opacity: fadeAnim, gap: 12 }}>
              <Input label={t.profile.companyName} value={orgName} onChangeText={setOrgName} leftIcon="briefcase" />
              <Input label={t.profile.crNumber} value={crNumber} onChangeText={setCrNumber} leftIcon="hash" placeholder="1234567890" />
              <Input label={t.profile.city} value={city} onChangeText={setCity} leftIcon="map-pin" />
              <View style={[styles.editActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Button title={t.common.cancel} variant="outline" onPress={handleCancelEdit} style={{ flex: 1 }} />
                <Button title={t.common.save} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
              </View>
            </Animated.View>
          ) : (
            <View style={{ gap: 8 }}>
              {[
                { icon: "briefcase" as const, label: t.profile.companyName, value: organization?.name },
                { icon: "hash" as const, label: t.profile.crNumber, value: organization?.crNumber ?? t.profile.notSet },
                { icon: "map-pin" as const, label: t.profile.city, value: organization?.city ?? user?.city ?? t.profile.notSet },
                { icon: "mail" as const, label: t.auth.login.email, value: user?.email },
              ].map((item) => (
                <View key={item.label} style={[styles.infoRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.infoIcon, { backgroundColor: colors.muted }]}>
                    <Feather name={item.icon} size={14} color={colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoLabel, { color: colors.outline }]}>{item.label}</Text>
                    <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">{item.value ?? "\u2014"}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* ── Menu ── */}
        <Card style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 6 }}>
          <MenuRow
            icon="users" label={t.profile.teamMembers} color="#0369A1"
            subtitle="Manage team members"
            onPress={() => router.push("/(contractor)/team")}
            isRTL={isRTL}
          />
          <MenuRow
            icon="bell" label={t.profile.notifications} color="#f59e0b"
            subtitle="Notification preferences"
            onPress={() => router.push("/(contractor)/notifications")}
            isRTL={isRTL}
            isLast={false}
          />
          <MenuRow
            icon="globe" label={isRTL ? "English" : "العربية"} color="#22c55e"
            subtitle={isRTL ? "Switch to English" : "التبديل إلى العربية"}
            onPress={() => setLanguage(isRTL ? "en" : "ar")}
            isRTL={isRTL}
            isLast={true}
          />
        </Card>

        {/* ── Sign Out ── */}
        <TouchableOpacity style={[styles.signOutBtn, { borderColor: colors.destructive + "30" }]} onPress={handleLogout} activeOpacity={0.75}>
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>{t.common.signOut}</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.outline }]}>
          Mdmak Tech v1.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  header: { paddingHorizontal: 16, paddingBottom: 24 },
  headerTop: { alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  headerTitle: { fontSize: 17, fontFamily: "HankenGrotesk_600SemiBold" },
  settingsBtn: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  avatarSection: { alignItems: "center", gap: 8 },
  avatarRing: { width: 96, height: 96, borderRadius: 28, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  avatar: { width: 86, height: 86, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 36, color: "#FFFFFF" },
  name: { fontSize: 20, fontFamily: "HankenGrotesk_700Bold", textAlign: "center", marginTop: 4 },
  email: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, marginTop: 4 },
  roleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Quick actions
  quickActions: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 12, marginBottom: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 24, borderWidth: 1.5 },
  pillText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

  // Scroll
  scroll: { padding: 16, gap: 12 },

  // Completeness
  compHeader: { alignItems: "center", marginBottom: 10 },
  compIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  compTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1, marginHorizontal: 10 },
  compSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  compPct: { fontSize: 18, fontFamily: "HankenGrotesk_700Bold" },
  compBar: { height: 5, borderRadius: 3, overflow: "hidden", marginTop: 4 },
  compFill: { height: "100%", borderRadius: 3 },
  compMissing: { alignItems: "center", gap: 6, marginTop: 8 },
  compMissingText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  // Stats grid
  statsGrid: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, alignItems: "center", padding: 14, gap: 6 },
  statIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontFamily: "HankenGrotesk_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase" as const, letterSpacing: 0.3 },

  // Organization
  cardHeader: { alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  cardHeaderIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontFamily: "HankenGrotesk_600SemiBold" },
  editBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  editActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  infoRow: { alignItems: "center", gap: 12, paddingVertical: 8 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 2 },
  infoValue: { fontSize: 15, fontFamily: "Inter_500Medium" },

  // Menu
  menuRow: { alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 10 },
  menuIconBox: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Sign out
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  signOutText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  version: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
});
