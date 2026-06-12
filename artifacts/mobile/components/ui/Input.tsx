import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Animated,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Feather.glyphMap;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  isRTL?: boolean;
  required?: boolean;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  isRTL = false,
  required = false,
  style,
  ...props
}: InputProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused || !!error ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused, error]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, error ? colors.destructive : colors.primary],
  });

  const sp = colors.spacing;
  const typo = colors.typography;

  const hasMessage = !!error || !!helperText;

  const iconSize = 16;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={{
            fontSize: typo.label.fontSize,
            fontWeight: typo.label.fontWeight,
            lineHeight: typo.label.lineHeight,
            letterSpacing: typo.label.letterSpacing,
            color: colors.onSurfaceVariant,
            textAlign: isRTL ? "right" : "left",
            textTransform: "uppercase",
          }}
        >
          {label}
          {required && <Text style={{ color: colors.destructive }}> *</Text>}
        </Text>
      )}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor,
            backgroundColor: colors.surfaceGray,
            borderRadius: colors.radius3xl,
            borderWidth: focused ? 2 : 1,
            minHeight: 52,
            paddingHorizontal: 16,
          },
        ]}
      >
        {leftIcon && (
          <View style={{ marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }}>
            <Feather
              name={leftIcon}
              size={iconSize}
              color={focused ? colors.primary : colors.outline}
            />
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            {
              fontSize: typo.bodySm.fontSize,
              lineHeight: typo.bodySm.lineHeight,
              color: colors.foreground,
              textAlign: isRTL ? "right" : "left",
              writingDirection: isRTL ? "rtl" : "ltr",
            },
            style,
          ]}
          placeholderTextColor={colors.outline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          accessibilityState={{ invalid: !!error } as Record<string, unknown>}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={{
              justifyContent: "center",
              alignItems: "center",
              padding: 6,
              marginLeft: isRTL ? 0 : 2,
              marginRight: isRTL ? 2 : 0,
            }}
          >
            <Feather name={rightIcon} size={iconSize} color={colors.outline} />
          </TouchableOpacity>
        )}
      </Animated.View>
      {hasMessage && (
        <Text
          style={{
            fontSize: typo.caption.fontSize,
            lineHeight: typo.caption.lineHeight,
            color: error ? colors.destructive : colors.outline,
            textAlign: isRTL ? "right" : "left",
            marginTop: sp.xs,
            marginLeft: sp.xs,
            marginRight: sp.xs,
          }}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 4 },
});
