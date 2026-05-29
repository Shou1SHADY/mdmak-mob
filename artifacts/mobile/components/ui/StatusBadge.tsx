import React from "react";
import { View, Text, StyleSheet } from "react-native";

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
          backgroundColor: color + "20",
          paddingHorizontal: size === "sm" ? 8 : 12,
          paddingVertical: size === "sm" ? 3 : 5,
        },
      ]}
    >
      <Text style={[styles.text, { color, fontSize: size === "sm" ? 11 : 12 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 20, alignSelf: "flex-start" },
  text: { fontWeight: "600" as const },
});
