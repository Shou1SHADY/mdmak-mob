import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { type, space, radius, toneColors, type Tone } from "@/lib/design";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  /** Colour by meaning; `color` is the older hex API. */
  tone?: Tone;
  color?: string;
  subtitle?: string;
}

/** One number the screen exists to show, its name under it, in a tinted tile. */
export function StatsCard({ title, value, icon, tone, color, subtitle }: StatsCardProps) {
  const colors = useColors();
  const { isRTL } = useLanguage();
  const resolved = tone ? toneColors(colors, tone) : color ? { fg: color, bg: color + "14" } : toneColors(colors, "cta");
  const align = isRTL ? "right" : "left";

  return (
    <View style={[styles.card, colors.shadow.sm, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: resolved.bg, alignSelf: isRTL ? "flex-end" : "flex-start" }]}>
        <Feather name={icon} size={18} color={resolved.fg} />
      </View>
      <Text style={[type.display, styles.tabular, { color: colors.foreground, textAlign: align }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[type.caption, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[type.captionStrong, { color: resolved.fg, textAlign: align }]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: space.lg,
    gap: 2,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
  },
  tabular: { fontVariant: ["tabular-nums"] },
});
