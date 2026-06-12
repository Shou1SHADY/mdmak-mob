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
        <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel={t.common.back} accessibilityRole="button">
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0 }}>
          <Text style={{ fontSize: 15, fontWeight: "700" as const, color: colors.foreground, textAlign: isRTL ? "right" : "left" }} numberOfLines={1} ellipsizeMode="tail">{t.chat.title}</Text>
          <Text style={{ fontSize: 11, color: colors.outline, marginTop: 1, textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>#{chatId?.slice(0, 8)}</Text>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 6 }}
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.uid;
          const align =
            isMe
              ? isRTL ? "flex-start" : "flex-end"
              : isRTL ? "flex-end" : "flex-start";
          return (
            <View style={{ flexDirection: "row", justifyContent: align as any, marginBottom: 4 }}>
              <View
                style={{
                  backgroundColor: isMe ? colors.primary : colors.surface,
                  borderColor: isMe ? "transparent" : colors.border,
                  borderWidth: isMe ? 0 : 1,
                  borderRadius: 18,
                  maxWidth: "74%",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  gap: 3,
                  ...colors.shadow.sm,
                }}
                accessibilityLabel={isMe ? `${t.chat.sentByYou}: ${item.text}` : item.text}
                accessibilityRole="text"
              >
                <Text style={{ fontSize: 15, lineHeight: 22, color: isMe ? "#FFFFFF" : colors.foreground }}>
                  {item.text}
                </Text>
                <Text style={{
                  fontSize: 10,
                  textAlign: isRTL ? "left" : "right",
                  color: isMe ? colors.textWhite60 : colors.outline,
                }}>
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
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          ...colors.shadow.nav,
        }}
      >
        <TextInput
          style={{
            flex: 1,
            color: colors.foreground,
            backgroundColor: colors.muted,
            borderColor: colors.border,
            borderRadius: 24,
            borderWidth: 1.5,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 15,
            maxHeight: 100,
            lineHeight: 22,
          }}
          placeholder={t.chat.typeMessage}
          placeholderTextColor={colors.outline}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          accessibilityLabel={t.chat.typeMessage}
        />
        <TouchableOpacity
          style={{
            width: 44,
            height: 44,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 14,
            backgroundColor: text.trim() ? colors.cta : colors.muted,
            ...(text.trim() ? colors.shadow.md : {}),
          }}
          onPress={sendMessage}
          disabled={!text.trim() || sending}
          accessibilityLabel={t.common.send || "Send"}
          accessibilityRole="button"
        >
          <Feather name="send" size={17} color={text.trim() ? "#FFFFFF" : colors.outline} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
