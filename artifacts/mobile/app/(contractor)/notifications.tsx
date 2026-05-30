import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Platform,
} from "react-native";
import { router } from "expo-router";
import { collection, query, getDocs, updateDoc, doc, orderBy } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { EmptyState } from "@/components/ui/EmptyState";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt?: any;
  relatedId?: string;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const t = useT();
  const { isRTL } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    try {
      const q = query(
        collection(db, "users", user.uid, "notifications"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification)));
    } catch (e) {
      console.warn("[Notifications] Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifs(); }, [user?.uid]);

  const markRead = async (notif: Notification) => {
    if (!notif.read && user?.uid) {
      await updateDoc(doc(db, "users", user.uid, "notifications", notif.id), { read: true });
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return "";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString("en-SA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{t.tabs.notifications}</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notifItem, { borderBottomColor: colors.border, backgroundColor: item.read ? "transparent" : colors.primary + "08" }]}
            onPress={() => markRead(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.dot, { backgroundColor: item.read ? "transparent" : colors.primary }]} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.notifTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}>{item.title}</Text>
              <Text style={[styles.notifBody, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={2}>{item.body}</Text>
              {item.createdAt && (
                <Text style={[styles.time, { color: colors.mutedForeground }]}>{formatTime(item.createdAt)}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState icon="bell" title={t.notifications.noNotifications} subtitle={t.notifications.allCaughtUp} />}
        scrollEnabled={!!notifications.length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: "700" as const },
  list: { paddingTop: 8 },
  notifItem: { flexDirection: "row", gap: 14, padding: 16, borderBottomWidth: 1, alignItems: "flex-start" },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  notifTitle: { fontSize: 15, fontWeight: "600" as const },
  notifBody: { fontSize: 13, lineHeight: 19 },
  time: { fontSize: 12, marginTop: 2 },
});
