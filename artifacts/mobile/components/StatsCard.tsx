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
  const accent = color ?? colors.cta;

  return (
    <View
      style={[
        styles.card,
        colors.shadow.sm,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radiusXl,
        },
      ]}
    >
      {/* colored top accent strip */}
      <View style={[styles.strip, { backgroundColor: accent }]} />

      <View style={styles.body}>
        <View style={[styles.iconBox, { backgroundColor: accent + "14", borderRadius: colors.radiusMd }]}>
          <Feather name={icon} size={18} color={accent} />
        </View>

        <Text
          style={[styles.value, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}
          numberOfLines={1}
        >
          {value}
        </Text>

        <Text
          style={[
            styles.title,
            { color: colors.outline, fontFamily: "Inter_500Medium" },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text style={[styles.subtitle, { color: accent, fontFamily: "Inter_600SemiBold" }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    overflow: "hidden",
  },
  strip: {
    height: 3,
    width: "100%",
  },
  body: {
    padding: 14,
    gap: 4,
  },
  iconBox: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  value: {
    fontSize: 28,
    lineHeight: 34,
  },
  title: {
    fontSize: 11,
    textTransform: "uppercase",
    lineHeight: 15,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
});
