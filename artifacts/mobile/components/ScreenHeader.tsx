import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, ViewStyle } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";

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
          backgroundColor: colors.primary,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10),
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color="#F8FAFC" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 34 }} />
        )}
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.rightSlot}>{right ?? <View style={{ width: 34 }} />}</View>
      </View>
    </View>
  );
}

/** Transparent version for scroll-over-header patterns */
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
        styles.dashContainer,
        {
          backgroundColor: colors.primary,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10),
          borderBottomWidth: 2,
          borderBottomColor: colors.accent,
        },
        style,
      ]}
    >
      <View style={[styles.dashInner, { marginTop: colors.spacing.sm }]}>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.greeting,
              colors.typography.caption,
              { textAlign: isRTL ? "right" : "left", marginBottom: colors.spacing.xs },
            ]}
          >
            {t.dashboard.welcome}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={[styles.orgName, colors.typography.h3, { flexShrink: 1 }]} numberOfLines={1}>
              {orgName ?? userName ?? ""}
            </Text>
            {orgType ? (
              <View style={[styles.orgBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.orgBadgeText}>{orgType}</Text>
              </View>
            ) : null}
          </View>
        </View>
        {right}
      </View>
    </View>
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
  },
  center: { flex: 1, alignItems: "center" },
  title: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#F8FAFC",
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(248,250,252,0.65)",
    marginTop: 1,
  },
  rightSlot: { width: 34, alignItems: "flex-end" },

  dashContainer: { paddingHorizontal: 16, paddingBottom: 20 },
  dashInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: { color: "rgba(248,250,252,0.6)" },
  orgName: { color: "#F8FAFC" },
  orgBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  orgBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#F8FAFC",
  },
});
