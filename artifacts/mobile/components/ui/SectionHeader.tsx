import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const colors = useColors();
  const { isRTL } = useLanguage();

  return (
    <View style={[styles.container, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
      <View style={[styles.titleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={[styles.accent, { backgroundColor: colors.accent }]} />
        <Text
          style={[
            styles.title,
            { color: colors.foreground, fontFamily: "HankenGrotesk_600SemiBold", textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {title}
        </Text>
      </View>

      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.actionBtn, { flexDirection: isRTL ? "row-reverse" : "row" }]}
        >
          <Text style={[styles.action, { color: colors.cta }]}>{actionLabel}</Text>
          <Feather
            name={isRTL ? "chevron-left" : "chevron-right"}
            size={13}
            color={colors.cta}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleRow: {
    alignItems: "center",
    gap: 8,
  },
  accent: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  title: {
    fontSize: 17,
  },
  actionBtn: {
    alignItems: "center",
    gap: 2,
  },
  action: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
