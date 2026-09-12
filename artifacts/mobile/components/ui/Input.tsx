import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity, ViewStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { type, space, radius, MIN_TOUCH } from "@/lib/design";

/**
 * The one text field. A quiet filled box on the card, the control radius, a
 * label above in the caption size — not shouted in uppercase, which Arabic
 * cannot do anyway — and one line under it for an error or a hint.
 */
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Feather.glyphMap;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightIconPress?: () => void;
  /** Read by screen readers for the right-hand icon button (e.g. "Show password"). */
  rightIconLabel?: string;
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
  rightIconLabel,
  containerStyle,
  isRTL = false,
  required = false,
  style,
  multiline,
  ...props
}: InputProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const align = isRTL ? "right" : "left";
  const borderColor = error ? colors.destructive : focused ? colors.cta : colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[type.captionStrong, { color: colors.mutedForeground, textAlign: align }]}>
          {label}
          {required ? <Text style={{ color: colors.destructive }}> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          {
            borderColor,
            borderWidth: focused || error ? 1.5 : 1,
            backgroundColor: colors.surfaceGray,
            borderRadius: radius.control,
            minHeight: multiline ? 96 : 48,
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: multiline ? "flex-start" : "center",
          },
        ]}
      >
        {leftIcon ? (
          <Feather
            name={leftIcon}
            size={16}
            color={focused ? colors.cta : colors.outline}
            style={multiline ? { marginTop: space.md } : undefined}
          />
        ) : null}
        <TextInput
          style={[
            type.body,
            styles.input,
            {
              color: colors.foreground,
              textAlign: align,
              writingDirection: isRTL ? "rtl" : "ltr",
              textAlignVertical: multiline ? "top" : "center",
              paddingVertical: multiline ? space.md : 0,
            },
            style,
          ]}
          placeholderTextColor={colors.outline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          accessibilityState={{ invalid: !!error } as Record<string, unknown>}
          multiline={multiline}
          {...props}
        />
        {rightIcon ? (
          <TouchableOpacity
            onPress={onRightIconPress}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            accessibilityRole="button"
            accessibilityLabel={rightIconLabel}
            style={styles.rightBtn}
          >
            <Feather name={rightIcon} size={16} color={colors.outline} />
          </TouchableOpacity>
        ) : null}
      </View>
      {error || helperText ? (
        <Text style={[type.caption, { color: error ? colors.destructive : colors.outline, textAlign: align }]}>
          {error || helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  field: { paddingHorizontal: space.md, gap: space.sm },
  input: { flex: 1, minHeight: MIN_TOUCH },
  rightBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
});
