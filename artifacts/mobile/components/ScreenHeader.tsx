import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, ViewStyle } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

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
  right,
  style,
}: {
  orgName?: string;
  userName?: string;
  right?: React.ReactNode;
  style?: ViewStyle;
}) {
  const insets = useSafeAreaInsets();
  const colors = useColors();

  return (
    <View
      style={[
        styles.dashContainer,
        {
          backgroundColor: colors.primary,
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10),
        },
        style,
      ]}
    >
      <View style={styles.dashInner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>مرحباً • Welcome</Text>
          <Text style={styles.orgName} numberOfLines={1}>
            {orgName ?? userName ?? ""}
          </Text>
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

  dashContainer: { paddingHorizontal: 16, paddingBottom: 16 },
  dashInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  greeting: { fontSize: 12, color: "rgba(248,250,252,0.6)", marginBottom: 2 },
  orgName: { fontSize: 20, fontWeight: "700" as const, color: "#F8FAFC" },
});
