import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

interface CrmChoiceProps<T extends string> {
  label: string;
  options: ChoiceOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Renders the chips in one horizontally-scrolling row instead of wrapping. */
  scroll?: boolean;
  required?: boolean;
}

/**
 * A row of selectable chips — the phone's answer to the website's `<Select>`.
 *
 * A CRM enum here is never long (six lead statuses, five activity types, three
 * tracks), so showing every option beats hiding them behind a picker that costs
 * a tap to discover. Longer lists pass `scroll` and run off the edge instead of
 * wrapping into a wall.
 */
export function CrmChoice<T extends string>({
  label,
  options,
  value,
  onChange,
  scroll,
  required,
}: CrmChoiceProps<T>) {
  const colors = useColors();
  const { isRTL } = useLanguage();

  const chips = options.map((option) => {
    const active = option.value === value;
    return (
      <TouchableOpacity
        key={option.value}
        onPress={() => onChange(option.value)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={[
          styles.chip,
          {
            backgroundColor: active ? colors.cta : colors.muted,
            borderColor: active ? colors.cta : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.chipText,
            { color: active ? colors.ctaForeground : colors.mutedForeground },
          ]}
        >
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  });

  return (
    <View style={styles.wrap}>
      <Text
        style={[styles.label, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
      >
        {label}
        {required ? <Text style={{ color: colors.destructive }}> *</Text> : null}
      </Text>
      {scroll ? (
        <ScrollView
          horizontal
          // Hug the content: a horizontal scroller left to flex would stretch
          // to the parent's height and stretch its chips with it.
          style={{ flexGrow: 0, flexShrink: 0 }}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }]}
        >
          {chips}
        </ScrollView>
      ) : (
        <View style={[styles.rowWrap, { flexDirection: isRTL ? "row-reverse" : "row" }]}>{chips}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 13, lineHeight: 21, fontFamily: "Inter_500Medium", marginBottom: 8 },
  row: { alignItems: "center", gap: 8, paddingVertical: 2, paddingHorizontal: 2 },
  rowWrap: { flexWrap: "wrap", gap: 8 },
  chip: {
    // 44px minimum touch target, per the project's accessibility rule.
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, lineHeight: 21, fontFamily: "Inter_500Medium" },
});
