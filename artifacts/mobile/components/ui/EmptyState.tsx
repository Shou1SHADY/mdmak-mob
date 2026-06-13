import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <View style={[styles.iconOuter, { borderColor: colors.border }]}>
        <View style={[styles.iconInner, { backgroundColor: colors.accentBlueSoft }]}>
          <Feather name={icon} size={28} color={colors.cta} />
        </View>
      </View>
      <Text style={[styles.title, { color: colors.foreground, fontFamily: "HankenGrotesk_600SemiBold" }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.outline, fontFamily: "Inter_400Regular" }]}>{subtitle}</Text>
      )}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} size="sm" style={{ marginTop: 8 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  iconOuter: { width: 80, height: 80, borderRadius: 26, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  iconInner: { width: 62, height: 62, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 22, maxWidth: 260 },
});
