import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface StatusBadgeProps {
  label: string;
  color: string;
  size?: "sm" | "md";
}

export function StatusBadge({ label, color, size = "md" }: StatusBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color + "16",
          borderColor: color + "30",
          paddingHorizontal: size === "sm" ? 10 : 12,
          paddingVertical: size === "sm" ? 4 : 6,
        },
      ]}
    >
      <Text style={[styles.text, { color, fontSize: size === "sm" ? 11 : 12 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  text: { fontWeight: "600" as const },
});
