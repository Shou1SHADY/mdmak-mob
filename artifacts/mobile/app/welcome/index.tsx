import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isSmall = SCREEN_HEIGHT < 700;

// Illustration area height — adapts to screen
const IMAGE_SECTION_H = Math.round(SCREEN_HEIGHT * (isSmall ? 0.42 : 0.48));

const SLIDES = [
  {
    id: 1,
    titleKey:  "slide1Title"  as const,
    descKey:   "slide1Desc"   as const,
    image:     require("@/assets/images/figma/saudi-professionals.png"),
    chips: [
      { icon: "shield"  as const, labelKey: "secure"        as const },
      { icon: "zap"     as const, labelKey: "fast"          as const },
    ],
  },
  {
    id: 2,
    titleKey: "slide2Title"  as const,
    descKey:  "slide2Desc"   as const,
    image:    require("@/assets/images/figma/saudi-mobile-dev.png"),
    chips: [],
  },
  {
    id: 3,
    titleKey: "slide3Title"  as const,
    descKey:  "slide3Desc"   as const,
    image:    require("@/assets/images/figma/cloud-transformation.png"),
    chips: [
      { icon: "lock" as const, labelKey: "secured"         as const },
      { icon: "zap"  as const, labelKey: "highPerformance" as const },
    ],
  },
];

