import React, { useEffect, useState, useRef } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, Platform,
  KeyboardAvoidingView, Alert, StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  collection, query, where, onSnapshot, orderBy, addDoc, getDocs,
  serverTimestamp, doc, getDoc, updateDoc, arrayRemove, arrayUnion, increment, writeBatch,
} from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useT, useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt?: any;
}

interface ListItem {
  type: "message" | "date";
  id: string;
  data?: Message;
  label?: string;
}

function toDateLabel(ts: any, isRTL: boolean): string {
  if (!ts) return "";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();
    if (isToday) return isRTL ? "اليوم" : "Today";
    if (isYesterday) return isRTL ? "أمس" : "Yesterday";
    return d.toLocaleDateString(isRTL ? "ar-SA" : "en-SA", { weekday: "long", month: "short", day: "numeric" });
  } catch { return ""; }
}

function toTimeLabel(ts: any, isRTL: boolean): string {
  if (!ts) return "";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString(isRTL ? "ar-SA" : "en-SA", { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function buildListItems(messages: Message[], isRTL: boolean): ListItem[] {
  // messages come inverted (newest first), we need newest-first for inverted FlatList
  const result: ListItem[] = [];
  let lastDateKey = "";

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const ts = msg.createdAt;
    const d = ts ? (ts.toDate ? ts.toDate() : new Date(ts)) : null;
    const dateKey = d ? d.toDateString() : "";

    result.push({ type: "message", id: msg.id, data: msg });

    // Insert date separator below this message (inverted list = older messages at bottom)
    if (dateKey && dateKey !== lastDateKey) {
      lastDateKey = dateKey;
      result.push({ type: "date", id: `date-${dateKey}`, label: toDateLabel(ts, isRTL) });
    }
  }
  return result;
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { user } = useAuthGuard();
  const t = useT();
  const { isRTL } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState<string>("");
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);

  const validChatId = chatId && typeof chatId === "string" && chatId.length > 0;

  useEffect(() => {
    if (!validChatId || !user?.uid) return;
    const uid = user.uid;
    getDoc(doc(db, "chats", chatId)).then((snap) => {
      if (!snap.exists()) { setChatError("Chat not found"); return; }
      const data = snap.data();
      setChatTitle(data.rfqTitle || `Chat #${chatId.slice(0, 8)}`);
      const partnerId = data.contractorId === uid ? data.supplierId : data.contractorId;
      if (partnerId) setChatPartnerId(partnerId);
      // Mark chat as read (syncs unread badge on web)
      updateDoc(doc(db, "chats", chatId), {
        unreadFor: arrayRemove(uid),
        [`unreadCounts.${uid}`]: 0,
      }).catch(() => {});
      // Mark any unread chat notifications as read (syncs notification count on mobile)
      getDocs(query(
        collection(db, "users", uid, "notifications"),
        where("chatId", "==", chatId),
        where("read", "==", false)
      )).then((snap) => {
        if (snap.empty) return;
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
        return batch.commit();
      }).catch(() => {});
    }).catch((e) => console.warn("[Chat] fetch error:", e));
  }, [validChatId, chatId, user?.uid]);

  useEffect(() => {
    if (!validChatId) { setChatError(t.common.error); return; }
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setChatError(null);
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
      },
      (err) => setChatError(err.message || "Failed to load messages")
    );
    return unsub;
  }, [validChatId, chatId, t.common.error]);

  const sendMessage = async () => {
    if (!text.trim() || sending || !user?.uid || !validChatId) return;
    const msg = text.trim();
    setText("");
    setSending(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Critical: write the message itself — failure surfaces to the user
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: user.uid, text: msg,
        createdAt: new Date().toISOString(),
      });
      // Non-critical: update chat metadata — errors swallowed so the send
      // still feels successful even if rules deny this secondary write
      updateDoc(doc(db, "chats", chatId), {
        lastMessage: msg,
        updatedAt: serverTimestamp(),
        lastMessageSenderId: user.uid,
        ...(chatPartnerId ? {
          unreadFor: arrayUnion(chatPartnerId),
          [`unreadCounts.${chatPartnerId}`]: increment(1),
        } : {}),
      }).catch(() => {});
    } catch (err: any) {
      Alert.alert(t.common.error, err.message || "Failed to send message");
      setText(msg);
    } finally {
      setSending(false);
    }
  };

  const listItems = buildListItems(messages, isRTL);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <LinearGradient
        colors={colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 48 : 10) }]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBackBtn}
          accessibilityLabel={t.common.back}
          accessibilityRole="button"
        >
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={[styles.headerInfo, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
            {chatTitle || t.chat.title}
          </Text>
          <Text style={styles.headerSub}>#{chatId?.slice(0, 8)}</Text>
        </View>
        <View style={[styles.headerStatusDot, { backgroundColor: colors.success }]} />
      </LinearGradient>

      {/* Error banner */}
      {chatError && (
        <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "15", borderBottomColor: colors.destructive + "30" }]}>
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{chatError}</Text>
        </View>
      )}

      {/* Messages */}
      <View style={[styles.messagesArea, { backgroundColor: colors.background }]}>
        {/* Subtle dot pattern overlay for chat area */}
        <View style={[StyleSheet.absoluteFillObject, styles.chatBg, { backgroundColor: colors.muted + "30" }]} pointerEvents="none" />

        <FlatList
          data={listItems}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            if (item.type === "date") {
              return (
                <View style={styles.dateSeparator}>
                  <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                  <View style={[styles.datePill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.dateText, { color: colors.outline }]}>{item.label}</Text>
                  </View>
                  <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
                </View>
              );
            }

            const msg = item.data!;
            const isMe = msg.senderId === user?.uid;
            const isRTLAlign = isMe ? isRTL : !isRTL;

            // Look ahead to check if next message is from same sender (for tail logic)
            const nextItem = listItems[index + 1];
            const nextMsg = nextItem?.type === "message" ? nextItem.data : null;
            const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;

            // Directional bubble corners
            const myRadius = isRTL
              ? { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: isLastInGroup ? 4 : 18 }
              : { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: isLastInGroup ? 4 : 18 };
            const theirRadius = isRTL
              ? { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: isLastInGroup ? 4 : 18 }
              : { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomRightRadius: 18, borderBottomLeftRadius: isLastInGroup ? 4 : 18 };

            return (
              <View
                style={[
                  styles.msgRow,
                  { justifyContent: isMe ? (isRTL ? "flex-start" : "flex-end") : (isRTL ? "flex-end" : "flex-start") },
                  !isLastInGroup && { marginBottom: 2 },
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isMe ? myRadius : theirRadius,
                    isMe
                      ? { backgroundColor: colors.primary, ...colors.shadow.sm }
                      : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, ...colors.shadow.sm },
                  ]}
                  accessibilityRole="text"
                >
                  <Text style={[styles.bubbleText, { color: isMe ? "#FFFFFF" : colors.foreground }]}>
                    {msg.text}
                  </Text>
                  <View style={[styles.bubbleMeta, { justifyContent: isRTL ? "flex-start" : "flex-end" }]}>
                    <Text style={[styles.bubbleTime, { color: isMe ? "rgba(255,255,255,0.55)" : colors.outline }]}>
                      {toTimeLabel(msg.createdAt, isRTL)}
                    </Text>
                    {isMe && (
                      <Feather name="check" size={10} color="rgba(255,255,255,0.55)" />
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            !chatError ? (
              <View style={styles.emptyChat}>
                <View style={[styles.emptyChatIcon, { backgroundColor: colors.muted }]}>
                  <Feather name="message-circle" size={28} color={colors.outline} />
                </View>
                <Text style={[styles.emptyChatText, { color: colors.outline }]}>
                  {t.chat.noMessages}
                </Text>
                <Text style={[styles.emptyChatSub, { color: colors.outline }]}>
                  {t.chat.sendFirst}
                </Text>
              </View>
            ) : null
          }
        />
      </View>

      {/* Input area */}
      <View
        style={[
          styles.inputArea,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 10 : 6),
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: colors.foreground,
              backgroundColor: colors.muted,
              borderColor: text.trim() ? colors.cta + "60" : colors.border,
            },
          ]}
          placeholder={t.chat.typeMessage}
          placeholderTextColor={colors.outline}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
          textAlign={isRTL ? "right" : "left"}
          accessibilityLabel={t.chat.typeMessage}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            { backgroundColor: text.trim() ? colors.cta : colors.muted },
            text.trim() ? colors.shadow.md : {},
          ]}
          onPress={sendMessage}
          disabled={!text.trim() || sending || !validChatId}
          accessibilityLabel={t.common.send || "Send"}
          accessibilityRole="button"
        >
          {sending ? (
            <Text style={{ color: "#FFFFFF", fontSize: 12 }}>…</Text>
          ) : (
            <Feather
              name={isRTL ? "send" : "send"}
              size={17}
              color={text.trim() ? "#FFFFFF" : colors.outline}
              style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerInfo: { flex: 1, gap: 2 },
  headerTitle: { fontSize: 15, fontFamily: "HankenGrotesk_700Bold", color: "#FFFFFF" },
  headerSub: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)" },
  headerStatusDot: { width: 8, height: 8, borderRadius: 4 },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },

  messagesArea: { flex: 1, overflow: "hidden" },
  chatBg: { opacity: 1 },
  messagesList: { paddingHorizontal: 14, paddingVertical: 16, gap: 8 },

  msgRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: 13,
    paddingTop: 9,
    paddingBottom: 6,
    gap: 2,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  bubbleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  bubbleTime: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },

  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 8,
  },
  dateLine: { flex: 1, height: StyleSheet.hairlineWidth },
  datePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  dateText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  emptyChat: { alignItems: "center", gap: 10, paddingVertical: 60 },
  emptyChatIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyChatText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyChatSub: { fontSize: 13, fontFamily: "Inter_400Regular" },

  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
});
