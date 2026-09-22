import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, Platform,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { updateDoc, deleteField, collection, query, where, getDocs } from "firebase/firestore";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { headerTopPadding, tabScreenBottomPadding } from "@/lib/layout";
import { useAuth } from "@/context/AuthContext";
import type { LegalDoc } from "@/context/AuthContext";
import { useT, useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { identityDocRef } from "@/lib/org-identity";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DocumentUploadRow } from "@/components/DocumentUploadRow";
import { router } from "expo-router";
import Constants from "expo-constants";
import { CATEGORIES, SAUDI_CITIES, displayCity, displayCategory, normalizeCategoryToAr } from "@/constants/data";
import { ProfileTourGuide, useProfileTour } from "@/components/ProfileTourGuide";
import { OFFER_STATUS } from "@/constants/data";
import { useSupplierOrders } from "@/hooks/useSupplierOrders";
import { asSupplierSees } from "@/lib/procurement/supplier";

/* ─── Quick Action Pill ─── */
/* ─── Menu Row ─── */
function MenuRow({
  icon, label, subtitle, color, onPress, isLast, isRTL,
}: {
  icon: keyof typeof Feather.glyphMap; label: string; subtitle?: string; color: string;
  onPress: () => void; isLast?: boolean; isRTL?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity accessibilityRole="button"
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
export default function SupplierProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { setLanguage, isRTL } = useLanguage();
  const { user, organization, logout, refreshUser } = useAuth();
  // Company details live on users/{uid} for a solo company but on
  // organizations/{id} for a secondary one — write them wherever they are read.
  const identityRef = () => identityDocRef(user!.uid, user?.organizationId, user?.organizationRole);

  const [editingSpecs, setEditingSpecs] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  // Editing starts from what the supplier last asked for (pending), else the
  // approved set — the same choice the website's profile page makes. Values
  // are normalised to the canonical Arabic names the website stores; an older
  // build of this app saved the English labels.
  const draftSpecs = () =>
    (organization?.pendingSpecializations ?? organization?.specializations ?? []).map(normalizeCategoryToAr);
  const draftAreas = () => organization?.pendingCoverageCities ?? organization?.coverageCities ?? [];
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>(draftSpecs);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(draftAreas);

  const [orgName, setOrgName] = useState(organization?.name ?? "");
  const [crNumber, setCrNumber] = useState(organization?.crNumber ?? "");
  const [taxNumber, setTaxNumber] = useState(organization?.taxNumber ?? "");
  const [phone, setPhone] = useState(organization?.phone ?? user?.phone ?? "");
  const [city, setCity] = useState(organization?.city ?? "");
  const [location, setLocation] = useState(organization?.location ?? "");
  const [website, setWebsite] = useState(organization?.website ?? "");
  const [description, setDescription] = useState(organization?.description ?? "");
  const [documents, setDocuments] = useState<Record<string, LegalDoc>>(organization?.documents ?? {});

  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ totalOffers: 0, activeRfqs: 0 });
  const [awardFacts, setAwardFacts] = useState<{ status?: string | null; poId?: string | null; awaitingOrderApproval?: boolean | null }[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  const scrollRef = useRef<ScrollView>(null);
  const docsY = useRef(0);
  const { showTour, markTourSeen } = useProfileTour();

  // Sync documents when organization loads (auth may finish after mount)
  useEffect(() => {
    if (organization?.documents) setDocuments(organization.documents);
  }, [organization?.documents]);

  // Auth may resolve after mount; refresh the drafts when the record arrives,
  // but never under the supplier's fingers mid-edit.
  useEffect(() => {
    if (editingSpecs) return;
    setSelectedSpecs(draftSpecs());
    setSelectedAreas(draftAreas());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization]);

  const fadeAnim = useState(new Animated.Value(0))[0];
  const infoFadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(infoFadeAnim, {
      toValue: editingInfo ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [editingInfo]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: editingSpecs ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [editingSpecs]);

  const fetchStats = useCallback(async () => {
    if (!user?.organizationId) { setLoadingStats(false); return; }
    try {
      const offQ = query(collection(db, "offers"), where("organizationId", "==", user.organizationId));
      const offSnap = await getDocs(offQ);
      const offers = offSnap.docs.map((d) => d.data());
      setAwardFacts(offers.map((o) => ({ status: o.status, poId: o.poId ?? null, awaitingOrderApproval: o.awaitingOrderApproval ?? null })));
      setStats({ totalOffers: offers.length, activeRfqs: 0 });
    } catch (e) {
      if (__DEV__) console.warn("[Profile] Stats fetch failed:", e);
    } finally {
      setLoadingStats(false);
    }
  }, [user?.organizationId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // "Accepted" here means accepted as far as this supplier may know. An award
  // whose purchase order Finance has not yet approved and sent is still the
  // buyer's own decision, so it does not count towards the win rate either.
  const { ordersById, ready: ordersReady } = useSupplierOrders(user?.organizationId);
  const acceptedOffers = useMemo(
    () => asSupplierSees(awardFacts, ordersById).filter((o) => o.status === OFFER_STATUS.ACCEPTED).length,
    [awardFacts, ordersById]
  );

  const toggleSpec = (spec: string) => {
    setSelectedSpecs((prev) => prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]);
  };
  const toggleArea = (area: string) => {
    setSelectedAreas((prev) => prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]);
  };

  const handleSaveInfo = async () => {
    if (!user?.uid) return;
    setSaving(true);
    const isProfileComplete = !!(orgName?.trim() && phone?.trim() && crNumber?.trim() && taxNumber?.trim() && city?.trim() && location?.trim());
    try {
      await updateDoc(identityRef(), {
        companyName: orgName, crNumber,
        // The website reads `phone` and its SMS routes fall back to
        // `phoneNumber`; write both so a number entered here is found either way.
        taxNumber, phone, phoneNumber: phone, city, location, website, description,
        profileCompleted: isProfileComplete,
      });
      await refreshUser();
      setEditingInfo(false);
    } catch {
      Alert.alert(t.common.error, t.profile.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelInfo = () => {
    setOrgName(organization?.name ?? "");
    setCrNumber(organization?.crNumber ?? "");
    setTaxNumber(organization?.taxNumber ?? "");
    setPhone(organization?.phone ?? user?.phone ?? "");
    setCity(organization?.city ?? "");
    setLocation(organization?.location ?? "");
    setWebsite(organization?.website ?? "");
    setDescription(organization?.description ?? "");
    setEditingInfo(false);
  };

  const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

  // Specializations and coverage cities go live only after Mdmak approves
  // them: firestore.rules rejects a supplier's write to the live fields, so
  // edits land on pending* exactly as they do on the website, and an admin
  // copies them across. Reverting to the approved set withdraws the request
  // instead of re-submitting it.
  const handleSave = async () => {
    if (!user?.organizationId) return;
    setSaving(true);
    try {
      const approvedSpecsNow = (organization?.specializations ?? []).map(normalizeCategoryToAr);
      const approvedAreasNow = organization?.coverageCities ?? [];
      await updateDoc(identityRef(), {
        pendingSpecializations: sameSet(selectedSpecs, approvedSpecsNow) ? deleteField() : selectedSpecs,
        pendingCoverageCities: sameSet(selectedAreas, approvedAreasNow) ? deleteField() : selectedAreas,
      });
      await refreshUser();
      setEditingSpecs(false);
    } catch {
      Alert.alert(t.common.error, t.profile.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setSelectedSpecs(draftSpecs());
    setSelectedAreas(draftAreas());
    setEditingSpecs(false);
  };

  const handleDocUpdate = async (docType: string, data: LegalDoc) => {
    const updated = { ...documents, [docType]: data };
    setDocuments(updated);
    if (user?.uid) {
      try {
        // The website's field. `documents` was this app's own name for it,
        // and nothing on the website ever read it.
        await updateDoc(identityRef(), { legalDocuments: updated });
      } catch {
        Alert.alert(t.common.error, t.profile.saveFailed);
      }
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

  // Profile completeness — matches web 9-field formula
  const completenessChecks = [
    { ok: !!organization?.name,                                  label: t.profile.companyName },
    { ok: !!(organization?.phone ?? user?.phone),                label: t.profile.phone },
    { ok: !!organization?.crNumber,                              label: t.profile.crNumber },
    { ok: !!organization?.taxNumber,                             label: t.profile.taxNumber },
    { ok: !!organization?.city,                                  label: t.profile.city },
    { ok: !!organization?.location,                              label: t.profile.location },
    { ok: (organization?.specializations?.length ?? 0) > 0 || (organization?.pendingSpecializations?.length ?? 0) > 0, label: t.supplierProfile.specializations },
    { ok: !!organization?.documents?.cr?.url,                    label: t.profile.docCR },
    { ok: !!organization?.documents?.vat?.url,                   label: t.profile.docVAT },
  ];
  const completeness = Math.round((completenessChecks.filter((c) => c.ok).length / completenessChecks.length) * 100);
  const missingFields = completenessChecks.filter((c) => !c.ok).map((c) => c.label);

  const initial = (organization?.name ?? user?.displayName ?? "S").trim().charAt(0).toUpperCase();
  const approvedSpecs = organization?.specializations ?? [];
  const approvedAreas = organization?.coverageCities ?? [];
  const hasPending =
    organization?.pendingSpecializations != null || organization?.pendingCoverageCities != null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ── */}
      <LinearGradient
        colors={colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: headerTopPadding(insets.top, 12) }]}>
        {/* Top bar */}
        <View style={[styles.headerTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Text style={[styles.headerTitle, { color: colors.textWhite }]}>{t.profile.title}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={editingSpecs ? t.common.cancel : t.a11y.edit}
            style={[styles.settingsBtn, { backgroundColor: colors.textWhite12 }]}
            onPress={() => setEditingSpecs(!editingSpecs)}
            activeOpacity={0.7}
          >
            <Feather name={editingSpecs ? "x" : "edit-2"} size={18} color={colors.textWhite} />
          </TouchableOpacity>
        </View>

        {/* Avatar + name */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarRing, { borderColor: colors.textWhite40 }]}>
            <View style={[styles.avatar, { backgroundColor: colors.textWhite12 }]}>
              <Text style={[styles.avatarText, { fontFamily: "Inter_600SemiBold", color: colors.textWhite }]}>{initial}</Text>
            </View>
          </View>
          <Text style={[styles.name, { color: colors.textWhite }]} numberOfLines={1} ellipsizeMode="tail">
            {organization?.name ?? user?.displayName}
          </Text>
          <Text style={[styles.email, { color: colors.textWhite60 }]} numberOfLines={1} ellipsizeMode="tail">
            {user?.email}
          </Text>
          <View style={styles.badges}>
            <View style={[styles.roleBadge, { backgroundColor: colors.textWhite12, borderColor: colors.textWhite40 }]}>
              <Feather name="truck" size={10} color={colors.accent} />
              <Text style={[styles.roleText, { color: colors.accent }]}>{t.auth.register.supplier}</Text>
            </View>
            {organization?.verified && (
              <View style={[styles.verifiedBadge, { backgroundColor: colors.textWhite12, borderColor: "rgba(255,255,255,0.2)" }]}>
                <Feather name="check-circle" size={12} color={colors.textWhite} />
                <Text style={[styles.verifiedText, { color: colors.textWhite }]}>{t.supplierProfile.verified}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* ── Quick Actions ── */}

      <ScrollView keyboardShouldPersistTaps="handled"
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: tabScreenBottomPadding(insets.bottom) }]}
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
                {completeness === 100 ? t.profile.profileComplete : `${missingFields.length} ${t.profile.fieldsRemaining}`}
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

        {/* ── Quick Stats ── */}
        {/*
          One row, with the numbers on it.

          A row of label-only pills used to sit above these cards, carrying the
          same three icons, labels and colours and sending all three to the same
          screen — so the screen showed each statistic twice, and the copy shown
          first was the half without the value on it. The cards absorbed the tap
          targets; the pills are gone.
        */}
        <View style={[styles.statsGrid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {[
            { label: t.dashboard.myOffers, value: stats.totalOffers, icon: "tag", color: colors.primaryText, bg: colors.primaryText + "10" },
            { label: t.dashboard.accepted, value: acceptedOffers, icon: "check-circle", color: colors.success, bg: colors.success + "10" },
            { label: t.dashboard.pending, value: stats.totalOffers > 0 ? Math.round((acceptedOffers / stats.totalOffers) * 100) + "%" : "0%", icon: "percent", color: colors.cta, bg: colors.cta + "10" },
          ].map((s) => (
            <TouchableOpacity
              key={s.label}
              style={{ flex: 1 }}
              onPress={() => router.push("/(supplier)/offers")}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`${s.label}: ${loadingStats || !ordersReady ? "—" : s.value}`}
            >
            <Card style={[styles.statCard, { borderColor: s.color + "20" }]}>
              <View style={[styles.statIconBox, { backgroundColor: s.bg }]}>
                <Feather name={s.icon as any} size={18} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {loadingStats || !ordersReady ? "—" : s.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.outline }]} numberOfLines={1} ellipsizeMode="tail">{s.label}</Text>
            </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Organization Info ── */}
        <Card style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
          <View style={[styles.cardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.primaryText + "12" }]}>
                <Feather name="briefcase" size={16} color={colors.primaryText} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.profile.organization}</Text>
            </View>
            {!editingInfo && (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t.a11y.edit} onPress={() => setEditingInfo(true)} style={[styles.editBtn, { backgroundColor: colors.accentBlueSoft }]}>
                <Feather name="edit-2" size={15} color={colors.cta} />
              </TouchableOpacity>
            )}
          </View>

          {editingInfo ? (
            <Animated.View style={{ opacity: infoFadeAnim, gap: 12 }}>
              <Input label={t.profile.companyName} value={orgName} onChangeText={setOrgName} leftIcon="briefcase" isRTL={isRTL} />
              <Input label={t.profile.crNumber} value={crNumber} onChangeText={setCrNumber} leftIcon="hash" placeholder="1234567890" isRTL={isRTL} />
              <Input label={t.profile.taxNumber} value={taxNumber} onChangeText={setTaxNumber} leftIcon="file-text" placeholder="300XXXXXXXXX" isRTL={isRTL} keyboardType="numeric" />
              <Input label={t.profile.phone} value={phone} onChangeText={setPhone} leftIcon="phone" keyboardType="phone-pad" isRTL={isRTL} />
              <Input label={t.profile.city} value={city} onChangeText={setCity} leftIcon="map-pin" isRTL={isRTL} />
              <Input label={t.profile.location} value={location} onChangeText={setLocation} leftIcon="navigation" placeholder={t.profile.locationPlaceholder} isRTL={isRTL} />
              <Input label={`${t.profile.website} (${t.common.optional})`} value={website} onChangeText={setWebsite} leftIcon="globe" placeholder={t.profile.websitePlaceholder} autoCapitalize="none" isRTL={isRTL} />
              <Input label={`${t.profile.description} (${t.common.optional})`} value={description} onChangeText={setDescription} leftIcon="align-left" placeholder={t.profile.descriptionPlaceholder} multiline isRTL={isRTL} />
              <View style={[styles.editActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Button title={t.common.cancel} variant="outline" onPress={handleCancelInfo} style={{ flex: 1 }} />
                <Button title={t.common.save} onPress={handleSaveInfo} loading={saving} style={{ flex: 1 }} />
              </View>
            </Animated.View>
          ) : (
            <View style={{ gap: 8 }}>
              {[
                { icon: "briefcase" as const, label: t.profile.companyName,  value: organization?.name,                      required: true },
                { icon: "hash" as const,      label: t.profile.crNumber,      value: organization?.crNumber,                  required: true },
                { icon: "file-text" as const, label: t.profile.taxNumber,     value: organization?.taxNumber,                 required: true },
                { icon: "phone" as const,     label: t.profile.phone,         value: organization?.phone ?? user?.phone,      required: true },
                { icon: "map-pin" as const,   label: t.profile.city,          value: organization?.city ?? user?.city,        required: true },
                { icon: "navigation" as const,label: t.profile.location,      value: organization?.location,                  required: true },
                { icon: "globe" as const,     label: t.profile.website,       value: organization?.website,                   required: false },
                { icon: "mail" as const,      label: t.auth.login.email,      value: user?.email,                             required: false },
              ].filter((item) => item.value || item.required).map((item) => (
                <TouchableOpacity accessibilityRole="button"
                  key={item.label}
                  style={[
                    styles.infoRow,
                    {
                      flexDirection: isRTL ? "row-reverse" : "row",
                      backgroundColor: (!item.value && item.required) ? colors.destructive + "06" : "transparent",
                      borderRadius: 12,
                      borderWidth: (!item.value && item.required) ? 1 : 0,
                      borderColor: (!item.value && item.required) ? colors.destructive + "25" : "transparent",
                    },
                  ]}
                  onPress={() => !item.value && item.required ? setEditingInfo(true) : undefined}
                  activeOpacity={item.value ? 1 : 0.7}
                >
                  <View style={[styles.infoIcon, { backgroundColor: (!item.value && item.required) ? colors.destructive + "12" : colors.muted }]}>
                    <Feather name={item.icon} size={14} color={(!item.value && item.required) ? colors.destructive : colors.secondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoLabel, { color: colors.outline, textAlign: isRTL ? "right" : "left" }]}>{item.label}</Text>
                    {item.value ? (
                      <Text style={[styles.infoValue, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1} ellipsizeMode="tail">{item.value}</Text>
                    ) : (
                      <Text style={[styles.infoValue, { color: colors.destructive, textAlign: isRTL ? "right" : "left" }]}>
                        {t.profile.requiredTapToFill}
                      </Text>
                    )}
                  </View>
                  {!item.value && item.required && (
                    <View style={[styles.requiredBadge, { backgroundColor: colors.destructive + "15" }]}>
                      <Text style={[styles.requiredBadgeText, { color: colors.destructive }]}>{t.profile.required}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

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
                <Text style={[{ fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular", color: colors.outline, marginTop: 1 }]}>
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

        {/* ── Specializations ── */}
        <Card style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
          <View style={[styles.cardHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
              <View style={[styles.cardHeaderIcon, { backgroundColor: colors.tealAccent + "20" }]}>
                <Feather name="layers" size={16} color={colors.tealAccent} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.supplierProfile.specializations}</Text>
            </View>
            {!editingSpecs && (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t.a11y.edit} onPress={() => setEditingSpecs(true)} style={[styles.editBtn, { backgroundColor: colors.accentBlueSoft }]}>
                <Feather name="edit-2" size={15} color={colors.cta} />
              </TouchableOpacity>
            )}
          </View>

          {editingSpecs ? (
            <Animated.View style={{ opacity: fadeAnim, gap: 14 }}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>{t.supplierProfile.selectCategories}</Text>
              <View style={styles.chipsGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.chip, {
                      borderColor: selectedSpecs.includes(cat.labelAr) ? colors.primaryText : colors.border,
                      backgroundColor: selectedSpecs.includes(cat.labelAr) ? colors.primaryText + "15" : "transparent",
                    }]}
                    onPress={() => toggleSpec(cat.labelAr)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selectedSpecs.includes(cat.labelAr) }}
                  >
                    <Text style={[styles.chipText, { color: selectedSpecs.includes(cat.labelAr) ? colors.primaryText : colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">{isRTL ? cat.labelAr : cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>{t.supplierProfile.serviceAreas}:</Text>
              <View style={styles.chipsGrid}>
                {SAUDI_CITIES.map((cityAr) => (
                  <TouchableOpacity accessibilityRole="button"
                    key={cityAr}
                    style={[styles.chip, {
                      borderColor: selectedAreas.includes(cityAr) ? colors.primaryText : colors.border,
                      backgroundColor: selectedAreas.includes(cityAr) ? colors.primaryText + "15" : "transparent",
                    }]}
                    onPress={() => toggleArea(cityAr)}
                  >
                    <Text style={[styles.chipText, { color: selectedAreas.includes(cityAr) ? colors.primaryText : colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">{displayCity(cityAr, isRTL)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[styles.editActions, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Button title={t.common.cancel} variant="outline" onPress={handleCancelEdit} style={{ flex: 1 }} />
                <Button title={t.common.save} onPress={handleSave} loading={saving} style={{ flex: 1 }} />
              </View>
            </Animated.View>
          ) : (
            <View style={{ gap: 12 }}>
              {hasPending && (
                <View style={[styles.pendingBox, { backgroundColor: colors.warning + "12", borderColor: colors.warning + "40" }]}>
                  <View style={[styles.pendingHead, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Feather name="clock" size={14} color={colors.warning} />
                    <Text style={[styles.pendingTitle, { color: colors.warning, textAlign: isRTL ? "right" : "left" }]}>{t.supplierProfile.pendingApproval}</Text>
                  </View>
                  <Text style={[styles.pendingHint, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>{t.supplierProfile.pendingHint}</Text>
                  <View style={styles.chipsGrid}>
                    {(organization?.pendingSpecializations ?? []).map((spec, i) => (
                      <View key={`ps-${i}`} style={[styles.chip, { borderColor: colors.warning + "60", backgroundColor: "transparent" }]}>
                        <Text style={[styles.chipText, { color: colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">{displayCategory(spec, isRTL)}</Text>
                      </View>
                    ))}
                    {(organization?.pendingCoverageCities ?? []).map((area, i) => (
                      <View key={`pc-${i}`} style={[styles.areaChip, { backgroundColor: colors.warning + "1A" }]}>
                        <Feather name="map-pin" size={10} color={colors.warning} />
                        <Text style={[styles.areaChipText, { color: colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">{displayCity(area, isRTL)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {approvedSpecs.length > 0 ? (
                <View style={styles.chipsGrid}>
                  {approvedSpecs.map((spec, i) => (
                    <View key={i} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                      <Text style={[styles.chipText, { color: colors.mutedForeground }]} numberOfLines={1} ellipsizeMode="tail">{displayCategory(spec, isRTL)}</Text>
                    </View>
                  ))}
                </View>
              ) : !hasPending ? (
                <View style={[styles.emptyState, { backgroundColor: colors.muted + "40" }]}>
                  <Feather name="layers" size={20} color={colors.outline} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{t.supplierProfile.noSpecializations}</Text>
                  <TouchableOpacity onPress={() => setEditingSpecs(true)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
                    <Text style={[styles.emptyAction, { color: colors.cta }]}>{t.supplierProfile.editSpecializations}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {approvedAreas.length > 0 && (
                <View style={{ gap: 6 }}>
                  <Text style={[styles.subLabel, { color: colors.outline }]}>{t.supplierProfile.serviceAreas}</Text>
                  <View style={styles.chipsGrid}>
                    {approvedAreas.map((area, i) => (
                      <View key={i} style={[styles.areaChip, { backgroundColor: colors.accentBlueSoft }]}>
                        <Feather name="map-pin" size={10} color={colors.cta} />
                        <Text style={[styles.areaChipText, { color: colors.cta }]} numberOfLines={1} ellipsizeMode="tail">{displayCity(area, isRTL)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </Card>

        {/* ── Menu ── */}
        <Card style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 6 }}>
          <MenuRow
            icon="users" label={t.profile.teamMembers} color={colors.cta}
            subtitle={t.profile.manageTeam}
            onPress={() => router.push("/(supplier)/team")}
            isRTL={isRTL}
          />
          <MenuRow
            icon="bell" label={t.profile.notifications} color={colors.warning}
            subtitle={t.profile.notifPreferences}
            onPress={() => router.push("/(supplier)/notifications")}
            isRTL={isRTL}
            isLast={false}
          />
          <MenuRow
            icon="package" label={t.profile.orders} color={colors.purple}
            subtitle={t.profile.viewOrders}
            onPress={() => router.push("/(supplier)/orders")}
            isRTL={isRTL}
            isLast={false}
          />
          <MenuRow
            icon="globe" label={t.profile.languageToggle} color={colors.success}
            subtitle={t.profile.languageToggleHint}
            onPress={() => setLanguage(isRTL ? "en" : "ar")}
            isRTL={isRTL}
            isLast={true}
          />
        </Card>

        {/* ── Sign Out ── */}
        <TouchableOpacity accessibilityRole="button" style={[styles.signOutBtn, { borderColor: colors.destructive + "30" }]} onPress={handleLogout} activeOpacity={0.75}>
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>{t.common.signOut}</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.outline }]}>
          Mdmak Tech v{Constants.expoConfig?.version ?? "1.0.0"}
        </Text>
      </ScrollView>

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
  headerTitle: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
  settingsBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  avatarSection: { alignItems: "center", gap: 8 },
  avatarRing: { width: 96, height: 96, borderRadius: 28, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  avatar: { width: 86, height: 86, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 24, lineHeight: 40 },
  name: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold", textAlign: "center", marginTop: 4 },
  email: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular", textAlign: "center" },
  badges: { flexDirection: "row", gap: 8, marginTop: 4 },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1 },
  roleText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  verifiedText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },

  // Quick actions

  // Scroll
  scroll: { padding: 16, gap: 12 },

  // Completeness
  compHeader: { alignItems: "center", marginBottom: 10 },
  compIcon: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  compTitle: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold", flex: 1, marginHorizontal: 10 },
  compSubtitle: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular", marginTop: 1 },
  compPct: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
  compBar: { height: 5, borderRadius: 4, overflow: "hidden", marginTop: 4 },
  compFill: { height: "100%", borderRadius: 4 },
  compMissing: { alignItems: "center", gap: 6, marginTop: 8 },
  compMissingText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  compChips: { flexWrap: "wrap", gap: 6 },
  compChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  compChipText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  requiredBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  requiredBadgeText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },

  // Stats grid
  statsGrid: { flexDirection: "row", gap: 8 },
  statCard: { borderRadius: 16, borderWidth: 1, alignItems: "center", padding: 14, gap: 6 },
  statIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 24, lineHeight: 40, fontFamily: "Inter_600SemiBold" },
  statLabel: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "center" },

  // Cards
  cardHeader: { alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  cardHeaderIcon: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  editBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  editActions: { flexDirection: "row", gap: 10, marginTop: 4 },

  // Info rows (view mode)
  infoRow: { alignItems: "center", gap: 12, paddingVertical: 8 },
  infoIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  infoValue: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular" },

  // Specializations
  label: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular" },
  subLabel: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold", },
  chipsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 6, maxWidth: 140 },
  chipText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  areaChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  areaChipText: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },
  emptyState: { alignItems: "center", gap: 8, padding: 20, borderRadius: 12 },
  emptyText: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular" },
  emptyAction: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  pendingBox: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  pendingHead: { alignItems: "center", gap: 6 },
  pendingTitle: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold", flex: 1 },
  pendingHint: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },

  // Menu
  menuRow: { alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 10 },
  menuIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  menuLabel: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  menuSubtitle: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular" },

  // Sign out
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5 },
  signOutText: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  version: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
});
