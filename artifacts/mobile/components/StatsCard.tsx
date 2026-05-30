import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  color?: string;
  subtitle?: string;
}

export function StatsCard({ title, value, icon, color, subtitle }: StatsCardProps) {
  const colors = useColors();
  const accentColor = color ?? colors.cta;

  return (
    <View
      style={[
        styles.card,
        colors.shadow.sm,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          padding: colors.spacing.base,
          gap: colors.spacing.xs,
        },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          colors.shadow.sm,
          {
            backgroundColor: accentColor + "12",
            borderRadius: colors.radiusMd,
            marginBottom: colors.spacing.xs,
          },
        ]}
      >
        <Feather name={icon} size={20} color={accentColor} />
      </View>
      <Text style={[styles.value, colors.typography.h1, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.title, colors.typography.caption, { color: colors.mutedForeground }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, colors.typography.caption, { color: accentColor, fontWeight: "600" }]}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
  },
  iconBox: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontWeight: "700" as const },
  title: {},
  subtitle: {},
});
