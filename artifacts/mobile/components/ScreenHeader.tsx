import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, ViewStyle } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
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

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10),
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 34 }} />
        )}
        <View style={styles.center}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={[styles.subtitle, { color: colors.outline }]}>{subtitle}</Text>}
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
  const { isRTL } = useLanguage();

  return (
    <View
      style={[
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10),
          backgroundColor: colors.surfaceSecondary,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      <View style={[styles.dashInner, { paddingHorizontal: 16, paddingBottom: 12, marginTop: 6 }]}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, marginRight: 12 }}>
          <View style={[styles.avatarRing, { borderColor: colors.accent }]}>
            <Image
              source={require("@/assets/images/figma/user-profile.png")}
              style={styles.avatar}
              contentFit="cover"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "HankenGrotesk_700Bold",
                fontSize: 22,
                letterSpacing: -0.4,
                color: colors.foreground,
              }}
              numberOfLines={1}
            >
              {orgName ?? userName ?? "Mdmak Tech"}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center", paddingLeft: 4 }}>
          {right}
        </View>
      </View>
    </View>
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

  return (
    <LinearGradient
      colors={colors.gradientPrimary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.heroCard, colors.shadow.md]}
    >
      <Text style={[styles.heroTitle, { fontFamily: "HankenGrotesk_700Bold" }]}>
        Hello, {userName ?? "there"}
      </Text>
      <Text style={styles.heroDesc}>
        You have <Text style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{activeRfqs ?? 0} active RFQs</Text> with <Text style={{ fontFamily: "Inter_700Bold", color: "#FFFFFF" }}>{totalOffers ?? 0} offers</Text> to review. Stay on top of your procurement.
      </Text>
      {onAction && (
        <TouchableOpacity
          style={styles.heroBtn}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={styles.heroBtnText}>{actionLabel ?? "View All RFQs"}</Text>
          <Feather name="arrow-right" size={14} color={colors.cta} />
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
}

export function QuickActionCard({
  title,
  icon,
  bgColor,
  onPress,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  bgColor: string;
  onPress?: () => void;
}) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[styles.quickActionCard, { backgroundColor: colors.card, borderColor: colors.border, ...colors.shadow.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: bgColor }]}>
        <Feather name={icon} size={20} color={bgColor === colors.accentBlueSoft ? colors.primary : colors.secondary} />
      </View>
      <Text style={[styles.quickActionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>{title}</Text>
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
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  center: { flex: 1, alignItems: "center" },
  title: {
    fontSize: 17,
    fontWeight: "700" as const,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  heroCard: {
    padding: 20,
    borderRadius: 12,
    gap: 8,
    overflow: "hidden",
  },
  heroTitle: {
    fontSize: 26,
    letterSpacing: -0.52,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  heroBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.6,
    color: "#0369A1",
  },
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
    letterSpacing: 0.6,
    textAlign: "center",
  },
});
