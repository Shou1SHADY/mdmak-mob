import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Platform,
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
    const q = query(collection(db, "chats"), where("supplierOrgId", "==", user.organizationId));
    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatThread)));
    });
    return unsub;
  }, [user?.organizationId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{t.tabs.messages}</Text>
      </View>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }]}
        renderItem={({ item }) => {
          const unread = item.unreadSupplier ?? 0;
          return (
            <TouchableOpacity
              style={[styles.chatItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push(`/chat/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: colors.accent + "20" }]}>
                <Feather name="message-circle" size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.chatTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
                  {item.rfqTitle ?? `RFQ #${item.rfqId.slice(0, 8)}`}
                </Text>
                <Text style={[styles.lastMsg, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
                  {item.lastMessage ?? t.chat.noMessages}
                </Text>
              </View>
              {unread > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.badgeText}>{unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<EmptyState icon="message-circle" title={t.chat.noConversations} subtitle={t.chat.noConversationsDesc} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 24, fontWeight: "700" as const },
  list: { paddingTop: 8 },
  chatItem: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderBottomWidth: 1 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  chatTitle: { fontSize: 15, fontWeight: "600" as const },
  lastMsg: { fontSize: 13 },
  badge: { width: 22, height: 22, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" as const },
});
