import React from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const colors = useColors();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: colors.radiusSm,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      opacity: disabled || loading ? 0.55 : 1,
    };
    const sizes: Record<Size, ViewStyle> = {
      sm: { paddingHorizontal: 14, paddingVertical: 8 },
      md: { paddingHorizontal: 20, paddingVertical: 13 },
      lg: { paddingHorizontal: 28, paddingVertical: 16 },
    };
    const variants: Record<Variant, ViewStyle> = {
      primary: { backgroundColor: colors.cta },
      secondary: { backgroundColor: colors.muted },
      ghost: { backgroundColor: "transparent" },
      destructive: { backgroundColor: colors.destructive },
      outline: {
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderColor: colors.border,
      },
    };
    return {
      ...base,
      ...sizes[size],
      ...variants[variant],
      ...(fullWidth ? { width: "100%" } : {}),
    };
  };

  const getTextStyle = (): TextStyle => {
    const sizes: Record<Size, TextStyle> = {
      sm: { fontSize: 13 },
      md: { fontSize: 15 },
      lg: { fontSize: 16 },
    };
    const variants: Record<Variant, TextStyle> = {
      primary: { color: colors.ctaForeground },
      secondary: { color: colors.secondary },
      ghost: { color: colors.cta },
      destructive: { color: colors.destructiveForeground },
      outline: { color: colors.foreground },
    };
    return { fontWeight: "600" as const, ...sizes[size], ...variants[variant] };
  };

  return (
    <TouchableOpacity
      style={[getContainerStyle(), style]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.78}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "primary" || variant === "destructive"
              ? "#fff"
              : colors.cta
          }
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}
