import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import colors from "@/constants/colors";
import { useColors } from "@/hooks/useColors";
import { useLanguage } from "@/context/LanguageContext";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

/** Icon per tone; the colours come from the theme, below. */
const TOAST_ICON: Record<ToastType, keyof typeof Feather.glyphMap> = {
  success: "check-circle",
  error: "alert-circle",
  info: "info",
  warning: "alert-triangle",
};

/**
 * The toast is the app's success channel, so it follows the palette rather than
 * carrying its own colours: the fixed greens and reds here were the values
 * constants/colors.ts retired for failing AA (#12A063 at 3.4:1), they never
 * answered dark mode, and each tone's foreground token is the one checked
 * against it by `npm run check:contrast`.
 */
function toneOf(c: ReturnType<typeof useColors>, type: ToastType): { bg: string; fg: string } {
  switch (type) {
    case "success": return { bg: c.success, fg: c.successForeground };
    case "error": return { bg: c.destructive, fg: c.destructiveForeground };
    case "warning": return { bg: c.warning, fg: c.warningForeground };
    default: return { bg: c.cta, fg: c.ctaForeground };
  }
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissed = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(handleDismiss, 3000);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(toast.id));
  }, [toast.id, onDismiss, translateY, opacity]);

  const themeColors = useColors();
  const { isRTL } = useLanguage();
  const tone = toneOf(themeColors, toast.type);

  return (
    <Animated.View
      style={[
        styles.toast,
        colors.shadow.md,
        // The row mirrors like every other row in the app: in Arabic the icon
        // leads from the right and the dismiss sits on the left.
        { flexDirection: isRTL ? "row-reverse" : "row" },
        { backgroundColor: tone.bg, transform: [{ translateY }], opacity },
      ]}
      accessibilityRole="alert"
    >
      <Feather name={TOAST_ICON[toast.type]} size={18} color={tone.fg} style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
      <View style={styles.messageContainer}>
        <Text
          style={[styles.messageText, { color: tone.fg, textAlign: isRTL ? "right" : "left" }]}
          numberOfLines={2}
        >
          {toast.message}
        </Text>
      </View>
      <Pressable onPress={handleDismiss} hitSlop={8} style={isRTL ? styles.closeButtonRtl : styles.closeButton} accessibilityRole="button">
        <Feather name="x" size={18} color={tone.fg} />
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const insets = useSafeAreaInsets();

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2, 7) + Date.now().toString(36);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  toast: {
    minHeight: 48,
    borderRadius: colors.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    alignItems: "center",
  },
  messageContainer: {
    flex: 1,
  },
  messageText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 24,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
  closeButtonRtl: {
    marginRight: 8,
    padding: 4,
  },
});
