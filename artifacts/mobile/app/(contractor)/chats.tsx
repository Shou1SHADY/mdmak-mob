import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Platform,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { EmptyState } from "@/components/ui/EmptyState";

interface ChatThread {
  id: string;
  rfqId: string;
  contractorOrgId: string;
  supplierOrgId: string;
  lastMessage?: string;
  unreadContractor?: number;
  unreadSupplier?: number;
  rfqTitle?: string;
  partnerName?: string;
  updatedAt?: any;
}

export default function ContractorChatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatThread[]>([]);

  useEffect(() => {
    if (!user?.organizationId) return;
    const q = query(
      collection(db, "chats"),
      where("contractorOrgId", "==", user.organizationId)
    );
    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatThread)));
    });
    return unsub;
  }, [user?.organizationId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Messages</Text>
      </View>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
        renderItem={({ item }) => {
          const unread = item.unreadContractor ?? 0;
          return (
            <TouchableOpacity
              style={[styles.chatItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push(`/chat/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                <Feather name="message-circle" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.chatTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {item.rfqTitle ?? `RFQ #${item.rfqId.slice(0, 8)}`}
                </Text>
                <Text style={[styles.lastMsg, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {item.lastMessage ?? "No messages yet"}
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
        ListEmptyComponent={<EmptyState icon="message-circle" title="No conversations" subtitle="Chats with suppliers will appear here" />}
        scrollEnabled={!!chats.length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 24, fontWeight: "700" as const },
  list: { paddingTop: 8 },
  chatItem: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderBottomWidth: 1 },
  avatar: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  chatTitle: { fontSize: 15, fontWeight: "600" as const },
  lastMsg: { fontSize: 13 },
  badge: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" as const },
});
