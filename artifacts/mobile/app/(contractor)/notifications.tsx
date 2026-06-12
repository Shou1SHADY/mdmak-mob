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

  const getIcon = (title: string) => {
    if (title.includes("عرض") || title.includes("offer")) return "tag";
    if (title.includes("RFQ") || title.includes("طلب")) return "file-text";
    if (title.includes("chat") || title.includes("رسالة")) return "message-circle";
    if (title.includes("accept") || title.includes("قبول")) return "check-circle";
    if (title.includes("reject") || title.includes("رفض")) return "x-circle";
    return "bell";
  };

  const getIconColor = (title: string) => {
    if (title.includes("accept") || title.includes("قبول")) return colors.success;
    if (title.includes("reject") || title.includes("رفض")) return colors.destructive;
    if (title.includes("عرض") || title.includes("offer")) return colors.cta;
    if (title.includes("RFQ") || title.includes("طلب")) return colors.primary;
    return colors.warning;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[
        styles.topBar,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 48 : 12),
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}>
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
        renderItem={({ item }) => {
          const icon = getIcon(item.title);
          const iconColor = getIconColor(item.title);
          return (
            <TouchableOpacity
              style={[
                styles.notifItem,
                {
                  borderBottomColor: colors.border + "60",
                  backgroundColor: item.read ? "transparent" : colors.primary + "06",
                },
              ]}
              onPress={() => markRead(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: iconColor + "15" }]}>
                <Feather name={icon as any} size={18} color={iconColor} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={[styles.notifHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text
                    style={[
                      styles.notifTitle,
                      { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
                    ]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.title}
                  </Text>
                  {!item.read && (
                    <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
                <Text
                  style={[
                    styles.notifBody,
                    { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
                  ]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {item.message ?? item.body ?? ""}
                </Text>
                {item.createdAt && (
                  <Text style={[styles.time, { color: colors.outline }]}>
                    {formatTime(item.createdAt)}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
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
  title: { fontSize: 18, fontWeight: "700" as const, fontFamily: "HankenGrotesk_700Bold" },
  list: { paddingTop: 8 },
  notifItem: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderBottomWidth: 1,
    alignItems: "flex-start",
  },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 2 },
  notifHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notifTitle: { fontSize: 15, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold", flex: 1 },
  notifBody: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  time: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
});
