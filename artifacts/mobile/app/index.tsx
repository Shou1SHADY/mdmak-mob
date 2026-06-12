import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useEffect, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Responsive scale helpers
const isSmallScreen = SCREEN_HEIGHT < 700; // iPhone SE, older Androids
const LOGO_BOX = isSmallScreen ? 160 : 200;
const LOGO_IMG = isSmallScreen ? 104 : 136;
const LOADER_WIDTH = Math.min(SCREEN_WIDTH * 0.44, 200);

function AnimatedDot({
  delay,
  size,
  top,
  left,
  opacity,
}: {
  delay: number;
  size: number;
  top: `${number}%`;
  left: `${number}%`;
  opacity: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: top as any,
        left: left as any,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#EEF2FF",
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0, opacity] }),
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) }],
      }}
    />
  );
}

export default function Index() {
  const { user, loading } = useAuth();
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(20)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleSlide = useRef(new Animated.Value(15)).current;
  const barWidth = useRef(new Animated.Value(0)).current;
  const barOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
          Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(titleSlide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
          Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.spring(subtitleSlide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
          Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.timing(barOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(barWidth, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(footerOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]).start();
    }
  }, [loading]);

  if (loading) {
    // Safe-area-aware padding: push content below notch, footer above home bar
    const topPad = Math.max(insets.top, 16);
    const bottomPad = Math.max(insets.bottom + 28, isSmallScreen ? 36 : 52);

    return (
      <LinearGradient
        colors={colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.splash}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <AnimatedDot
            key={i}
            delay={i * 400}
            size={6 + (i % 3) * 4}
            top={`${10 + ((i * 17) % 80)}%`}
            left={`${5 + ((i * 22) % 85)}%`}
            opacity={0.1 + (i % 3) * 0.04}
          />
        ))}

        {/* Center section — logo, name, tagline */}
        <View style={[styles.centerSection, { paddingTop: topPad }]}>
          <Animated.View
            style={{
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            }}
          >
            <Image
              source={require("@/assets/images/figma/logo2.png")}
              style={{ width: LOGO_BOX, height: LOGO_BOX }}
              contentFit="contain"
            />
          </Animated.View>

          <Animated.View
            style={{
              alignItems: "center",
              opacity: titleOpacity,
              transform: [{ translateY: titleSlide }],
            }}
          >
            <Text style={[styles.appName, isSmallScreen && styles.appNameSm]}>
              {isRTL ? t.common.appNameAr : t.common.appName}
            </Text>
          </Animated.View>

          <Animated.View
            style={{
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleSlide }],
              paddingHorizontal: 40,
            }}
          >
            <Text style={[styles.tagline, isSmallScreen && styles.taglineSm]}>
              {t.common.tagline}
            </Text>
          </Animated.View>
        </View>

        {/* Bottom section — loader + secure footer, respects home indicator */}
        <View style={[styles.bottomSection, { paddingBottom: bottomPad }]}>
          <Animated.View style={[styles.loaderBlock, { opacity: barOpacity }]}>
            <View style={styles.loaderTrack}>
              <Animated.View
                style={[
                  styles.loaderBar,
                  {
                    width: barWidth.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.loadingText}>{t.common.initializing}</Text>
          </Animated.View>

          <Animated.View style={[styles.footerRow, { opacity: footerOpacity }]}>
            <Ionicons
              name="shield-checkmark-outline"
              size={13}
              color="rgba(255,255,255,0.5)"
            />
            <Text style={styles.footerText}>{t.common.secureGateway}</Text>
          </Animated.View>
        </View>
      </LinearGradient>
    );
  }

  if (!user) return <Redirect href={"/welcome" as any} />;
  if (user && !user.profileCompleted) return <Redirect href="/onboarding" />;
  if (user.role === "Contractor") return <Redirect href="/(contractor)/dashboard" />;
  if (user.role === "Supplier") return <Redirect href="/(supplier)/dashboard" />;

  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background,
      }}
    >
      <Text style={{ color: colors.foreground, fontSize: 16 }}>
        {t.auth.errors.adminNotSupported}
      </Text>
      <Text style={{ color: colors.outline, fontSize: 14, marginTop: 8 }}>
        {t.common.adminNotSupportedDesc}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    overflow: "hidden",
  },

  // Center: fills remaining space and centers content
  centerSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },

  appName: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 26,
    color: "#FFFFFF",
    letterSpacing: -0.65,
    textAlign: "center",
  },
  appNameSm: {
    fontSize: 22,
  },

  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 24,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
  taglineSm: {
    fontSize: 13,
    lineHeight: 20,
  },

  // Bottom: loader + footer, stays at the bottom with safe-area padding
  bottomSection: {
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 40,
  },

  loaderBlock: {
    alignItems: "center",
    gap: 8,
  },

  loaderTrack: {
    width: LOADER_WIDTH,
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  loaderBar: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },

  loadingText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10.5,
    color: "rgba(255,255,255,0.38)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  footerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },
});
