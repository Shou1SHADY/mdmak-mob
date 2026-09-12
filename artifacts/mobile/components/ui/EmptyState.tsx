import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { type, space, radius } from "@/lib/design";
import { Button } from "./Button";

/**
 * What a list shows when it has nothing to show — and, with `variant="error"`,
 * what it shows when it could not load. The two must look different: an empty
 * inbox is calm, a failed query needs a retry, and a screen that answers a
 * network failure with "No RFQs yet, create one" is lying.
 */
interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "empty" | "error";
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction, variant = "empty" }: EmptyStateProps) {
  const colors = useColors();
  const isError = variant === "error";
  const iconBg = isError ? colors.destructiveSoft : colors.ctaSoft;
  const iconColor = isError ? colors.destructive : colors.cta;

  return (
    <View style={styles.container} accessibilityRole="summary">
      <View style={[styles.icon, { backgroundColor: iconBg }]}>
        <Feather name={isError ? "alert-circle" : icon} size={26} color={iconColor} />
      </View>
      <Text style={[type.title, styles.centered, { color: colors.foreground }]}>{title}</Text>
      {subtitle ? (
        <Text style={[type.body, styles.centered, styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          size="sm"
          variant={isError ? "outline" : "primary"}
          style={{ marginTop: space.sm }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: space.xxl, gap: space.sm },
  icon: {
    width: 64,
    height: 64,
    borderRadius: radius.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.xs,
  },
  centered: { textAlign: "center" },
  subtitle: { maxWidth: 280 },
});
