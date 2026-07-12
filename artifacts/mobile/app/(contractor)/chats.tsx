import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Platform,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useT, useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { EmptyState } from "@/components/ui/EmptyState";

interface ChatThread {
  id: string;
  rfqId: string;
  contractorOrgId: string;
  supplierOrgId: string;
  lastMessage?: string;
  unreadFor?: string[];
  unreadCounts?: Record<string, number>;
  rfqTitle?: string;
  partnerName?: string;
  lastMessageAt?: any;
  updatedAt?: any;
  createdAt?: any;
}

// Handles both website timestamps (ISO strings) and legacy Firestore Timestamps
function toMillis(ts: any): number {
  if (!ts) return 0;
  if (typeof ts.toDate === "function") return ts.toDate().getTime();
  const ms = new Date(ts).getTime();
  return isNaN(ms) ? 0 : ms;
}

function initials(str?: string) {
  if (!str) return "?";
  const words = str.trim().split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

const AVATAR_COLORS = ["#0369A1", "#0891B2", "#7C3AED", "#059669", "#D97706", "#DC2626"];
function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function ContractorChatsScreen() {
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
      where("contractorOrgId", "==", user.organizationId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatThread));
      items.sort((a, b) => {
        const ta = toMillis(a.lastMessageAt ?? a.updatedAt ?? a.createdAt);
        const tb = toMillis(b.lastMessageAt ?? b.updatedAt ?? b.createdAt);
        return tb - ta;
      });
      setChats(items);
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

  const totalUnread = chats.filter(c => Array.isArray(c.unreadFor) && c.unreadFor.includes(user?.uid ?? "")).length;

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
            {t.tabs.messages}
          </Text>
          {totalUnread > 0 && (
            <Text style={styles.headerSub}>
              {totalUnread} {isRTL ? "رسالة غير مقروءة" : "unread"}
            </Text>
          )}
        </View>
        <View style={{ width: 44 }} />
      </LinearGradient>

      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => {
          const hasUnread = Array.isArray(item.unreadFor) && item.unreadFor.includes(user?.uid ?? "");
          const unread = item.unreadCounts?.[user?.uid ?? ""] ?? (hasUnread ? 1 : 0);
          const title = item.rfqTitle ?? `RFQ #${item.rfqId?.slice(0, 8)}`;
          const color = avatarColor(item.id);

          return (
            <TouchableOpacity
              style={[
                styles.card,
                {
                  backgroundColor: colors.card,
                  borderColor: hasUnread ? colors.accent + "40" : colors.border,
                  ...colors.shadow.sm,
                },
              ]}
              onPress={() => router.push(`/chat/${item.id}`)}
              activeOpacity={0.72}
            >
              {/* Unread left accent bar */}
              {hasUnread && (
                <View style={[styles.accentBar, { backgroundColor: colors.accent }]} />
              )}

              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: color + "20", borderColor: color + "30" }]}>
                <Text style={[styles.avatarText, { color }]}>{initials(title)}</Text>
                {hasUnread && (
                  <View style={[styles.unreadDot, { backgroundColor: colors.accent, borderColor: colors.card }]} />
                )}
              </View>

              {/* Content */}
              <View style={[styles.content, { marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }]}>
                <View style={[styles.topRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text
                    style={[styles.chatTitle, { color: colors.foreground, fontFamily: hasUnread ? "Inter_700Bold" : "Inter_600SemiBold" }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {title}
                  </Text>
                  <Text style={[styles.time, { color: hasUnread ? colors.accent : colors.outline }]}>
                    {formatTime(item.lastMessageAt ?? item.updatedAt ?? item.createdAt)}
                  </Text>
                </View>

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
                    {item.lastMessage ?? (isRTL ? "لا توجد رسائل بعد" : "No messages yet")}
                  </Text>
                  {hasUnread ? (
                    <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                      <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
                    </View>
                  ) : (
                    <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={14} color={colors.outline} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="message-circle"
            title={t.chat.noConversations}
            subtitle={t.chat.noConversationsDesc}
          />
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
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerTitle: { fontSize: 18, color: "#FFFFFF" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", fontFamily: "Inter_400Regular", marginTop: 2 },

  list: { padding: 14, paddingTop: 16 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    overflow: "hidden",
  },

  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  avatarText: { fontSize: 17, fontFamily: "HankenGrotesk_700Bold" },
  unreadDot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
  },

  content: { flex: 1, gap: 5 },

  topRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  chatTitle: { fontSize: 14, flex: 1, flexShrink: 1 },
  time: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },

  bottomRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
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
  },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
});
