import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const ONBOARDING_DATA = [
  {
    id: 1,
    titleKey: "slide1Title" as const,
    descKey: "slide1Desc" as const,
    image: require("@/assets/images/figma/saudi-professionals.png"),
    features: [
      { icon: "shield" as const, labelKey: "secure" as const, sublabelKey: null as string | null },
      { icon: "zap" as const, labelKey: "fast" as const, sublabelKey: "optimizedCode" as const },
    ],
  },
  {
    id: 2,
    titleKey: "slide2Title" as const,
    descKey: "slide2Desc" as const,
    image: require("@/assets/images/figma/saudi-mobile-dev.png"),
    features: [],
  },
  {
    id: 3,
    titleKey: "slide3Title" as const,
    descKey: "slide3Desc" as const,
    image: require("@/assets/images/figma/cloud-transformation.png"),
    badges: ["secured" as const, "highPerformance" as const],
  },
];

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { isRTL } = useLanguage();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollX = useRef(0);

  const isLast = currentPage === ONBOARDING_DATA.length - 1;
  const data = ONBOARDING_DATA[currentPage];
  const stepNum = currentPage + 1;

  const handleNext = () => {
    if (currentPage < ONBOARDING_DATA.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleSkip = () => {
    router.replace("/auth/login" as any);
  };

  const handleGetStarted = () => {
    router.replace("/auth/login" as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.brandText, { color: colors.primary, fontFamily: "HankenGrotesk_700Bold" }]}>
          {isRTL ? t.common.appNameAr : t.common.appName}
        </Text>
        <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.skipText, { color: colors.onSurfaceVariant }]}>{t.welcome.skip}</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Illustration */}
        <View style={styles.illustrationSection}>
          <View style={[styles.glowCircle, { backgroundColor: colors.glowBlue }]} />
          <View style={[styles.glowCircleSecondary, { backgroundColor: colors.atmosphericPurple }]} />
          <View style={styles.imageWrapper}>
            <Image
              source={data.image}
              style={styles.illustration}
              contentFit="cover"
              transition={300}
            />
          </View>

          {data.badges && (
            <View style={styles.badgesRow}>
              {data.badges.map((badge) => (
                <View key={badge} style={[styles.badge, { backgroundColor: colors.accentBlueSoft }]}>
                  <Feather name={badge === "secured" ? "lock" : "zap"} size={14} color={colors.primary} />
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{t.welcome[badge]}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.contentSection}>
          <View style={[styles.stepBadge, { backgroundColor: colors.accentBlueSoft }]}>
            <Text style={[styles.stepText, { color: colors.primary }]}>
              {t.welcome.step.replace("{n}", String(stepNum))}
            </Text>
          </View>

          <Text style={[styles.title, { color: colors.foreground, fontFamily: "HankenGrotesk_700Bold" }]}>
            {t.welcome[data.titleKey]}
          </Text>
          <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
            {t.welcome[data.descKey]}
          </Text>
        </View>
      </View>

      {/* Pagination & Actions */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 24 }]}>
        {/* Pagination Dots */}
        <View style={styles.paginationRow}>
          <View style={styles.paginationDots}>
            {ONBOARDING_DATA.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === currentPage ? colors.primary : colors.border,
                    width: index === currentPage ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          {isLast ? (
            <>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, ...colors.shadow.primary }]}
                onPress={handleGetStarted}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>{t.welcome.getStarted}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: colors.border }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.outlineBtnText, { color: colors.primary }]}>{t.welcome.contactSales}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={{ flex: 1 }} />
              {currentPage > 0 && (
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: colors.border }]}
                  onPress={() => setCurrentPage(currentPage - 1)}
                  activeOpacity={0.8}
                >
                  <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={18} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, ...colors.shadow.primary }]}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>{t.welcome.nextStep}</Text>
                <Feather name={isRTL ? "arrow-left" : "arrow-right"} size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {!isLast && (
          <Text style={[styles.footerNote, { color: colors.mutedForeground }]}>
            {t.welcome.trustedBy}
          </Text>
        )}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          {t.welcome.footer}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  brandText: { fontSize: 20, letterSpacing: -0.5 },
  skipText: { fontFamily: "Inter_400Regular", fontSize: 16 },
  mainContent: { flex: 1, paddingHorizontal: 24 },
  illustrationSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  glowCircle: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    top: "15%",
  },
  glowCircleSecondary: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: "20%",
    left: "20%",
  },
  imageWrapper: {
    width: SCREEN_WIDTH - 80,
    height: SCREEN_WIDTH - 80,
    borderRadius: 24,
    overflow: "hidden",
    ...Platform.select({
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 25 },
        shadowOpacity: 0.15,
        shadowRadius: 25,
        elevation: 20,
      },
    }),
  },
  illustration: {
    width: "100%",
    height: "100%",
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.6,
  },
  contentSection: {
    alignItems: "center",
    gap: 12,
    paddingBottom: 24,
  },
  stepBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  stepText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 26,
    letterSpacing: -0.52,
    textAlign: "center",
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 26,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  bottomSection: {
    paddingHorizontal: 24,
    gap: 20,
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  paginationDots: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  primaryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  outlineBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  outlineBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  secondaryBtn: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  footerNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: "center",
    paddingTop: 8,
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
  },
});
