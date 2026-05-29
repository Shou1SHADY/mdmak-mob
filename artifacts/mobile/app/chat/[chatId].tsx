import React, { useEffect, useState, useRef } from "react";
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
  read?: boolean;
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
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
    });
    return unsub;
  }, [chatId]);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    const msg = text.trim();
    setText("");
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await addDoc(collection(db, "messages"), {
        chatId,
        senderId: user?.uid,
        text: msg,
        timestamp: serverTimestamp(),
        read: false,
      });
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: msg,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn(e);
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
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Chat</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>#{chatId?.slice(0, 8)}</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={[styles.msgList, { paddingBottom: 16 }]}
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.uid;
          return (
            <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowOther]}>
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: isMe ? colors.primary : colors.card,
                    borderColor: isMe ? "transparent" : colors.border,
                    borderWidth: isMe ? 0 : 1,
                  },
                ]}
              >
                <Text style={[styles.msgText, { color: isMe ? "#fff" : colors.foreground }]}>{item.text}</Text>
                <Text style={[styles.msgTime, { color: isMe ? "rgba(255,255,255,0.65)" : colors.mutedForeground }]}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
            </View>
          );
        }}
        scrollEnabled={!!messages.length}
      />

      {/* Input */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 8),
          },
        ]}
      >
        <TextInput
          style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
          placeholder="Type a message..."
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: text.trim() ? colors.primary : colors.muted }]}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          <Feather name="send" size={18} color={text.trim() ? "#fff" : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: "700" as const },
  headerSub: { fontSize: 12, marginTop: 1 },
  msgList: { paddingHorizontal: 16, paddingTop: 16, gap: 8, flexGrow: 1, justifyContent: "flex-end" },
  msgRow: { flexDirection: "row", marginBottom: 6 },
  msgRowMe: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "75%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, gap: 3 },
  msgText: { fontSize: 15, lineHeight: 21 },
  msgTime: { fontSize: 11, textAlign: "right" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
});
