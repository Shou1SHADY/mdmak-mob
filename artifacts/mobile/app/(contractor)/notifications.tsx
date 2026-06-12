import React from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useNotifications } from "@/hooks/useNotifications";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { isRTL } = useLanguage();
  const { notifications, loading, markRead } = useNotifications();

  const formatTime = (ts: any) => {
    if (!ts) return "";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString(isRTL ? "ar-SA" : "en-SA", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch { return ""; }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, {
        paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
        backgroundColor: colors.background,
        borderBottomColor: colors.border,
      }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
          accessibilityLabel={t.common.back}
          accessibilityRole="button"
        >
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>{t.tabs.notifications}</Text>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.notifItem,
              {
                borderBottomColor: colors.border,
                backgroundColor: item.read ? "transparent" : colors.primary + "08",
              },
            ]}
            onPress={() => markRead(item.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.dot, { backgroundColor: item.read ? "transparent" : colors.primary }]} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text
                style={[styles.notifTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <Text
                style={[styles.notifBody, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                numberOfLines={2}
              >
                {item.message ?? item.body ?? ""}
              </Text>
              {item.createdAt && (
                <Text style={[styles.time, { color: colors.mutedForeground }]}>
                  {formatTime(item.createdAt)}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <EmptyState icon="bell" title={t.notifications.noNotifications} subtitle={t.notifications.allCaughtUp} />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: "700" as const },
  list: { paddingTop: 8 },
  notifItem: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderBottomWidth: 1,
    alignItems: "flex-start",
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  notifTitle: { fontSize: 15, fontWeight: "600" as const },
  notifBody: { fontSize: 13, lineHeight: 19 },
  time: { fontSize: 12, marginTop: 2 },
});
