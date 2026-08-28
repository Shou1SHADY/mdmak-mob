import React, { useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Platform, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { tabScreenBottomPadding } from "@/lib/layout";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useNotifications, AppNotification } from "@/hooks/useNotifications";
import { EmptyState } from "@/components/ui/EmptyState";

// ─── Icon + color + navigation by notification type ──────────────────────────
function notifMeta(type: string, colors: ReturnType<typeof useColors>) {
  switch (type) {
    case "new_offer":
      return { icon: "tag" as const, color: colors.cta, nav: (n: AppNotification) => n.rfqId ? `/(contractor)/rfqs/${n.rfqId}` : null };
    case "offer_accepted":
      return { icon: "check-circle" as const, color: colors.success, nav: (n: AppNotification) => n.rfqId ? `/(contractor)/rfqs/${n.rfqId}` : null };
    case "offer_rejected":
      return { icon: "x-circle" as const, color: colors.destructive, nav: (n: AppNotification) => n.rfqId ? `/(contractor)/rfqs/${n.rfqId}` : null };
    case "price_reduction_requested":
      return { icon: "trending-down" as const, color: colors.warning, nav: (n: AppNotification) => n.rfqId ? `/(contractor)/rfqs/${n.rfqId}` : null };
    case "price_updated":
      return { icon: "refresh-cw" as const, color: colors.cta, nav: (n: AppNotification) => n.rfqId ? `/(contractor)/rfqs/${n.rfqId}` : null };
    case "offer_withdrawn":
      return { icon: "slash" as const, color: colors.outline, nav: (n: AppNotification) => n.rfqId ? `/(contractor)/rfqs/${n.rfqId}` : null };
    case "new_chat_message":
    case "new_message":
      return { icon: "message-circle" as const, color: colors.primaryText, nav: (n: AppNotification) => (n.chatId ?? n.relatedId) ? `/chat/${n.chatId ?? n.relatedId}` : null };
    case "sample_sent":
      return { icon: "package" as const, color: colors.warning, nav: (n: AppNotification) => n.rfqId ? `/(contractor)/rfqs/${n.rfqId}` : null };
    case "delivery_notice":
    case "supply_completed":
      return { icon: "truck" as const, color: colors.success, nav: (n: AppNotification) => n.rfqId ? `/(contractor)/rfqs/${n.rfqId}` : null };
    default:
      return { icon: "bell" as const, color: colors.accent, nav: () => null };
  }
}

function formatRelativeTime(ts: any, isRTL: boolean): string {
  if (!ts) return "";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (mins < 1) return isRTL ? "الآن" : "just now";
    if (mins < 60) return isRTL ? `منذ ${mins} دقيقة` : `${mins}m ago`;
    if (hours < 24) return isRTL ? `منذ ${hours} ساعة` : `${hours}h ago`;
    if (days === 1) return isRTL ? "أمس" : "Yesterday";
    if (days < 7) return isRTL ? `منذ ${days} أيام` : `${days}d ago`;
    return d.toLocaleDateString(isRTL ? "ar-SA" : "en-SA", { month: "short", day: "numeric" });
  } catch { return ""; }
}

// ─── Notification card ────────────────────────────────────────────────────────
function NotifCard({
  item, onPress, isRTL, colors, fallbackTitle,
}: {
  item: AppNotification;
  onPress: () => void;
  isRTL: boolean;
  colors: ReturnType<typeof useColors>;
  fallbackTitle: string;
}) {
  const { icon, color } = notifMeta(item.type, colors);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: item.read ? colors.card : colors.cta + "07",
          borderColor: item.read ? colors.border : colors.cta + "25",
          ...colors.shadow.sm,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      {!item.read && <View style={[styles.unreadStrip, { backgroundColor: colors.accent }]} />}

      <View style={[styles.cardInner, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {/* Icon badge */}
        <View style={[styles.iconBox, { backgroundColor: color + "18" }]}>
          <Feather name={icon} size={18} color={color} />
        </View>

        {/* Text block */}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={[styles.titleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text
              style={[
                styles.notifTitle,
                { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
                !item.read && { fontFamily: "Inter_700Bold" },
              ]}
              numberOfLines={2}
            >
              {item.title || (item.type === "new_chat_message" || item.type === "new_message" ? fallbackTitle : "")}
            </Text>
            {!item.read && <View style={[styles.dot, { backgroundColor: colors.accent }]} />}
          </View>

          {(item.message ?? item.body) ? (
            <Text
              style={[styles.notifBody, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
              numberOfLines={2}
            >
              {item.message ?? item.body}
            </Text>
          ) : null}

          <View style={[styles.footer, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Text style={[styles.time, { color: colors.outline }]}>
              {formatRelativeTime(item.createdAt, isRTL)}
            </Text>
            {!item.read && (
              <View style={[styles.unreadPill, { backgroundColor: colors.accent + "18" }]}>
                <Text style={[styles.unreadPillText, { color: colors.accent }]}>
                  {isRTL ? "جديد" : "New"}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Chevron */}
        <Feather
          name={isRTL ? "chevron-left" : "chevron-right"}
          size={14}
          color={colors.border}
          style={{ marginTop: 2 }}
        />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ContractorNotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { isRTL } = useLanguage();
  const { notifications, loading, error, unreadCount, markRead, markAllRead } = useNotifications();

  const handlePress = useCallback(async (item: AppNotification) => {
    await markRead(item.id);
    const { nav } = notifMeta(item.type, colors);
    const path = nav(item);
    if (path) router.push(path as any);
  }, [markRead, colors]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Gradient header */}
      <LinearGradient
        colors={colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 52 : 16) }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel={t.common.back}
          accessibilityRole="button"
        >
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.headerTitle, { fontFamily: "HankenGrotesk_700Bold" }]}>
            {t.tabs.notifications}
          </Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>
              {unreadCount} {isRTL ? "غير مقروءة" : "unread"}
            </Text>
          )}
        </View>

        {/* Mark all read */}
        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={markAllRead}
            accessibilityRole="button"
          >
            <Feather name="check-square" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </LinearGradient>

      {/* Error banner */}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "12", borderBottomColor: colors.destructive + "25" }]}>
          <Feather name="alert-triangle" size={14} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {isRTL ? "تعذّر تحميل الإشعارات" : "Failed to load notifications"}
          </Text>
        </View>
      )}

      {/* Loading */}
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.outline }]}>
            {isRTL ? "جارٍ التحميل..." : "Loading..."}
          </Text>
        </View>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: tabScreenBottomPadding(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <NotifCard
            item={item}
            onPress={() => handlePress(item)}
            isRTL={isRTL}
            colors={colors}
            fallbackTitle={t.chat.newMessage}
          />
        )}
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState
              icon="bell"
              title={t.notifications.noNotifications}
              subtitle={t.notifications.allCaughtUp}
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerTitle: { fontSize: 18, color: "#FFFFFF" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 },
  markAllBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    justifyContent: "center",
  },
  loadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },

  list: { padding: 14, paddingTop: 16 },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  unreadStrip: { height: 3, width: "100%" },
  cardInner: { padding: 14, gap: 12, alignItems: "flex-start" },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  titleRow: { alignItems: "flex-start", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, flexShrink: 0 },
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

  footer: { alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
  unreadPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  unreadPillText: { fontSize: 10, fontFamily: "Inter_700Bold" },
});
