import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, Modal, Pressable } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { headerTopPadding } from "@/lib/layout";
import { useT, useLanguage } from "@/context/LanguageContext";
import { SaudiArabiaFlag, UKFlag } from "@/components/ui/FlagIcon";
import { Image } from "expo-image";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  right?: React.ReactNode;
  style?: ViewStyle;
}

export function ScreenHeader({ title, subtitle, showBack = false, right, style }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { isRTL } = useLanguage();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          paddingTop: headerTopPadding(insets.top, 10),
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      {/* The row must mirror, not just the icon: with a hardcoded direction the
          back control stayed on the left in Arabic while its arrow pointed
          right, which reads as a forward action on the wrong edge. */}
      <View style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={colors.foreground} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 34 }} />
        )}
        <View style={styles.center}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: colors.outline }]} numberOfLines={1} ellipsizeMode="tail">{subtitle}</Text>}
        </View>
        <View style={styles.rightSlot}>{right ?? <View style={{ width: 34 }} />}</View>
      </View>
    </View>
  );
}

export function DashboardHeader({
  orgName,
  userName,
  orgType,
  right,
  style,
}: {
  orgName?: string;
  userName?: string;
  orgType?: string;
  right?: React.ReactNode;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const t = useT();
  const { isRTL, language, setLanguage } = useLanguage();
  const [showSheet, setShowSheet] = useState(false);

  const CurrentFlag = language === "ar" ? SaudiArabiaFlag : UKFlag;

  return (
    <>
      <View
        style={[
          {
            paddingTop: headerTopPadding(insets.top, 4),
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          style,
        ]}
      >
        <View style={[styles.dashInner, { paddingHorizontal: 16, paddingBottom: 10, marginTop: 4 }]}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }}>
            <View style={[styles.avatarRing, { borderColor: colors.accent }]}>
              <Image
                source={require("@/assets/images/figma/user-profile.png")}
                style={{ width: 38, height: 38, borderRadius: 19 }}
                contentFit="cover"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontFamily: "HankenGrotesk_700Bold", fontSize: 17, color: colors.foreground }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {orgName ?? userName ?? "Mdmak Tech"}
              </Text>
              {orgType && (
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.outline, marginTop: 1 }}>
                  {orgType}
                </Text>
              )}
            </View>
          </View>

          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, alignItems: "center" }}>
            {/* Language switcher — 44×44 touch target with flag + code label */}
            <TouchableOpacity
              style={[styles.langBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowSheet(true)}
              accessibilityLabel={language === "ar" ? "تغيير اللغة" : "Change language"}
              accessibilityRole="button"
              activeOpacity={0.75}
            >
              <CurrentFlag width={26} height={17} />
              <Text style={[styles.langCode, { color: colors.foreground }]}>
                {language === "ar" ? "AR" : "EN"}
              </Text>
            </TouchableOpacity>
            {right}
          </View>
        </View>
      </View>

      {/* Language Picker Bottom Sheet */}
      <Modal
        visible={showSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSheet(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOuter}>
          {/* Backdrop */}
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowSheet(false)} />

          {/* Sheet */}
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
            {/* Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {/* Title */}
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              {language === "ar" ? "اختر اللغة" : "Select Language"}
            </Text>

            {/* Arabic option */}
            <TouchableOpacity
              style={[
                styles.langOption,
                {
                  backgroundColor: language === "ar" ? colors.primaryText + "08" : "transparent",
                  borderColor: language === "ar" ? colors.primaryText + "30" : colors.border,
                },
              ]}
              onPress={() => { setLanguage("ar"); setShowSheet(false); }}
              activeOpacity={0.7}
            >
              <View style={styles.flagWrap}>
                <SaudiArabiaFlag width={52} height={34} />
              </View>
              <Text style={[styles.langOptionText, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>
                عربي
              </Text>
              <View style={{ flex: 1 }} />
              {language === "ar" && (
                <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
                  <Feather name="check" size={13} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            {/* English option */}
            <TouchableOpacity
              style={[
                styles.langOption,
                {
                  backgroundColor: language === "en" ? colors.primaryText + "08" : "transparent",
                  borderColor: language === "en" ? colors.primaryText + "30" : colors.border,
                },
              ]}
              onPress={() => { setLanguage("en"); setShowSheet(false); }}
              activeOpacity={0.7}
            >
              <View style={styles.flagWrap}>
                <UKFlag width={52} height={34} />
              </View>
              <Text style={[styles.langOptionText, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>
                English
              </Text>
              <View style={{ flex: 1 }} />
              {language === "en" && (
                <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
                  <Feather name="check" size={13} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function WelcomeHeroCard({
  userName,
  activeRfqs,
  totalOffers,
  onAction,
  actionLabel,
}: {
  userName?: string;
  activeRfqs?: number;
  totalOffers?: number;
  onAction?: () => void;
  actionLabel?: string;
}) {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();

  return (
    <LinearGradient
      colors={colors.gradientPrimary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.heroCard, colors.shadow.md]}
    >
      <Text style={[styles.heroTitle, { fontFamily: "HankenGrotesk_700Bold", textAlign: isRTL ? "right" : "left", letterSpacing: isRTL ? 0 : -0.52 }]}>
        {t.dashboard.greeting} {userName ?? ""}
      </Text>
      <Text style={[styles.heroDesc, { textAlign: isRTL ? "right" : "left" }]}>
        {t.dashboard.heroYouHave}{" "}
        <Text style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{activeRfqs ?? 0}</Text>
        {" "}{t.dashboard.heroActiveRfqsAnd}{" "}
        <Text style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{totalOffers ?? 0}</Text>
        {" "}{t.dashboard.heroOffersReview}
      </Text>
      {onAction && (
        <TouchableOpacity
          style={[styles.heroBtn, { alignSelf: isRTL ? "flex-end" : "flex-start" }]}
          onPress={onAction}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={[styles.heroBtnText, { color: colors.cta }]}>{actionLabel ?? t.dashboard.viewAll}</Text>
          <Feather name={isRTL ? "arrow-left" : "arrow-right"} size={14} color={colors.cta} />
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

export function QuickActionCard({
  title,
  icon,
  bgColor,
  iconColor,
  onPress,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  bgColor: string;
  iconColor?: string;
  onPress?: () => void;
}) {
  const colors = useColors();
  const resolvedIconColor = iconColor ?? colors.cta;

  return (
    <TouchableOpacity
      style={[
        styles.quickActionCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderTopWidth: 3,
          borderTopColor: resolvedIconColor,
          ...colors.shadow.sm,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={title}
      accessibilityRole="button"
    >
      <View style={[styles.quickActionIcon, { backgroundColor: bgColor, borderRadius: 10 }]}>
        <Feather name={icon} size={22} color={resolvedIconColor} />
      </View>
      <Text
        style={[styles.quickActionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
        numberOfLines={2}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  center: { flex: 1, alignItems: "center" },
  title: { fontSize: 17, fontWeight: "700" as const },
  subtitle: { fontSize: 12, marginTop: 1 },
  rightSlot: { width: 34, alignItems: "flex-end" },
  dashInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatarRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  langBtn: {
    height: 44,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  langCode: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  // ── Bottom sheet ──────────────────────────────────────
  modalOuter: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 15,
    fontFamily: "HankenGrotesk_700Bold",
    textAlign: "center",
    marginBottom: 4,
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  flagWrap: {
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  langOptionText: {
    fontSize: 17,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Hero card ─────────────────────────────────────────
  heroCard: {
    padding: 20,
    borderRadius: 20,
    gap: 8,
    overflow: "hidden",
  },
  heroTitle: {
    fontSize: 26,
    color: "#FFFFFF",
  },
  heroDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(239,239,255,0.8)",
  },
  heroBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 6,
    minHeight: 44,
  },
  heroBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  // ── Quick action ──────────────────────────────────────
  quickActionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    alignItems: "center",
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionTitle: {
    fontSize: 12,
    textAlign: "center",
  },
});
