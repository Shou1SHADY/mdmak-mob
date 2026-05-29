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
  const accentColor = color ?? colors.primary;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: accentColor + "15" }]}>
        <Feather name={icon} size={22} color={accentColor} />
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.title, { color: colors.mutedForeground }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: accentColor }]}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 6,
    minWidth: 140,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  value: { fontSize: 26, fontWeight: "700" as const },
  title: { fontSize: 12, fontWeight: "500" as const },
  subtitle: { fontSize: 12, fontWeight: "600" as const },
});
