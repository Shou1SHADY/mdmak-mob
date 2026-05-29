import React, { ReactNode } from "react";
import { View, StyleSheet, ViewStyle, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColors";

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  glass?: boolean;
}

export function Card({ children, style, onPress, glass = false }: CardProps) {
  const colors = useColors();

  const cardStyle: ViewStyle = {
    backgroundColor: glass ? "rgba(255,255,255,0.82)" : colors.card,
    borderRadius: colors.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  };

  if (onPress) {
    return (
      <TouchableOpacity style={[cardStyle, style]} onPress={onPress} activeOpacity={0.82}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}
