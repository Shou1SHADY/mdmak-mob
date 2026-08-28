import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, Platform,
  Animated, Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import type { LegalDoc } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { identityDocRef } from "@/lib/org-identity";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DocumentUploadRow } from "@/components/DocumentUploadRow";
import { router } from "expo-router";
import { ProfileTourGuide, useProfileTour } from "@/components/ProfileTourGuide";

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
  // Company details live on users/{uid} for a solo company but on
  // organizations/{id} for a secondary one — write them wherever they are read.
  const identityRef = () => identityDocRef(user!.uid, user?.organizationId, user?.organizationRole);
  const t = useT();
  const { setLanguage, isRTL, language } = useLanguage();

  const [editing, setEditing] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const orgCardY = useRef(0);
  const [orgName, setOrgName] = useState(organization?.name ?? "");
  const [city, setCity] = useState(organization?.city ?? "");
  const [crNumber, setCrNumber] = useState(organization?.crNumber ?? "");
  const [taxNumber, setTaxNumber] = useState(organization?.taxNumber ?? "");
  const [phone, setPhone] = useState(organization?.phone ?? user?.phone ?? "");
  const [location, setLocation] = useState(organization?.location ?? "");
  const [website, setWebsite] = useState(organization?.website ?? "");
  const [description, setDescription] = useState(organization?.description ?? "");
  const [documents, setDocuments] = useState<Record<string, LegalDoc>>(organization?.documents ?? {});
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalRfqs: 0, activeRfqs: 0, totalOffers: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const scrollRef = useRef<ScrollView>(null);
  const docsY = useRef(0);
  const { showTour, markTourSeen } = useProfileTour();

  // Sync documents when organization loads (auth may finish after mount)
  useEffect(() => {
    if (organization?.documents) setDocuments(organization.documents);
  }, [organization?.documents]);

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
    const isProfileComplete = !!(orgName?.trim() && (phone?.trim()) && crNumber?.trim() && taxNumber?.trim() && city?.trim() && location?.trim());
    try {
      await updateDoc(identityRef(), {
        companyName: orgName, orgName, city, crNumber,
        taxNumber, phone, location, website, description,
        profileCompleted: isProfileComplete,
      });
      await refreshUser();
      setEditing(false);
    } catch {
      Alert.alert(t.common.error, t.profile.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleDocUpdate = async (docType: string, data: LegalDoc) => {
    const updated = { ...documents, [docType]: data };
    setDocuments(updated);
    if (user?.uid) {
      try {
        await updateDoc(identityRef(), { documents: updated });
      } catch {
        Alert.alert(t.common.error, t.profile.saveFailed);
      }
    }
  };

  const openEditMode = () => {
    setShowActions(false);
    // Wait for modal close animation (~300ms) before scrolling + opening form
    setTimeout(() => {
      setEditing(true);
      // Then wait one frame for the form to render and expand the card
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: orgCardY.current - 24, animated: true });
      }, 80);
    }, 320);
  };

  const handleCancelEdit = () => {
    setOrgName(organization?.name ?? "");
    setCity(organization?.city ?? "");
    setCrNumber(organization?.crNumber ?? "");
    setTaxNumber(organization?.taxNumber ?? "");
    setPhone(organization?.phone ?? user?.phone ?? "");
    setLocation(organization?.location ?? "");
    setWebsite(organization?.website ?? "");
    setDescription(organization?.description ?? "");
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

  // Profile completeness — matches web 8-field formula
  const completenessChecks = [
    { ok: !!organization?.name,                        label: t.profile.companyName },
    { ok: !!(organization?.phone ?? user?.phone),      label: t.profile.phone },
    { ok: !!organization?.crNumber,                    label: t.profile.crNumber },
    { ok: !!organization?.taxNumber,                   label: t.profile.taxNumber },
    { ok: !!organization?.city,                        label: t.profile.city },
    { ok: !!organization?.location,                    label: t.profile.location },
    { ok: !!organization?.documents?.cr?.url,          label: t.profile.docCR },
    { ok: !!organization?.documents?.vat?.url,         label: t.profile.docVAT },
  ];
  const completeness = Math.round((completenessChecks.filter((c) => c.ok).length / completenessChecks.length) * 100);
  const missingFields = completenessChecks.filter((c) => !c.ok).map((c) => c.label);

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
            onPress={() => setShowActions(true)}
            activeOpacity={0.7}
          >
            <Feather name="more-vertical" size={18} color="#FFFFFF" />
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
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 82 }]}
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
                {completeness === 100 ? t.common.success : t.profile.completenessTitle}
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
            <View style={{ gap: 8, marginTop: 4 }}>
              <Text style={[styles.compMissingText, { color: colors.warning, textAlign: isRTL ? "right" : "left" }]}>
                {t.profile.gateMissing}
              </Text>
              <View style={[styles.compChips, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                {completenessChecks.filter((c) => !c.ok).map((c) => (
                  <View key={c.label} style={[styles.compChip, { backgroundColor: colors.destructive + "10", borderColor: colors.destructive + "30" }]}>
                    <Feather name="alert-circle" size={10} color={colors.destructive} />
                    <Text style={[styles.compChipText, { color: colors.destructive }]} numberOfLines={1}>{c.label}</Text>
                  </View>
                ))}
              </View>
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
        <View onLayout={(e) => { orgCardY.current = e.nativeEvent.layout.y; }}>
        <Card style={{ borderRadius: 16, borderWidth: 1, borderColor: editing ? colors.cta + "60" : colors.border }}>
          <View style={[styles.cardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.primary + "12" }]}>
                <Feather name="briefcase" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.profile.organization}</Text>
            </View>
            {!editing && (
              <TouchableOpacity onPress={openEditMode} style={[styles.editBtn, { backgroundColor: colors.accentBlueSoft }]}>
                <Feather name="edit-2" size={15} color={colors.cta} />
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            <Animated.View style={{ opacity: fadeAnim, gap: 12 }}>
              <Input label={t.profile.companyName} value={orgName} onChangeText={setOrgName} leftIcon="briefcase" isRTL={isRTL} />
              <Input label={t.profile.crNumber} value={crNumber} onChangeText={setCrNumber} leftIcon="hash" placeholder="1234567890" isRTL={isRTL} />
              <Input label={t.profile.taxNumber} value={taxNumber} onChangeText={setTaxNumber} leftIcon="file-text" placeholder="300XXXXXXXXX" isRTL={isRTL} keyboardType="numeric" />
              <Input label={t.profile.phone} value={phone} onChangeText={setPhone} leftIcon="phone" keyboardType="phone-pad" isRTL={isRTL} />
              <Input label={t.profile.city} value={city} onChangeText={setCity} leftIcon="map-pin" isRTL={isRTL} />
              <Input label={t.profile.location} value={location} onChangeText={setLocation} leftIcon="navigation" placeholder={t.profile.locationPlaceholder} isRTL={isRTL} />
              <Input label={`${t.profile.website} (${t.common.optional})`} value={website} onChangeText={setWebsite} leftIcon="globe" placeholder={t.profile.websitePlaceholder} autoCapitalize="none" isRTL={isRTL} />
              <Input label={`${t.profile.description} (${t.common.optional})`} value={description} onChangeText={setDescription} leftIcon="align-left" placeholder={t.profile.descriptionPlaceholder} multiline isRTL={isRTL} />
              <View style={[styles.editActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Button title={t.common.cancel} variant="outline" onPress={handleCancelEdit} style={{ flex: 1 }} />
                <Button title={t.common.save} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
              </View>
            </Animated.View>
          ) : (
            <View style={{ gap: 4 }}>
              {[
                { icon: "briefcase" as const, label: t.profile.companyName,  value: organization?.name,                      required: true },
                { icon: "hash" as const,      label: t.profile.crNumber,      value: organization?.crNumber,                  required: true },
                { icon: "file-text" as const, label: t.profile.taxNumber,     value: organization?.taxNumber,                 required: true },
                { icon: "phone" as const,     label: t.profile.phone,         value: organization?.phone ?? user?.phone,      required: true },
                { icon: "map-pin" as const,   label: t.profile.city,          value: organization?.city ?? user?.city,        required: true },
                { icon: "navigation" as const,label: t.profile.location,      value: organization?.location,                  required: true },
                { icon: "globe" as const,     label: t.profile.website,       value: organization?.website,                   required: false },
                { icon: "mail" as const,      label: t.auth.login.email,      value: user?.email,                             required: false },
              ].filter((item) => item.value || item.required).map((item, idx, arr) => {
                const isEmpty = !item.value && item.required;
                const isLast = idx === arr.length - 1;
                return (
                  <React.Fragment key={item.label}>
                    <TouchableOpacity
                      style={[
                        styles.infoRow,
                        { flexDirection: isRTL ? "row-reverse" : "row" },
                        isEmpty && [styles.infoRowEmpty, { borderColor: colors.warning + "40", backgroundColor: colors.warning + "08" }],
                      ]}
                      onPress={() => isEmpty ? setEditing(true) : undefined}
                      activeOpacity={isEmpty ? 0.7 : 1}
                    >
                      <View style={[styles.infoIcon, { backgroundColor: isEmpty ? colors.warning + "18" : colors.muted }]}>
                        <Feather name={item.icon} size={15} color={isEmpty ? colors.warning : colors.secondary} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.infoLabel, { color: colors.outline, textAlign: isRTL ? "right" : "left" }]}>
                          {item.label}
                        </Text>
                        {item.value ? (
                          <Text style={[styles.infoValue, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1} ellipsizeMode="tail">
                            {item.value}
                          </Text>
                        ) : (
                          <Text style={[styles.infoEmpty, { color: colors.warning, textAlign: isRTL ? "right" : "left" }]}>
                            {isRTL ? "اضغط للإضافة" : "Tap to add"}
                          </Text>
                        )}
                      </View>
                      {isEmpty ? (
                        <Feather name="edit-2" size={14} color={colors.warning} style={{ opacity: 0.7 }} />
                      ) : (
                        item.value && <Feather name="check" size={14} color={colors.success} style={{ opacity: 0.6 }} />
                      )}
                    </TouchableOpacity>
                    {!isLast && <View style={[styles.infoSep, { backgroundColor: colors.border }]} />}
                  </React.Fragment>
                );
              })}
            </View>
          )}
        </Card>
        </View>

        {/* ── Legal Documents ── */}
        <View onLayout={(e) => { docsY.current = e.nativeEvent.layout.y; }}>
        <Card style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
          <View style={[styles.cardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.warning + "18" }]}>
                <Feather name="folder" size={16} color={colors.warning} />
              </View>
              <View>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.profile.documents}</Text>
                <Text style={[{ fontSize: 11, fontFamily: "Inter_400Regular", color: colors.outline, marginTop: 1 }]}>
                  {t.profile.documentsDesc}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ gap: 8 }}>
            {[
              { type: "cr",  label: t.profile.docCR,  required: true },
              { type: "vat", label: t.profile.docVAT, required: true },
            ].map((d) => (
              <DocumentUploadRow
                key={d.type}
                docType={d.type}
                label={d.label}
                required={d.required}
                doc={documents[d.type]}
                orgId={user?.organizationId ?? ""}
                onUpdate={handleDocUpdate}
              />
            ))}
          </View>
        </Card>
        </View>

        {/* ── Menu ── */}
        <Card style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 6 }}>
          <MenuRow
            icon="users" label={t.profile.teamMembers} color="#0369A1"
            subtitle={t.profile.manageTeam}
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

      {/* ── Settings Action Sheet ── */}
      <Modal visible={showActions} transparent animationType="slide" onRequestClose={() => setShowActions(false)}>
        <View style={styles.actionRoot}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setShowActions(false)} />
          <View style={[styles.actionSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.actionHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.actionTitle, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>
              {isRTL ? "الإعدادات" : "Settings"}
            </Text>

            {/* Edit Profile */}
            <TouchableOpacity style={[styles.actionRow, { borderBottomColor: colors.border }]} onPress={openEditMode} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: colors.cta + "15" }]}>
                <Feather name="edit-2" size={18} color={colors.cta} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionLabel, { color: colors.foreground }]}>
                  {isRTL ? "تعديل الملف الشخصي" : "Edit Profile"}
                </Text>
                <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>
                  {isRTL ? "تحديث بيانات شركتك" : "Update your company info"}
                </Text>
              </View>
              <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={colors.outline} />
            </TouchableOpacity>

            {/* Language */}
            <TouchableOpacity
              style={[styles.actionRow, { borderBottomColor: colors.border }]}
              onPress={() => { setLanguage(isRTL ? "en" : "ar"); setShowActions(false); }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.success + "15" }]}>
                <Feather name="globe" size={18} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionLabel, { color: colors.foreground }]}>
                  {isRTL ? "English" : "العربية"}
                </Text>
                <Text style={[styles.actionSub, { color: colors.mutedForeground }]}>
                  {isRTL ? "Switch to English" : "التبديل إلى العربية"}
                </Text>
              </View>
              <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={colors.outline} />
            </TouchableOpacity>

            {/* Sign Out */}
            <TouchableOpacity
              style={[styles.actionRow, { borderBottomWidth: 0 }]}
              onPress={() => { setShowActions(false); setTimeout(handleLogout, 300); }}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.destructive + "12" }]}>
                <Feather name="log-out" size={18} color={colors.destructive} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionLabel, { color: colors.destructive }]}>
                  {t.common.signOut}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={{ height: insets.bottom + 8 }} />
          </View>
        </View>
      </Modal>

      <ProfileTourGuide
        visible={showTour}
        onDismiss={markTourSeen}
        onScrollTo={(sectionIndex) => {
          if (sectionIndex === 1) {
            scrollRef.current?.scrollTo({ y: docsY.current, animated: true });
          } else {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          }
        }}
      />
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
  compMissingText: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  compChips: { flexWrap: "wrap", gap: 6 },
  compChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  compChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Stats grid
  statsGrid: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, alignItems: "center", padding: 14, gap: 6 },
  statIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontFamily: "HankenGrotesk_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase" as const },

  // Organization
  cardHeader: { alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  cardHeaderIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontFamily: "HankenGrotesk_600SemiBold" },
  editBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  editActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  infoRow: { alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 10, borderWidth: 0 },
  infoRowEmpty: { borderWidth: 1, borderStyle: "dashed" as const, paddingHorizontal: 10, borderRadius: 10 },
  infoIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" as const },
  infoValue: { fontSize: 15, fontFamily: "Inter_500Medium" },
  infoEmpty: { fontSize: 14, fontFamily: "Inter_400Regular" },
  infoSep: { height: StyleSheet.hairlineWidth, marginLeft: 54 },

  // Menu
  menuRow: { alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 10 },
  menuIconBox: { width: 40, height: 40, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  menuSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },

  // Action sheet
  actionRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  actionSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 16, paddingTop: 8 },
  actionHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  actionTitle: { fontSize: 16, marginBottom: 12, paddingHorizontal: 4 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  actionIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  actionSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Sign out
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  signOutText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  version: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
});
