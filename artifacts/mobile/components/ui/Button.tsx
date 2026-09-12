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
import { type, space, radius, MIN_TOUCH } from "@/lib/design";

/**
 * The one button. Five variants say what a press does — primary for the
 * screen's main action, secondary for a soft alternative, outline for a quiet
 * peer, ghost for text-only, destructive for what cannot be undone — and three
 * sizes; the smallest still meets the 44px touch minimum through its hit slop.
 */

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
  /** Read by screen readers when the title alone is ambiguous. */
  accessibilityLabel?: string;
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
  accessibilityLabel,
}: ButtonProps) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, { toValue: 0.97, duration: 90, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }).start();
  };
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const sizes: Record<Size, ViewStyle> = {
    sm: { minHeight: 40, paddingHorizontal: space.md, paddingVertical: space.sm },
    md: { minHeight: 48, paddingHorizontal: space.lg, paddingVertical: space.md },
    lg: { minHeight: 52, paddingHorizontal: space.xl, paddingVertical: space.md },
  };
  const variants: Record<Variant, ViewStyle> = {
    primary: { backgroundColor: colors.cta, ...colors.shadow.sm },
    secondary: { backgroundColor: colors.ctaSoft },
    ghost: { backgroundColor: "transparent" },
    destructive: { backgroundColor: colors.destructive },
    outline: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  };
  const textColors: Record<Variant, string> = {
    primary: colors.ctaForeground,
    secondary: colors.cta,
    ghost: colors.cta,
    destructive: colors.destructiveForeground,
    outline: colors.foreground,
  };

  const containerStyle: ViewStyle = {
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    opacity: disabled ? 0.5 : 1,
    ...sizes[size],
    ...variants[variant],
    ...(fullWidth ? { width: "100%" } : {}),
  };
  const labelStyle: TextStyle = {
    ...(size === "sm" ? type.captionStrong : type.bodyStrong),
    color: textColors[variant],
  };
  const isInteractive = !disabled && !loading;
  const slop = Math.max(0, (MIN_TOUCH - (sizes[size].minHeight as number)) / 2);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && { width: "100%" }]}>
      <TouchableOpacity
        style={[containerStyle, style]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={!isInteractive}
        activeOpacity={isInteractive ? 0.8 : 1}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        accessible
        hitSlop={{ top: slop + 4, bottom: slop + 4, left: 8, right: 8 }}
      >
        <Text style={[labelStyle, textStyle, { opacity: loading ? 0 : 1 }]} numberOfLines={1}>
          {title}
        </Text>
        {loading && (
          <View style={{ position: "absolute", inset: 0, justifyContent: "center", alignItems: "center" } as ViewStyle}>
            <ActivityIndicator size="small" color={textColors[variant]} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
