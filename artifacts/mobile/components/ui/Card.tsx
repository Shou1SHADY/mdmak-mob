import React, { ReactNode } from "react";
import { View, ViewStyle, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/useColors";
import { radius, cardPadding } from "@/lib/design";

/**
 * A card is a lifted object: white on the page's cool ground, one hairline
 * border, the card radius. Elevation is spent by role — most cards are
 * "raised" (a whisper of shadow), a sheet or a hero is "high", and a card
 * inside another card is "flat" so the page never stacks shadows on shadows.
 */

type CardElevation = "flat" | "raised" | "high";

interface CardProps {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  elevation?: CardElevation;
  /** Read by screen readers when the card is pressable. */
  accessibilityLabel?: string;
}

const elevationToShadow = { flat: "none", raised: "sm", high: "md" } as const;

export function Card({ children, style, onPress, elevation = "raised", accessibilityLabel }: CardProps) {
  const colors = useColors();
  const cardStyle: ViewStyle = {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: cardPadding.panel,
    borderWidth: 1,
    borderColor: colors.border,
    ...colors.shadow[elevationToShadow[elevation]],
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[cardStyle, style]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[cardStyle, style]}>{children}</View>;
}
