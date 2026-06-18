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
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";

const { width: SW, height: SH } = Dimensions.get("window");
const isSmall = SH < 700;
const IMAGE_H = Math.round(SH * (isSmall ? 0.44 : 0.50));

const SLIDES = [
  {
    id: 1,
    titleKey: "slide1Title" as const,
    descKey:  "slide1Desc"  as const,
    image:    require("@/assets/images/figma/saudi-professionals.png"),
    chips: [
      { icon: "shield" as const, labelKey: "secure" as const },
      { icon: "zap"    as const, labelKey: "fast"   as const },
    ],
  },
  {
    id: 2,
    titleKey: "slide2Title" as const,
    descKey:  "slide2Desc"  as const,
    image:    require("@/assets/images/figma/saudi-mobile-dev.png"),
    chips: [],
  },
  {
    id: 3,
    titleKey: "slide3Title" as const,
    descKey:  "slide3Desc"  as const,
    image:    require("@/assets/images/figma/cloud-transformation.png"),
    chips: [
      { icon: "cpu"      as const, labelKey: "smart"    as const },
      { icon: "activity" as const, labelKey: "realTime" as const },
    ],
  },
];

/* ── Animated pill dot ── */
function PaginationDot({ active, color }: { active: boolean; color: string }) {
  const w = useRef(new Animated.Value(active ? 24 : 8)).current;
  const o = useRef(new Animated.Value(active ? 1 : 0.25)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(w, { toValue: active ? 24 : 8, useNativeDriver: false, tension: 80, friction: 10 }),
      Animated.timing(o, { toValue: active ? 1 : 0.25, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [active]);

  return <Animated.View style={{ width: w, height: 8, borderRadius: 4, opacity: o, backgroundColor: color }} />;
}

export default function WelcomeScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const t       = useT();
  const { isRTL } = useLanguage();

  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const isLast = page === SLIDES.length - 1;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SW);
    if (next !== page) setPage(next);
  };

  const goTo = (p: number) => scrollRef.current?.scrollTo({ x: p * SW, animated: true });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Horizontal slide pager ── */}
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
        {SLIDES.map((s) => (
          <View key={s.id} style={styles.page}>

            {/* Illustration — no border radius (prevents black line artifact) */}
            <View style={[styles.imageWrap, { height: IMAGE_H }]}>
              <Image
                source={s.image}
                style={styles.illustration}
                contentFit="cover"
                contentPosition="top"
                transition={200}
              />
              {/* Gradient fade — hides the bottom edge of the illustration */}
              <LinearGradient
                colors={["transparent", colors.background]}
                start={{ x: 0, y: 0.3 }}
                end={{ x: 0, y: 1 }}
                style={styles.imageFade}
                pointerEvents="none"
              />
              {/* Feature chips */}
              {s.chips.length > 0 && (
                <View style={styles.chipsRow}>
                  {s.chips.map((chip) => (
                    <View
                      key={chip.labelKey}
                      style={[styles.chip, {
                        backgroundColor: "rgba(255,255,255,0.94)",
                        borderColor: "rgba(3,105,161,0.12)",
                      }]}
                    >
                      <Feather name={chip.icon} size={12} color={colors.cta} />
                      <Text style={[styles.chipText, { color: colors.cta }]}>
                        {t.welcome[chip.labelKey]}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Slide copy */}
            <View style={[styles.copy, { backgroundColor: colors.background, marginTop: -4 }]}>
              <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
                {t.welcome[s.titleKey]}
              </Text>
              <Text style={[styles.desc, { color: colors.onSurfaceVariant }]}>
                {t.welcome[s.descKey]}
              </Text>
            </View>

          </View>
        ))}
      </ScrollView>

      {/* ── Bottom panel ── */}
      <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}>

        {/* Progress bar + dots */}
        <View style={styles.progressSection}>
          {/* Thin progress track */}
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.cta,
                  width: `${((page + 1) / SLIDES.length) * 100}%`,
                },
              ]}
            />
          </View>
          {/* Pill dots */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <PaginationDot key={i} active={i === page} color={colors.cta} />
            ))}
          </View>
        </View>

        {/* CTA button */}
        {isLast ? (
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: colors.cta }]}
            onPress={() => router.replace("/auth/login" as any)}
            activeOpacity={0.82}
          >
            {isRTL && <Feather name="arrow-left" size={18} color="#FFF" />}
            <Text style={styles.ctaBtnText}>{t.welcome.getStarted}</Text>
            {!isRTL && <Feather name="arrow-right" size={18} color="#FFF" />}
          </TouchableOpacity>
        ) : (
          <View style={[styles.navRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {/* Back button — only visible after first slide */}
            {page > 0 ? (
              <TouchableOpacity
                style={[styles.backBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => goTo(page - 1)}
                activeOpacity={0.8}
              >
                <Feather
                  name={isRTL ? "arrow-right" : "arrow-left"}
                  size={20}
                  color={colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtnGhost} />
            )}

            {/* Next button */}
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: colors.cta }]}
              onPress={() => goTo(page + 1)}
              activeOpacity={0.82}
            >
              {isRTL && <Feather name="arrow-left" size={18} color="#FFF" />}
              <Text style={styles.ctaBtnText}>{t.welcome.nextStep}</Text>
              {!isRTL && <Feather name="arrow-right" size={18} color="#FFF" />}
            </TouchableOpacity>
          </View>
        )}

        {/* Skip link — only shown on non-last slides */}
        {!isLast && (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.replace("/auth/login" as any)}
            activeOpacity={0.6}
          >
            <Text style={[styles.skipText, { color: colors.outline }]}>
              {t.welcome.skip}
            </Text>
          </TouchableOpacity>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  page: { width: SW, flex: 1 },

  /* ── Illustration ── */
  imageWrap: {
    width: "100%",
  },
  illustration: {
    width: "100%",
    height: "100%",
  },
  imageFade: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
  },
  chipsRow: {
    position: "absolute",
    bottom: 22,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  chipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.2,
  },

  /* ── Copy ── */
  copy: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: isSmall ? 22 : 26,
    textAlign: "center",
    lineHeight: isSmall ? 30 : 36,
    letterSpacing: -0.5,
  },
  desc: {
    fontFamily: "Inter_400Regular",
    fontSize: isSmall ? 13.5 : 15,
    lineHeight: isSmall ? 22 : 25,
    textAlign: "center",
    paddingHorizontal: 8,
  },

  /* ── Bottom panel ── */
  panel: {
    paddingHorizontal: 24,
    paddingTop: 10,
    gap: 16,
  },

  /* Progress bar + dots stacked */
  progressSection: {
    gap: 12,
    alignItems: "center",
  },
  progressTrack: {
    width: "100%",
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  /* Buttons */
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 16,
    shadowColor: "#0369A1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  navRow: {
    gap: 12,
    alignItems: "center",
  },
  backBtn: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1.5,
  },
  backBtnGhost: {
    width: 56,
    height: 56,
  },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 56,
    borderRadius: 16,
    shadowColor: "#0369A1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },

  /* Skip */
  skipBtn: {
    alignItems: "center",
    paddingVertical: 2,
    paddingBottom: 4,
  },
  skipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
});
