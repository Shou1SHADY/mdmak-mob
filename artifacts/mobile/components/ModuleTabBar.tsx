import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import {
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_OFFSET,
} from "@/lib/layout";

/**
 * The bottom tab bar every module uses.
 *
 * Entering a module used to replace the role tab bar with nothing, leaving a
 * back arrow as the only way out and no sign of the module's other screens —
 * so CRM looked like four unrelated pages reached one at a time. A module keeps
 * its own bar, listing its own screens, exactly as it has its own sidebar
 * section on the website.
 *
 * Extracted rather than copied so a module bar can never drift from the role
 * bar: same geometry, same colours, same floating treatment. The measurements
 * live in lib/layout.ts, which is also what screens pad against.
 */

export function moduleTabScreenOptions(colors: ReturnType<typeof useColors>, insetBottom: number) {
  const isWeb = Platform.OS === "web";
  const tabBarStyle = isWeb
    ? {
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        height: 82,
        paddingBottom: 14,
        paddingTop: 6,
        paddingHorizontal: 12,
        elevation: 0,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      }
    : {
        // Floating, matching the role bar. Screens reserve room for it through
        // tabScreenBottomPadding, so the two must stay in step.
        position: "absolute" as const,
        left: 12,
        right: 12,
        bottom: (insetBottom || 0) + FLOATING_TAB_BAR_OFFSET,
        height: FLOATING_TAB_BAR_HEIGHT,
        borderRadius: 22,
        backgroundColor: colors.surface,
        borderTopWidth: 0,
        paddingBottom: 6,
        paddingTop: 0,
        paddingHorizontal: 4,
        shadowColor: "#0A1120",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 28,
        elevation: 18,
      };

  return {
    headerShown: false,
    tabBarActiveTintColor: colors.cta,
    tabBarInactiveTintColor: colors.outline,
    tabBarStyle: tabBarStyle as never,
    tabBarLabelStyle: {
      // The label has to FIT. Each bar leaves the item 62-66px of usable
      // height; a 32px icon plus a 20px line plus the item's own padding
      // overflowed that and sheared the bottom off every label.
      fontSize: 12,
      lineHeight: 16,
      fontFamily: "Inter_600SemiBold",
      marginTop: 2,
    } as never,
    tabBarItemStyle: { paddingVertical: 4, gap: 0 } as never,
  };
}

/** The pill behind the active tab's icon, matching the role bar's treatment. */
export function ModuleTabIcon({
  name,
  focused,
}: {
  name: keyof typeof Feather.glyphMap;
  focused: boolean;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.iconWrap,
        focused && {
          backgroundColor: colors.cta + "18",
          borderColor: colors.cta + "22",
          borderWidth: 1,
        },
      ]}
    >
      <Feather name={name} size={21} color={focused ? colors.cta : colors.outline} />
    </View>
  );
}

/** Convenience for a module layout: options plus the safe-area inset it needs. */
export function useModuleTabOptions() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return moduleTabScreenOptions(colors, insets.bottom);
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 46,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
});