// Animated pill dot for pagination
function PaginationDot({ active }: { active: boolean }) {
  const animWidth = useRef(new Animated.Value(active ? 24 : 8)).current;
  const animOpacity = useRef(new Animated.Value(active ? 1 : 0.3)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(animWidth,   { toValue: active ? 24 : 8, useNativeDriver: false, tension: 80, friction: 10 }),
      Animated.timing(animOpacity, { toValue: active ? 1 : 0.3, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [active]);

  return (
    <Animated.View style={{ width: animWidth, height: 8, borderRadius: 4, opacity: animOpacity, backgroundColor: "#0369A1" }} />
  );
}

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t      = useT();
  const { isRTL } = useLanguage();

  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLast = currentPage === SLIDES.length - 1;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (page !== currentPage) setCurrentPage(page);
  };

  const goTo = (page: number) => scrollRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Slides ── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexDirection: isRTL ? "row-reverse" : "row" }}
        directionalLockEnabled
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.id} style={styles.page}>

            {/* ── Image section ── */}
            <View style={[styles.imageSection, { height: IMAGE_SECTION_H, backgroundColor: colors.background }]}>
              {/* Illustration */}
              <Image
                source={slide.image}
                style={styles.illustration}
                contentFit="cover"
                transition={250}
              />

              {/* Feature chips */}
              {slide.chips.length > 0 && (
                <View style={styles.chipsRow}>
                  {slide.chips.map((chip) => (
                    <View
                      key={chip.labelKey}
                      style={[styles.chip, { backgroundColor: colors.accentBlueSoft, borderColor: colors.border }]}
                    >
                      <Feather name={chip.icon} size={12} color={colors.cta} />
                      <Text style={[styles.chipText, { color: colors.cta }]}>{t.welcome[chip.labelKey]}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ── Content section ── */}
            <View style={styles.contentSection}>
              {/* Step badge */}
              <View style={[styles.stepBadge, { backgroundColor: colors.accentBlueSoft }]}>
                <Text style={[styles.stepText, { color: colors.cta }]}>
                  {t.welcome.step.replace("{n}", String(index + 1))} / {SLIDES.length}
                </Text>
              </View>

              <Text style={[styles.title, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>
                {t.welcome[slide.titleKey]}
              </Text>
              <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
                {t.welcome[slide.descKey]}
              </Text>
            </View>

          </View>
        ))}
      </ScrollView>

      {/* ── Fixed bottom controls ── */}
      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}>

        {/* Pagination dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <PaginationDot key={i} active={i === currentPage} />
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          {isLast ? (
            /* ── Last slide: full-width Get Started ── */
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1, backgroundColor: colors.cta }]}
              onPress={() => router.replace("/auth/login" as any)}
              activeOpacity={0.82}
            >
              {isRTL && <Feather name="arrow-left" size={17} color="#FFFFFF" />}
              <Text style={styles.primaryBtnText}>{t.welcome.getStarted}</Text>
              {!isRTL && <Feather name="arrow-right" size={17} color="#FFFFFF" />}
            </TouchableOpacity>

          ) : isRTL ? (
            /* ── RTL: [← Next] [Back icon on right] ── */
            <>
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, backgroundColor: colors.cta }]}
                onPress={() => goTo(currentPage + 1)}
                activeOpacity={0.82}
              >
                <Feather name="arrow-left" size={17} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>{t.welcome.nextStep}</Text>
              </TouchableOpacity>
              {currentPage > 0 ? (
                <TouchableOpacity
                  style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => goTo(currentPage - 1)}
                  activeOpacity={0.8}
                >
                  <Feather name="arrow-right" size={18} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              ) : (
                <View style={styles.iconBtnSpacer} />
              )}
            </>

          ) : (
            /* ── LTR: [Back icon on left] [Next →] ── */
            <>
              {currentPage > 0 ? (
                <TouchableOpacity
                  style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                  onPress={() => goTo(currentPage - 1)}
                  activeOpacity={0.8}
                >
                  <Feather name="arrow-left" size={18} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              ) : (
                <View style={styles.iconBtnSpacer} />
              )}
              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1, backgroundColor: colors.cta }]}
                onPress={() => goTo(currentPage + 1)}
                activeOpacity={0.82}
              >
                <Text style={styles.primaryBtnText}>{t.welcome.nextStep}</Text>
                <Feather name="arrow-right" size={17} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Skip / secondary links */}
        <View style={styles.secondaryRow}>
          {isLast ? (
            <TouchableOpacity onPress={() => router.replace("/auth/login" as any)} activeOpacity={0.7}>
              <Text style={[styles.secondaryText, { color: colors.onSurfaceVariant }]}>
                {t.welcome.contactSales}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.replace("/auth/login" as any)} activeOpacity={0.7}>
              <Text style={[styles.secondaryText, { color: colors.mutedForeground }]}>
                {t.welcome.skip}
              </Text>
            </TouchableOpacity>
          )}
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  page: {
    width: SCREEN_WIDTH,
    flex: 1,
  },

  // ── Image section ──
  imageSection: {
    width: "100%",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 28,
  },

  illustration: {
    width: "100%",
    height: "100%",
  },

  chipsRow: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },

  chipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11.5,
    letterSpacing: 0.3,
  },

  // ── Content section ──
  contentSection: {
    paddingHorizontal: 28,
    paddingTop: 40,
    alignItems: "center",
    gap: 16,
    flex: 1,
  },

  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
  },

  stepText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11.5,
    letterSpacing: 0.5,
  },

  title: {
    fontSize: Math.min(26, SCREEN_WIDTH * 0.065),
    textAlign: "center",
    lineHeight: Math.min(26, SCREEN_WIDTH * 0.065) * 1.35,
  },

  description: {
    fontFamily: "Inter_400Regular",
    fontSize: Math.min(15, SCREEN_WIDTH * 0.04),
    lineHeight: Math.min(15, SCREEN_WIDTH * 0.04) * 1.7,
    textAlign: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
  },

  // ── Bottom controls ──
  bottomSection: {
    paddingHorizontal: 24,
    paddingTop: 8,
    gap: 16,
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  actionsRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },

  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 14,
    shadowColor: "#0369A1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },

  primaryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },

  iconBtn: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
  },

  iconBtnSpacer: {
    width: 52,
    height: 52,
  },

  secondaryRow: {
    alignItems: "center",
    paddingBottom: 4,
  },

  secondaryText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
});
