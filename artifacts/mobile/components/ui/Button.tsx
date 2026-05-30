import React, { useRef } from "react";
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
  View,
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
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: colors.radiusMd,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      minHeight: 48,
      opacity: disabled ? 0.5 : 1,
      ...colors.shadow.sm,
    };
    const sizes: Record<Size, ViewStyle> = {
      sm: { paddingHorizontal: colors.spacing.base, paddingVertical: colors.spacing.sm },
      md: { paddingHorizontal: colors.spacing.lg, paddingVertical: colors.spacing.md },
      lg: { paddingHorizontal: colors.spacing.xl, paddingVertical: colors.spacing.base },
    };
    const variants: Record<Variant, ViewStyle> = {
      primary: {
        backgroundColor: colors.cta,
        borderWidth: 1,
        borderColor: colors.primary,
      },
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
    const variants: Record<Variant, TextStyle> = {
      primary: { color: colors.ctaForeground },
      secondary: { color: colors.secondary },
      ghost: { color: colors.cta },
      destructive: { color: colors.destructiveForeground },
      outline: { color: colors.foreground },
    };
    return { ...colors.typography.button, ...variants[variant] };
  };

  const spinnerColor =
    variant === "primary" || variant === "destructive"
      ? variant === "primary"
        ? colors.ctaForeground
        : colors.destructiveForeground
      : colors.cta;

  const isInteractive = !disabled && !loading;

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth && { width: "100%" },
      ]}
    >
      <TouchableOpacity
        style={[getContainerStyle(), style]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={!isInteractive}
        activeOpacity={isInteractive ? 0.78 : 1}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
        accessible={true}
        hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
      >
        <Text style={[getTextStyle(), textStyle, { opacity: loading ? 0 : 1 }]}>
          {title}
        </Text>
        {loading && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="small" color={spinnerColor} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
