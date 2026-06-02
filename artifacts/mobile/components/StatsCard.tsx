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
          borderRadius: colors.radiusXl,
          padding: colors.spacing.base,
          gap: colors.spacing.xs,
        },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: accentColor + "14",
            borderRadius: colors.radiusMd,
            marginBottom: colors.spacing.xs,
          },
        ]}
      >
        <Feather name={icon} size={20} color={accentColor} />
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.title, colors.typography.caption, { color: colors.outline, textTransform: "uppercase" as const }]}>{title}</Text>
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
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 26, fontWeight: "700" as const, lineHeight: 32 },
  title: {},
  subtitle: {},
});
