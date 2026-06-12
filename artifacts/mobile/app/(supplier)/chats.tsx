import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useT, useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";

interface ChatThread {
  id: string;
  rfqId: string;
  contractorOrgId: string;
  supplierOrgId: string;
  rfqTitle?: string;
  lastMessage?: string;
  unreadContractor?: number;
  unreadSupplier?: number;
  updatedAt?: any;
}

export default function SupplierChatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const t = useT();
  const { isRTL } = useLanguage();
  const [chats, setChats] = useState<ChatThread[]>([]);

  useEffect(() => {
    if (!user?.organizationId) return;
    const q = query(
      collection(db, "chats"),
      where("supplierOrgId", "==", user.organizationId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatThread)));
    });
    return unsub;
  }, [user?.organizationId]);

  const formatTime = (ts: any) => {
    if (!ts) return "";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
      if (isToday) return d.toLocaleTimeString(isRTL ? "ar-SA" : "en-SA", { hour: "2-digit", minute: "2-digit" });
      if (isYesterday) return isRTL ? "أمس" : "Yesterday";
      return d.toLocaleDateString(isRTL ? "ar-SA" : "en-SA", { month: "short", day: "numeric" });
    } catch { return ""; }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.tabs.messages} />

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const unread = item.unreadSupplier ?? 0;
          const hasUnread = unread > 0;
          return (
            <TouchableOpacity
              style={[styles.chatItem, { borderBottomColor: colors.border + "40" }]}
              onPress={() => router.push(`/chat/${item.id}`)}
              activeOpacity={0.7}
            >
              {/* Avatar with unread indicator */}
              <View style={styles.avatarCol}>
                <View style={[styles.avatar, { backgroundColor: hasUnread ? colors.primary + "18" : colors.muted + "60" }]}>
                  <Feather name="message-circle" size={22} color={hasUnread ? colors.primary : colors.outline} />
                </View>
                {hasUnread && <View style={[styles.unreadDot, { backgroundColor: colors.destructive }]} />}
              </View>

              {/* Content */}
              <View style={[styles.contentCol, { marginLeft: isRTL ? 0 : 14, marginRight: isRTL ? 14 : 0 }]}>
                {/* Top row: title + time */}
                <View style={[styles.topRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text
                    style={[
                      styles.chatTitle,
                      { color: colors.foreground },
                      hasUnread && { fontFamily: "Inter_700Bold" },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.rfqTitle ?? `RFQ #${item.rfqId.slice(0, 8)}`}
                  </Text>
                  {item.updatedAt && (
                    <Text style={[styles.time, { color: colors.outline, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]}>
                      {formatTime(item.updatedAt)}
                    </Text>
                  )}
                </View>

                {/* Bottom row: last message + unread badge */}
                <View style={[styles.bottomRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text
                    style={[
                      styles.lastMsg,
                      { color: hasUnread ? colors.foreground : colors.outline },
                      hasUnread && { fontFamily: "Inter_500Medium" },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.lastMessage ?? t.chat.noMessages}
                  </Text>
                  {hasUnread && (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Chevron */}
              <Feather
                name={isRTL ? "chevron-left" : "chevron-right"}
                size={16}
                color={colors.border}
                style={{ marginLeft: isRTL ? 0 : 4, marginRight: isRTL ? 4 : 0 }}
              />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<EmptyState icon="message-circle" title={t.chat.noConversations} subtitle={t.chat.noConversationsDesc} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { paddingTop: 4 },

  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },

  avatarCol: {
    position: "relative",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  contentCol: {
    flex: 1,
    gap: 6,
    justifyContent: "center",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    flexShrink: 1,
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flexShrink: 0,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastMsg: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    flexShrink: 1,
    lineHeight: 18,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700" as const,
    fontFamily: "Inter_700Bold",
  },
});
