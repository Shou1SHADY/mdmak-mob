import React, { useCallback } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useNotifications, AppNotification } from "@/hooks/useNotifications";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";

function notifMeta(type: string, colors: ReturnType<typeof useColors>) {
  switch (type) {
    case "offer_accepted":
      return { icon: "check-circle" as const, color: colors.success, nav: (n: AppNotification) => n.rfqId ? `/(supplier)/rfq/${n.rfqId}` : null };
    case "offer_rejected":
      return { icon: "x-circle" as const, color: colors.destructive, nav: (n: AppNotification) => n.rfqId ? `/(supplier)/rfq/${n.rfqId}` : null };
    case "price_reduction_requested":
      return { icon: "trending-down" as const, color: colors.warning, nav: (n: AppNotification) => n.rfqId ? `/(supplier)/rfq/${n.rfqId}` : null };
    case "new_chat_message":
    case "new_message":
      return { icon: "message-circle" as const, color: colors.primary, nav: (n: AppNotification) => (n.chatId ?? n.relatedId) ? `/chat/${n.chatId ?? n.relatedId}` : null };
    default:
      return { icon: "bell" as const, color: colors.accent, nav: () => null };
  }
}

export default function SupplierNotificationsScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { notifications, loading, markRead, unreadCount } = useNotifications();

  const handlePress = useCallback(async (item: AppNotification) => {
    await markRead(item.id);
    const { nav } = notifMeta(item.type, colors);
    const path = nav(item);
    if (path) router.push(path as any);
  }, [markRead, colors]);

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
      <ScreenHeader
        title={t.tabs.notifications}
        showBack
        right={
          unreadCount > 0 ? (
            <View style={[styles.unreadBadge, { backgroundColor: colors.destructive }]}>
              <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? "99+" : String(unreadCount)}</Text>
            </View>
          ) : undefined
        }
      />

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 24) },
        ]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const { icon, color: iconColor } = notifMeta(item.type, colors);
          return (
            <TouchableOpacity
              style={[
                styles.card,
                {
                  backgroundColor: item.read ? colors.card : colors.cta + "06",
                  borderColor: item.read ? colors.border : colors.cta + "20",
                },
              ]}
              onPress={() => handlePress(item)}
              activeOpacity={0.75}
            >
              {/* Unread accent strip */}
              {!item.read && (
                <View style={[styles.unreadStrip, { backgroundColor: colors.cta }]} />
              )}

              <View style={[styles.cardInner, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                {/* Icon */}
                <View style={[styles.iconBox, { backgroundColor: iconColor + "15" }]}>
                  <Feather name={icon} size={18} color={iconColor} />
                </View>

                {/* Content */}
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={[styles.titleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Text
                      style={[
                        styles.notifTitle,
                        { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
                        !item.read && { fontFamily: "Inter_700Bold" },
                      ]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    {!item.read && <View style={[styles.dot, { backgroundColor: colors.cta }]} />}
                  </View>

                  {(item.message ?? item.body) ? (
                    <Text
                      style={[styles.notifBody, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                      numberOfLines={2}
                    >
                      {item.message ?? item.body}
                    </Text>
                  ) : null}

                  {item.createdAt ? (
                    <Text style={[styles.time, { color: colors.outline }]}>
                      {formatTime(item.createdAt)}
                    </Text>
                  ) : null}
                </View>
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
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  unreadStrip: {
    height: 3,
    width: "100%",
  },
  cardInner: {
    padding: 14,
    gap: 12,
    alignItems: "flex-start",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  titleRow: {
    alignItems: "flex-start",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
    flexShrink: 0,
  },
  notifTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  notifBody: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});
