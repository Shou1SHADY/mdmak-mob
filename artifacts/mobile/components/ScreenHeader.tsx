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
import { type, space, radius, MIN_TOUCH } from "@/lib/design";

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
  const t = useT();
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
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t.common.back}
          >
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={colors.foreground} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: MIN_TOUCH }} />
        )}
        <View style={styles.center}>
          <Text style={[type.title, { color: colors.foreground, textAlign: "center" }]} numberOfLines={1} ellipsizeMode="tail">{title}</Text>
          {subtitle && <Text style={[type.caption, { color: colors.mutedForeground, textAlign: "center" }]} numberOfLines={1} ellipsizeMode="tail">{subtitle}</Text>}
        </View>
        <View style={styles.rightSlot}>{right ?? <View style={{ width: MIN_TOUCH }} />}</View>
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
        <View style={[styles.dashInner, { paddingHorizontal: space.lg, paddingBottom: space.md, marginTop: space.xs, flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={{ flex: 1, flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: space.md, marginHorizontal: 0 }}>
            <View style={[styles.avatarRing, { borderColor: colors.accent }]}>
              <Image
                source={require("@/assets/images/figma/user-profile.png")}
                style={{ width: 34, height: 34, borderRadius: 17 }}
                contentFit="cover"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[type.bodyStrong, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {orgName ?? userName ?? t.common.appName}
              </Text>
              {orgType && (
                <Text style={[type.caption, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
                  {orgType}
                </Text>
              )}
            </View>
          </View>

          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 6, alignItems: "center" }}>
            {/* Language switcher — 44×44 touch target with flag + code label */}
            <TouchableOpacity
              style={[styles.langBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowSheet(true)}
              accessibilityLabel={language === "ar" ? "تغيير اللغة" : "Change language"}
              accessibilityRole="button"
              activeOpacity={0.75}
            >
              <CurrentFlag width={22} height={15} />
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
        <View style={[styles.modalOuter, { backgroundColor: colors.overlay }]}>
          {/* Backdrop */}
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowSheet(false)} />

          {/* Sheet */}
          <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + space.lg }]}>
            {/* Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            {/* Title */}
            <Text style={[type.title, styles.sheetTitle, { color: colors.foreground }]}>
              {language === "ar" ? "اختر اللغة" : "Select Language"}
            </Text>

            {/* Arabic option */}
            <TouchableOpacity
              style={[
                styles.langOption,
                {
                  backgroundColor: language === "ar" ? colors.ctaSoft : "transparent",
                  borderColor: language === "ar" ? colors.cta : colors.border,
                },
              ]}
              onPress={() => { setLanguage("ar"); setShowSheet(false); }}
              activeOpacity={0.7}
            >
              <View style={styles.flagWrap}>
                <SaudiArabiaFlag width={52} height={34} />
              </View>
              <Text style={[type.bodyStrong, { color: colors.foreground }]}>
                عربي
              </Text>
              <View style={{ flex: 1 }} />
              {language === "ar" && (
                <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
                  <Feather name="check" size={13} color={colors.successForeground} />
                </View>
              )}
            </TouchableOpacity>

            {/* English option */}
            <TouchableOpacity
              style={[
                styles.langOption,
                {
                  backgroundColor: language === "en" ? colors.ctaSoft : "transparent",
                  borderColor: language === "en" ? colors.cta : colors.border,
                },
              ]}
              onPress={() => { setLanguage("en"); setShowSheet(false); }}
              activeOpacity={0.7}
            >
              <View style={styles.flagWrap}>
                <UKFlag width={52} height={34} />
              </View>
              <Text style={[type.bodyStrong, { color: colors.foreground }]}>
                English
              </Text>
              <View style={{ flex: 1 }} />
              {language === "en" && (
                <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
                  <Feather name="check" size={13} color={colors.successForeground} />
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
      <Text style={[type.display, { color: colors.textWhite, textAlign: isRTL ? "right" : "left" }]}>
        {t.dashboard.greeting} {userName ?? ""}
      </Text>
      <Text style={[type.body, { color: colors.textWhite80, textAlign: isRTL ? "right" : "left" }]}>
        {t.dashboard.heroYouHave}{" "}
        <Text style={[type.bodyStrong, { color: colors.textWhite }]}>{activeRfqs ?? 0}</Text>
        {" "}{t.dashboard.heroActiveRfqsAnd}{" "}
        <Text style={[type.bodyStrong, { color: colors.textWhite }]}>{totalOffers ?? 0}</Text>
        {" "}{t.dashboard.heroOffersReview}
      </Text>
      {onAction && (
        <TouchableOpacity
          style={[styles.heroBtn, { alignSelf: isRTL ? "flex-end" : "flex-start", backgroundColor: colors.textWhite, flexDirection: isRTL ? "row-reverse" : "row" }]}
          onPress={onAction}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={[type.captionStrong, { color: colors.cta }]}>{actionLabel ?? t.dashboard.viewAll}</Text>
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
      <View style={[styles.quickActionIcon, { backgroundColor: bgColor }]}>
        <Feather name={icon} size={22} color={resolvedIconColor} />
      </View>
      <Text
        style={[type.captionStrong, styles.quickActionTitle, { color: colors.foreground }]}
        numberOfLines={2}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  backBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.control,
  },
  center: { flex: 1, alignItems: "center" },
  rightSlot: { minWidth: MIN_TOUCH, alignItems: "flex-end" },
  dashInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  langBtn: {
    height: MIN_TOUCH,
    paddingHorizontal: space.sm,
    borderRadius: radius.control,
    borderWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  langCode: {
    ...type.captionStrong,
  },
  // ── Bottom sheet ──────────────────────────────────────
  modalOuter: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    gap: space.sm,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 4,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetTitle: {
    textAlign: "center",
    marginBottom: space.xs,
  },
  langOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: space.md,
    minHeight: 56,
  },
  flagWrap: {
    borderRadius: radius.hairline,
    overflow: "hidden",
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Hero card ─────────────────────────────────────────
  heroCard: {
    padding: space.xl,
    borderRadius: radius.card,
    gap: space.sm,
    overflow: "hidden",
  },
  heroBtn: {
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.control,
    marginTop: space.xs,
    minHeight: MIN_TOUCH,
  },
  // ── Quick action ──────────────────────────────────────
  quickActionCard: {
    flex: 1,
    padding: space.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: space.md,
    alignItems: "center",
  },
  quickActionIcon: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionTitle: {
    textAlign: "center",
  },
});
