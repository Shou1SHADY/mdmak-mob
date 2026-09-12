import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";
import { type, radius, toneColors, type Tone } from "@/lib/design";

/**
 * A status, coloured by meaning. Pass a `tone` (see lib/design.ts) and the
 * badge resolves its text and soft ground from the palette in both themes.
 * `color` is the older hex API; it still works but reads as "custom", so new
 * code passes a tone.
 */
interface StatusBadgeProps {
  label: string;
  tone?: Tone;
  color?: string;
  size?: "sm" | "md";
  /** A dot before the label, for lists where the colour alone must not carry the meaning. */
  dot?: boolean;
}

export function StatusBadge({ label, tone, color, size = "md", dot = false }: StatusBadgeProps) {
  const colors = useColors();
  const resolved = tone
    ? toneColors(colors, tone)
    : color
    ? { fg: color, bg: color + "16", border: color + "30" }
    : toneColors(colors, "neutral");

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: resolved.bg,
          borderColor: resolved.border,
          paddingHorizontal: size === "sm" ? 8 : 10,
          paddingVertical: size === "sm" ? 2 : 4,
        },
      ]}
      accessibilityRole="text"
    >
      {dot && <View style={[styles.dot, { backgroundColor: resolved.fg }]} />}
      <Text style={[type.captionStrong, { color: resolved.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 4 },
});
