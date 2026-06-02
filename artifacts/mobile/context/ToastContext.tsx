import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import colors from "@/constants/colors";

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

const TOAST_CONFIG: Record<ToastType, { bg: string; icon: keyof typeof Feather.glyphMap }> = {
  success: { bg: "rgba(18, 160, 99, 0.92)", icon: "check-circle" },
  error: { bg: "rgba(239, 68, 68, 0.92)", icon: "alert-circle" },
  info: { bg: "rgba(3, 105, 161, 0.92)", icon: "info" },
  warning: { bg: "rgba(245, 158, 11, 0.92)", icon: "alert-triangle" },
};

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

  const config = TOAST_CONFIG[toast.type];

  return (
    <Animated.View
      style={[
        styles.toast,
        colors.shadow.md,
        { backgroundColor: config.bg, transform: [{ translateY }], opacity },
      ]}
    >
      <Feather name={config.icon} size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
      <View style={styles.messageContainer}>
        <Text style={styles.messageText} numberOfLines={2}>
          {toast.message}
        </Text>
      </View>
      <Pressable onPress={handleDismiss} hitSlop={8} style={styles.closeButton}>
        <Feather name="x" size={18} color="rgba(255,255,255,0.8)" />
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
    flexDirection: "row",
    alignItems: "center",
  },
  messageContainer: {
    flex: 1,
  },
  messageText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});
