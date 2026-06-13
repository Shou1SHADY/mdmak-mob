import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, Platform, KeyboardAvoidingView, Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, setDoc, getDoc,
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
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState<string>("");

  // Validate chatId
  const validChatId = chatId && typeof chatId === "string" && chatId.length > 0;

  // Load chat metadata
  useEffect(() => {
    if (!validChatId) return;
    const fetchChat = async () => {
      try {
        const chatDoc = await getDoc(doc(db, "chats", chatId));
        if (chatDoc.exists()) {
          setChatTitle(chatDoc.data().rfqTitle || `Chat #${chatId.slice(0, 8)}`);
        } else {
          setChatError("Chat not found");
        }
      } catch (e: any) {
        console.warn("[Chat] Fetch chat error:", e);
      }
    };
    fetchChat();
  }, [validChatId, chatId]);

  // Messages listener with error handling
  useEffect(() => {
    if (!validChatId) {
      setChatError(t.common.error);
      return;
    }
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setChatError(null);
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
      },
      (err) => {
        setChatError(err.message || "Failed to load messages");
      }
    );
    return unsub;
  }, [validChatId, chatId, t.common.error]);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;
    if (!user?.uid) {
      Alert.alert(t.common.error, "You must be signed in to send messages");
      return;
    }
    if (!validChatId) {
      Alert.alert(t.common.error, "Invalid chat ID");
      return;
    }

    const msg = text.trim();
    setText("");
    setSending(true);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // 1. Create message
      await addDoc(collection(db, "messages"), {
        chatId,
        senderId: user.uid,
        text: msg,
        timestamp: serverTimestamp(),
        read: false,
      });

      // 2. Update chat metadata (setDoc with merge creates if missing)
      await setDoc(
        doc(db, "chats", chatId),
        {
          lastMessage: msg,
          updatedAt: serverTimestamp(),
          lastMessageSenderId: user.uid,
        },
        { merge: true }
      );
    } catch (err: any) {
      Alert.alert(t.common.error, err.message || "Failed to send message");
      setText(msg); // restore text so user can retry
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
      {/* Header */}
      <View
        style={[
          { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, paddingTop: insets.top + (Platform.OS === "web" ? 48 : 10), backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel={t.common.back} accessibilityRole="button">
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: isRTL ? 0 : 10, marginRight: isRTL ? 10 : 0 }}>
          <Text style={{ fontSize: 15, fontWeight: "700" as const, color: colors.foreground, textAlign: isRTL ? "right" : "left" }} numberOfLines={1} ellipsizeMode="tail">
            {chatTitle || t.chat.title}
          </Text>
          <Text style={{ fontSize: 11, color: colors.outline, marginTop: 1, textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>
            #{chatId?.slice(0, 8)}
          </Text>
        </View>
      </View>

      {/* Error banner */}
      {chatError && (
        <View style={{ backgroundColor: colors.destructive + "15", padding: 12, borderBottomWidth: 1, borderBottomColor: colors.destructive + "30" }}>
          <Text style={{ color: colors.destructive, fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" }}>
            {chatError}
          </Text>
        </View>
      )}

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
        ListEmptyComponent={
          !chatError ? (
            <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
              <Feather name="message-circle" size={32} color={colors.outline} />
              <Text style={{ color: colors.outline, fontSize: 14, fontFamily: "Inter_500Medium" }}>
                {t.chat.noMessages}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Input area */}
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
          disabled={!text.trim() || sending || !validChatId}
          accessibilityLabel={t.common.send || "Send"}
          accessibilityRole="button"
        >
          {sending ? (
            <Text style={{ color: text.trim() ? "#FFFFFF" : colors.outline, fontSize: 12 }}>…</Text>
          ) : (
            <Feather name="send" size={17} color={text.trim() ? "#FFFFFF" : colors.outline} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
