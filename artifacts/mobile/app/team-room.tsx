import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { onSnapshot } from "firebase/firestore";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { MIN_TOUCH } from "@/lib/design";
import { db } from "@/lib/firebase";
import { markRoomRead, roomQuery, sendTeamMessage, type TeamMessage } from "@/lib/teamroom";

/**
 * The organization's room.
 *
 * One channel per company, no membership to manage and no permission to hold —
 * the channel id is the org id, and being in the org is the whole entitlement.
 *
 * Unlike the website, this pulls the most recent page rather than the entire
 * history: a channel with a year of chatter in it would otherwise download in
 * full on every open, over mobile data. Newest-first from Firestore feeds an
 * inverted list directly, which is also how the list wants its data.
 *
 * Messages are immutable — the rules grant create and nothing else — so there
 * is no long-press to edit or delete, and the footer says so instead of
 * offering an action that would be refused.
 */
export default function TeamRoomScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useAuthGuard();

  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<TextInput>(null);

  const orgId = user?.organizationId;

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    const unsub = onSnapshot(
      roomQuery(db, orgId),
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TeamMessage));
        setLoading(false);
      },
      (e) => {
        if (__DEV__) console.warn("[TeamRoom]", e.message);
        setLoading(false);
      }
    );
    return unsub;
  }, [orgId]);

  // The badge lives on the notifications, not on the room — so opening the room
  // is what clears it. Re-run when a message arrives while the screen is open,
  // which the website does not do and which leaves its badge stale.
  useEffect(() => {
    if (!user?.uid || messages.length === 0) return;
    void markRoomRead(db, user.uid).catch(() => {});
  }, [user?.uid, messages.length]);

  const rows = useMemo(() => withDateRows(messages, isRTL, { today: t.room.today, yesterday: t.room.yesterday }), [
    messages,
    isRTL,
    t.room.today,
    t.room.yesterday,
  ]);

  const send = async () => {
    const body = text.trim();
    if (!body || !user || sending) return;
    setSending(true);
    setText("");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await sendTeamMessage(db, {
        uid: user.uid,
        name: user.displayName || user.email,
        organizationId: user.organizationId,
      }, body);
    } catch {
      // Only the message itself failing puts the draft back; the summary and
      // the fan-out are best-effort and never reach here.
      setText(body);
    } finally {
      setSending(false);
    }
  };

  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.room.title}
        subtitle={t.room.subtitle.replace("{org}", user?.orgName || "")}
        showBack
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.cta} />
          </View>
        ) : messages.length === 0 ? (
          <EmptyState icon="message-square" title={t.room.empty} subtitle={t.room.emptyHint} />
        ) : (
          <FlatList keyboardShouldPersistTaps="handled"
            inverted
            data={rows}
            keyExtractor={(r) => r.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
            renderItem={({ item }) => {
              if (item.kind === "date") {
                return (
                  <View style={styles.dateWrap}>
                    <Text style={[styles.dateLabel, { color: colors.outline, backgroundColor: colors.muted }]}>
                      {item.label}
                    </Text>
                  </View>
                );
              }
              const m = item.message;
              const mine = m.senderId === user?.uid;
              return (
                <View style={[styles.bubbleRow, { justifyContent: mine ? "flex-end" : "flex-start" }]}>
                  <View
                    style={[
                      styles.bubble,
                      {
                        backgroundColor: mine ? colors.cta : colors.card,
                        borderColor: mine ? colors.cta : colors.border,
                      },
                    ]}
                  >
                    {/* A room has many voices, so every message but your own
                        names the person who said it. A 1:1 chat does not. */}
                    {!mine && (
                      <Text style={[styles.sender, { color: colors.accentText, textAlign: align }]} numberOfLines={1}>
                        {m.senderName}
                      </Text>
                    )}
                    <Text
                      style={[styles.text, { color: mine ? colors.ctaForeground : colors.foreground, textAlign: align }]}
                    >
                      {m.text}
                    </Text>
                    <Text
                      style={[
                        styles.time,
                        { color: mine ? colors.ctaForeground : colors.outline, textAlign: isRTL ? "left" : "right" },
                      ]}
                    >
                      {timeLabel(m.createdAt, isRTL)}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListHeaderComponent={
              <Text style={[styles.footnote, { color: colors.outline }]}>{t.room.permanent}</Text>
            }
          />
        )}

        <View
          style={[
            styles.composer,
            {
              flexDirection: row,
              borderTopColor: colors.border,
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder={t.room.placeholder}
            placeholderTextColor={colors.outline}
            multiline
            style={[
              styles.input,
              { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, textAlign: align },
            ]}
          />
          <Pressable
            onPress={send}
            disabled={!text.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel={t.room.send}
            style={[
              styles.sendBtn,
              { backgroundColor: text.trim() && !sending ? colors.cta : colors.muted },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.ctaForeground} />
            ) : (
              <Feather
                name={isRTL ? "arrow-left" : "arrow-right"}
                size={18}
                color={text.trim() ? colors.ctaForeground : colors.outline}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

type Row =
  | { kind: "message"; id: string; message: TeamMessage }
  | { kind: "date"; id: string; label: string };

const toDate = (ts: unknown): Date | null => {
  if (!ts) return null;
  // Team messages carry a Firestore Timestamp; be tolerant of an ISO string in
  // case an older client wrote one.
  const t = ts as { toDate?: () => Date };
  try {
    return typeof t.toDate === "function" ? t.toDate() : new Date(ts as string);
  } catch {
    return null;
  }
};

function timeLabel(ts: unknown, isRTL: boolean): string {
  const d = toDate(ts);
  if (!d) return "";
  return d.toLocaleTimeString(isRTL ? "ar-SA" : "en-SA", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Date separators for an inverted list.
 *
 * The data is newest-first, so a separator belongs AFTER the last message of a
 * day — which, inverted, draws it above that day's block on screen.
 */
function withDateRows(
  messages: TeamMessage[],
  isRTL: boolean,
  labels: { today: string; yesterday: string }
): Row[] {
  const rows: Row[] = [];
  let lastKey = "";
  for (const m of messages) {
    rows.push({ kind: "message", id: m.id, message: m });
    const d = toDate(m.createdAt);
    const key = d ? d.toDateString() : "";
    if (key && key !== lastKey) {
      lastKey = key;
      rows.push({ kind: "date", id: `d:${key}`, label: dateLabel(d!, isRTL, labels) });
    }
  }
  return rows;
}

function dateLabel(d: Date, isRTL: boolean, labels: { today: string; yesterday: string }): string {
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return labels.today;
  if (new Date(now.getTime() - 86400000).toDateString() === d.toDateString()) return labels.yesterday;
  return d.toLocaleDateString(isRTL ? "ar-SA" : "en-SA", { weekday: "long", month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  bubbleRow: { flexDirection: "row", marginBottom: 8 },
  bubble: { maxWidth: "82%", borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9, gap: 2 },
  sender: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  text: { fontSize: 14, lineHeight: 24, fontFamily: "Inter_400Regular" },
  time: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular", opacity: 0.75, marginTop: 2 },
  dateWrap: { alignItems: "center", marginVertical: 10 },
  dateLabel: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_500Medium", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, overflow: "hidden" },
  footnote: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_400Regular", textAlign: "center", paddingVertical: 10 },
  composer: { alignItems: "flex-end", gap: 8, borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 10 },
  input: { flex: 1, maxHeight: 120, minHeight: MIN_TOUCH, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, fontSize: 14, fontFamily: "Inter_400Regular" },
  sendBtn: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: MIN_TOUCH / 2, alignItems: "center", justifyContent: "center" },
});
