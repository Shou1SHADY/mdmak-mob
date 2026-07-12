import React, {
  useRef,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { useAIChat, type AIChatMessage, type PendingAction, type NavLink } from '@/hooks/useAIChat';

// ── Constants ─────────────────────────────────────────────────────────────────

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = Math.round(SCREEN_H * 0.70);
const TAB_BAR_H = 72;
const FAB_SIZE = 52;

// ── Path resolver: web paths → Expo Router paths ──────────────────────────────

function resolveNavPath(webPath: string): string {
  return webPath
    .replace(/^\/contractor\/rfqs\/([^/]+)\/offers$/, '/(contractor)/rfqs/$1')
    .replace(/^\/contractor\/rfqs\/([^/]+)$/, '/(contractor)/rfqs/$1')
    .replace(/^\/contractor\/rfqs$/, '/(contractor)/rfqs')
    .replace(/^\/contractor\/suppliers$/, '/(contractor)/rfqs')
    .replace(/^\/supplier\/rfqs$/, '/(supplier)/rfqs')
    .replace(/^\/supplier\/rfq\/([^/]+)$/, '/(supplier)/rfq/$1')
    .replace(/^\/supplier\/offers$/, '/(supplier)/offers')
    .replace(/^\/admin\/rfqs\/([^/]+)$/, '/(admin)/rfqs/$1')
    .replace(/^\/admin\/rfqs$/, '/(admin)/rfqs');
}

// ── i18n strings ──────────────────────────────────────────────────────────────

const STRINGS = {
  ar: {
    title: 'المساعد الذكي',
    subtitle: 'مدعوم بمدماك تيك',
    placeholder: 'اسأل عن بياناتك...',
    thinking: 'جارٍ التحليل...',
    confirm: 'تأكيد',
    dismiss: 'إلغاء',
    done: 'تم تنفيذ الإجراء بنجاح',
    open: 'مساعد مدماك الذكي',
    close: 'إغلاق',
    clear: 'مسح المحادثة',
    price: 'السعر',
    sar: 'ر.س',
    actionFailed: 'فشل تنفيذ الإجراء. يرجى المحاولة مرة أخرى.',
    welcome: {
      Contractor: 'مرحباً! يمكنني مساعدتك في إدارة طلبات العروض ومراجعة الأسعار الواردة.',
      Supplier: 'مرحباً! يمكنني مساعدتك في البحث عن طلبات العروض وتقديم عروض أسعار.',
      Admin: 'مرحباً! يمكنني مساعدتك في استعراض إحصائيات المنصة.',
    },
    prompts: {
      Contractor: ['كم طلب عروض لديّ؟', 'أحدث العروض الواردة', 'ابحث عن موردين'],
      Supplier: ['طلبات العروض المتاحة', 'كم عرضاً قدمت؟', 'طلبات في الرياض'],
      Admin: ['إحصائيات المنصة', 'عدد المستخدمين', 'أكثر الفئات نشاطاً'],
    },
  },
  en: {
    title: 'AI Assistant',
    subtitle: 'Powered by Mdmak Tech',
    placeholder: 'Ask about your data...',
    thinking: 'Thinking...',
    confirm: 'Confirm',
    dismiss: 'Cancel',
    done: 'Action completed successfully',
    open: 'Mdmak AI Assistant',
    close: 'Close',
    clear: 'Clear chat',
    price: 'Price',
    sar: 'SAR',
    actionFailed: 'Action failed. Please try again.',
    welcome: {
      Contractor: "Hello! I can help you manage RFQs and review incoming offers.",
      Supplier: "Hello! I can help you find available RFQs and submit offers.",
      Admin: "Hello! I can help you review platform statistics.",
    },
    prompts: {
      Contractor: ["How many RFQs do I have?", "Latest incoming offers?", "Find suppliers"],
      Supplier: ["Available RFQs for me?", "How many offers submitted?", "RFQs in Riyadh"],
      Admin: ["Platform statistics", "Active users count", "Top categories"],
    },
  },
} as const;

type Role = 'Contractor' | 'Supplier' | 'Admin';

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingDots({ color }: { color: string }) {
  const anim = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    const pulses = anim.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(v, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.delay(600),
        ])
      )
    );
    Animated.parallel(pulses).start();
    return () => pulses.forEach(p => p.stop());
  }, [anim]);

  return (
    <View style={styles.dotsRow}>
      {anim.map((v, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: color, opacity: v },
          ]}
        />
      ))}
    </View>
  );
}

