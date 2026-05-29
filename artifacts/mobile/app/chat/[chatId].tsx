import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Platform, KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, updateDoc, doc,
} from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp?: any;
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("timestamp", "desc")
    );
    return onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
    });
  }, [chatId]);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    const msg = text.trim();
    setText("");
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await addDoc(collection(db, "messages"), {
        chatId, senderId: user?.uid, text: msg,
        timestamp: serverTimestamp(), read: false,
      });
      await updateDoc(doc(db, "chats", chatId), { lastMessage: msg, updatedAt: serverTimestamp() });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return "";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Dark header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10),
            backgroundColor: colors.primary,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#F8FAFC" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>Chat</Text>
          <Text style={styles.headerSub}>#{chatId?.slice(0, 8)}</Text>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.msgList}
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.uid;
          return (
            <View style={[styles.msgRow, isMe ? styles.msgMe : styles.msgOther]}>
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: isMe ? colors.cta : colors.card,
                    borderColor: isMe ? "transparent" : colors.border,
                    borderWidth: isMe ? 0 : 1,
                    borderRadius: isMe
                      ? { borderRadius: 16, borderBottomRightRadius: 4 } as any
                      : 16,
                  },
                ]}
              >
                <Text style={[styles.msgText, { color: isMe ? "#fff" : colors.foreground }]}>{item.text}</Text>
                <Text style={[styles.msgTime, { color: isMe ? "rgba(255,255,255,0.6)" : colors.mutedForeground }]}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
            </View>
          );
        }}
        scrollEnabled={!!messages.length}
      />

      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 10 : 8),
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: colors.foreground,
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderRadius: colors.radiusSm,
            },
          ]}
          placeholder="Type a message..."
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            {
              backgroundColor: text.trim() ? colors.cta : colors.muted,
              borderRadius: colors.radiusSm,
            },
          ]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          <Feather name="send" size={17} color={text.trim() ? "#fff" : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14 },
  backBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontWeight: "700" as const, color: "#F8FAFC" },
  headerSub: { fontSize: 11, color: "rgba(248,250,252,0.55)", marginTop: 1 },
  msgList: { paddingHorizontal: 16, paddingVertical: 16, gap: 6 },
  msgRow: { flexDirection: "row", marginBottom: 4 },
  msgMe: { justifyContent: "flex-end" },
  msgOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "74%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9, gap: 2 },
  msgText: { fontSize: 15, lineHeight: 21 },
  msgTime: { fontSize: 10, textAlign: "right" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
});
