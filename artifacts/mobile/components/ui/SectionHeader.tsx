import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";
import { type, space, radius, MIN_TOUCH } from "@/lib/design";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** A section's name with, optionally, the one link that goes further. The
 * teal tick before the title is the brand's mark on a plain screen. */
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const colors = useColors();
  const { isRTL } = useLanguage();
  const row = isRTL ? "row-reverse" : "row";

  return (
    <View style={[styles.container, { flexDirection: row }]}>
      <View style={[styles.titleRow, { flexDirection: row }]}>
        <View style={[styles.accent, { backgroundColor: colors.accent }]} />
        <Text style={[type.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left", flex: 1 }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.7}
          accessibilityRole="button"
          style={[styles.actionBtn, { flexDirection: row }]}
        >
          <Text style={[type.captionStrong, { color: colors.cta }]}>{actionLabel}</Text>
          <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={14} color={colors.cta} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: "space-between", alignItems: "center", marginBottom: space.md, gap: space.sm },
  titleRow: { alignItems: "center", gap: space.sm, flex: 1 },
  accent: { width: 3, height: 18, borderRadius: radius.hairline },
  actionBtn: { alignItems: "center", gap: 2, minHeight: MIN_TOUCH, paddingHorizontal: space.xs },
});
