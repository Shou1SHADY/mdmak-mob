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
    outputRange: [colors.border, error ? colors.destructive : colors.accent],
  });

  const sp = colors.spacing;
  const typo = colors.typography;

  const hasMessage = !!error || !!helperText;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={{
            fontSize: typo.label.fontSize,
            fontWeight: typo.label.fontWeight,
            lineHeight: typo.label.lineHeight,
            color: colors.secondary,
            textAlign: isRTL ? "right" : "left",
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
            backgroundColor: colors.card,
            borderRadius: colors.radiusSm,
            borderWidth: focused ? 2 : 1.5,
            minHeight: 48,
            paddingHorizontal: sp.base,
          },
          focused ? colors.shadow.sm : colors.shadow.none,
        ]}
      >
        {leftIcon && (
          <Feather
            name={leftIcon}
            size={17}
            color={focused ? colors.accent : colors.mutedForeground}
            style={{
              marginRight: isRTL ? 0 : sp.sm,
              marginLeft: isRTL ? sp.sm : 0,
            }}
          />
        )}
        <TextInput
          style={[
            styles.input,
            {
              fontSize: typo.body.fontSize,
              lineHeight: typo.body.lineHeight,
              color: colors.foreground,
              textAlign: isRTL ? "right" : "left",
            },
            style,
          ]}
          placeholderTextColor={colors.mutedForeground}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          accessibilityState={{ invalid: !!error } as Record<string, unknown>}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={{
              padding: sp.xs,
              marginLeft: isRTL ? 0 : sp.xs,
              marginRight: isRTL ? sp.xs : 0,
            }}
          >
            <Feather name={rightIcon} size={17} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </Animated.View>
      {hasMessage && (
        <Text
          style={{
            fontSize: typo.caption.fontSize,
            lineHeight: typo.caption.lineHeight,
            color: error ? colors.destructive : colors.mutedForeground,
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
  container: { gap: 6 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: { flex: 1, paddingVertical: 12 },
});
