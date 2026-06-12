import React, { ReactNode } from "react";
import { View, ViewStyle, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColors";

type CardElevation = "flat" | "raised" | "high";

interface CardProps {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  glass?: boolean;
  elevation?: CardElevation;
}

const elevationToShadow = {
  flat: "none",
  raised: "md",
  high: "lg",
} as const;

export function Card({
  children,
  style,
  onPress,
  glass = false,
  elevation = "raised",
}: CardProps) {
  const colors = useColors();
  const shadow = colors.shadow[elevationToShadow[elevation]];

  const cardStyle: ViewStyle = {
    backgroundColor: glass ? "rgba(255,255,255,0.82)" : colors.card,
    borderRadius: colors.radiusXl,
    padding: colors.spacing.base,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  };

  if (onPress) {
    return (
      <TouchableOpacity style={[cardStyle, style]} onPress={onPress} activeOpacity={0.85}>
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[cardStyle, style]} accessibilityRole="none">
      {children}
    </View>
  );
}