function ActionCard({
  msg,
  strings,
  colors,
  onConfirm,
  onDismiss,
}: {
  msg: AIChatMessage;
  strings: (typeof STRINGS)[keyof typeof STRINGS];
  colors: ReturnType<typeof useColors>;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const action = msg.pendingAction as PendingAction;

  if (msg.actionExecuted) {
    return (
      <View style={[styles.actionDone, { backgroundColor: colors.success + '18' }]}>
        <Feather name="check-circle" size={13} color={colors.success} />
        <Text style={[styles.actionDoneText, { color: colors.success }]}>
          {strings.done}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.actionCard, { borderColor: colors.accent + '30', backgroundColor: colors.accent + '08' }]}>
      <View style={styles.actionHeader}>
        <Feather name="zap" size={13} color={colors.accent} />
        <View style={{ flex: 1, marginStart: 8 }}>
          <Text style={[styles.actionLabel, { color: colors.accent }]}>{action.label}</Text>
          <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>{action.description}</Text>
        </View>
      </View>

      {action.type === 'submitOffer' && action.params.price != null && (
        <View style={[styles.priceRow, { backgroundColor: colors.surface }]}>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>{strings.price}: </Text>
          <Text style={[styles.priceValue, { color: colors.foreground }]}>
            {action.params.price} {strings.sar}
          </Text>
        </View>
      )}

      <View style={styles.actionBtns}>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.accent }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onConfirm(); }}
          activeOpacity={0.8}
        >
          <Feather name="check" size={13} color="#fff" />
          <Text style={styles.confirmBtnText}>{strings.confirm}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dismissBtn, { borderColor: colors.border }]}
          onPress={onDismiss}
          activeOpacity={0.7}
        >
          <Text style={[styles.dismissBtnText, { color: colors.mutedForeground }]}>{strings.dismiss}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NavLinkChips({
  links,
  colors,
}: {
  links: NavLink[];
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.navLinks}>
      {links.map(link => (
        <TouchableOpacity
          key={link.path}
          style={[styles.navChip, { borderColor: colors.accent + '40', backgroundColor: colors.accent + '10' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(resolveNavPath(link.path) as any);
          }}
          activeOpacity={0.7}
        >
          <Feather name="external-link" size={11} color={colors.accent} />
          <Text style={[styles.navChipText, { color: colors.accent }]}>{link.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function MessageBubble({
  msg,
  strings,
  colors,
  onConfirm,
  onDismiss,
}: {
  msg: AIChatMessage;
  strings: (typeof STRINGS)[keyof typeof STRINGS];
  colors: ReturnType<typeof useColors>;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const isUser = msg.role === 'user';

  return (
    <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.accent + '20' }]}>
          <Feather name="cpu" size={12} color={colors.accent} />
        </View>
      )}

      <View style={[styles.msgContent, isUser && styles.msgContentUser]}>
        <View style={[
          styles.bubble,
          isUser
            ? { backgroundColor: colors.cta, borderBottomEndRadius: 4 }
            : { backgroundColor: colors.surface, borderBottomStartRadius: 4, borderWidth: 1, borderColor: colors.border },
        ]}>
          {msg.isLoading ? (
            <LoadingDots color={colors.mutedForeground} />
          ) : (
            <Text style={[
              styles.bubbleText,
              { color: isUser ? colors.ctaForeground : colors.foreground },
            ]}>
              {msg.content}
            </Text>
          )}
        </View>

        {msg.navLinks && msg.navLinks.length > 0 && (
          <NavLinkChips links={msg.navLinks} colors={colors} />
        )}

        {msg.pendingAction && (
          <ActionCard
            msg={msg}
            strings={strings}
            colors={colors}
            onConfirm={onConfirm}
            onDismiss={onDismiss}
          />
        )}
      </View>

      {isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Feather name="user" size={12} color={colors.primaryForeground} />
        </View>
      )}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface AIChatWidgetProps {
  userRole: Role;
}

export function AIChatWidget({ userRole }: AIChatWidgetProps) {
  const colors = useColors();
  const { language, isRTL } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const S = STRINGS[language];
  const { messages, isLoading, sendMessage, confirmAction, dismissAction, clear } = useAIChat();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [inputH, setInputH] = useState(40);
  const [actionError, setActionError] = useState<string | null>(null);

  const translateY = useRef(new Animated.Value(SHEET_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const fabBottom = (insets.bottom || 0) + TAB_BAR_H + 20;

  // Animate sheet open/close
  const openSheet = useCallback(() => {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, damping: 28, stiffness: 300, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start(() => setTimeout(() => inputRef.current?.focus(), 100));
  }, [translateY, backdropOpacity]);

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: SHEET_H, duration: 260, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setIsOpen(false));
  }, [translateY, backdropOpacity]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const q = input.trim();
    if (!q || isLoading) return;
    setInput('');
    setInputH(40);
    setActionError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await sendMessage(q, language);
  }, [input, isLoading, sendMessage, language]);

  const handleConfirmAction = useCallback(async (messageId: string) => {
    setActionError(null);
    try {
      await confirmAction(messageId);
    } catch {
      setActionError(S.actionFailed);
    }
  }, [confirmAction, S]);

  if (!user) return null;

  const hasMessages = messages.length > 0;

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
      </Animated.View>

      {/* Bottom sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            height: SHEET_H,
            backgroundColor: colors.background,
            transform: [{ translateY }],
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* Header */}
        <LinearGradient
          colors={colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Feather name="cpu" size={16} color={colors.accent} />
            </View>
            <View>
              <Text style={styles.headerTitle}>{S.title}</Text>
              <View style={styles.headerSubRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.headerSub}>{S.subtitle}</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerActions}>
            {hasMessages && (
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => { clear(); setActionError(null); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="trash-2" size={15} color="rgba(255,255,255,0.55)" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={closeSheet}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={17} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!hasMessages ? (
            <View style={styles.welcomeWrap}>
              <View style={[styles.welcomeIcon, { backgroundColor: colors.accent + '18', borderColor: colors.accent + '30' }]}>
                <Feather name="cpu" size={26} color={colors.accent} />
              </View>
              <Text style={[styles.welcomeText, { color: colors.mutedForeground }]}>
                {S.welcome[userRole]}
              </Text>
              <View style={styles.promptsWrap}>
                {S.prompts[userRole].map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.promptChip, { borderColor: colors.accent + '40' }]}
                    onPress={() => setInput(p)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.promptChipText, { color: colors.accent }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                strings={S}
                colors={colors}
                onConfirm={() => handleConfirmAction(msg.id)}
                onDismiss={() => dismissAction(msg.id)}
              />
            ))
          )}

          {actionError && (
            <Text style={[styles.actionError, { color: colors.destructive }]}>{actionError}</Text>
          )}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputWrap, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder={S.placeholder}
            placeholderTextColor={colors.mutedForeground}
            multiline
            style={[
              styles.input,
              {
                height: Math.min(inputH, 90),
                color: colors.foreground,
                backgroundColor: colors.muted,
                borderColor: colors.border,
                textAlign: isRTL ? 'right' : 'left',
                fontFamily: isRTL ? undefined : 'Inter_400Regular',
              },
            ]}
            onContentSizeChange={e =>
              setInputH(Math.max(40, e.nativeEvent.contentSize.height + 4))
            }
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            editable={!isLoading}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: input.trim() && !isLoading ? colors.accent : colors.muted },
            ]}
            onPress={handleSend}
            disabled={!input.trim() || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Feather
                name="send"
                size={16}
                color={input.trim() ? '#fff' : colors.mutedForeground}
                style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
              />
            )}
          </TouchableOpacity>
        </View>

        {isLoading && (
          <Text style={[styles.thinkingText, { color: colors.mutedForeground }]}>{S.thinking}</Text>
        )}
      </Animated.View>

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            bottom: fabBottom,
            [isRTL ? 'left' : 'right']: 16,
            shadowColor: colors.primary,
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          isOpen ? closeSheet() : openSheet();
        }}
        activeOpacity={0.85}
        accessibilityLabel={isOpen ? S.close : S.open}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[colors.accent, colors.cta]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Feather name={isOpen ? 'x' : 'cpu'} size={22} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 40,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: { elevation: 24 },
    }),
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(32,203,213,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 18,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  headerBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 14,
    paddingBottom: 8,
    flexGrow: 1,
  },
  welcomeWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  welcomeIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    fontFamily: 'Inter_400Regular',
  },
  promptsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  promptChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  promptChipText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  msgRowUser: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  msgContent: {
    flex: 1,
    alignItems: 'flex-start',
    maxWidth: '82%',
  },
  msgContentUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    maxWidth: '100%',
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Inter_400Regular',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  navLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  navChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  navChipText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  actionCard: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    width: '100%',
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 16,
  },
  actionDesc: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    lineHeight: 15,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
  priceValue: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  actionBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  dismissBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  actionDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionDoneText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  actionError: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    marginTop: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    lineHeight: 18,
    minHeight: 40,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingText: {
    textAlign: 'center',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    paddingBottom: 6,
  },
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    zIndex: 45,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 12,
      },
      android: { elevation: 10 },
    }),
  },
  fabGradient: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
