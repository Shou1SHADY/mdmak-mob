import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, Platform, KeyboardAvoidingView,
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
import { useT, useLanguage } from "@/context/LanguageContext";
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
  const t = useT();
  const { isRTL } = useLanguage();
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
      return d.toLocaleTimeString(isRTL ? "ar-SA" : "en-SA", { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10), backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: "700" as const, color: colors.foreground }}>{t.chat.title}</Text>
          <Text style={{ fontSize: 11, color: colors.outline, marginTop: 1 }}>#{chatId?.slice(0, 8)}</Text>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 6 }}
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.uid;
          return (
            <View style={[isMe ? { justifyContent: "flex-end" } : { justifyContent: "flex-start" }, { flexDirection: "row", marginBottom: 4 }]}>
              <View
                style={{
                  backgroundColor: isMe ? colors.primary : colors.card,
                  borderColor: isMe ? "transparent" : colors.border,
                  borderWidth: isMe ? 0 : 1,
                  borderRadius: 16,
                  maxWidth: "74%",
                  paddingHorizontal: 14,
                  paddingVertical: 9,
                  gap: 2,
                }}
              >
                <Text style={{ fontSize: 15, lineHeight: 21, color: isMe ? "#fff" : colors.foreground }}>{item.text}</Text>
                <Text style={{ fontSize: 10, textAlign: isRTL ? "left" : "right", color: isMe ? "rgba(255,255,255,0.6)" : colors.outline }}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
            </View>
          );
        }}
        scrollEnabled={!!messages.length}
      />

      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 10,
          paddingHorizontal: 14,
          paddingTop: 10,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 10 : 8),
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TextInput
          style={{
            flex: 1,
            color: colors.foreground,
            backgroundColor: colors.surfaceGray,
            borderColor: colors.border,
            borderRadius: 24,
            borderWidth: 1.5,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 15,
            maxHeight: 100,
          }}
          placeholder={t.chat.typeMessage}
          placeholderTextColor={colors.outline}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={{
            width: 42,
            height: 42,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            backgroundColor: text.trim() ? colors.primary : colors.surfaceGray,
          }}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
        >
          <Feather name="send" size={17} color={text.trim() ? "#fff" : colors.outline} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
