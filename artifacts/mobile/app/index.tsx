import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useEffect, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function AnimatedDot({ delay, size, top, left, opacity }: { delay: number; size: number; top: `${number}%`; left: `${number}%`; opacity: number }) {
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
            top={`${10 + (i * 17) % 80}%`}
            left={`${5 + (i * 22) % 85}%`}
            opacity={0.1 + (i % 3) * 0.04}
          />
        ))}

        <View style={styles.content}>
          <Animated.View
            style={{
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            }}
          >
            <View style={[styles.logoBox, colors.shadow.logo]}>
              <Image
                source={require("@/assets/images/figma/mdmak-logo.png")}
                style={styles.logoImage}
                contentFit="contain"
              />
            </View>
          </Animated.View>

          <Animated.View
            style={{
              alignItems: "center",
              opacity: titleOpacity,
              transform: [{ translateY: titleSlide }],
            }}
          >
            <Text style={styles.appName}>
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
            <Text style={styles.tagline}>
              {t.common.tagline}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.loaderSection, { opacity: barOpacity }]}>
            <View style={styles.loaderTrack}>
              <Animated.View
                style={[
                  styles.loaderBar,
                  {
                    width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                  },
                ]}
              />
            </View>
            <Text style={styles.loadingText}>{t.common.initializing}</Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
          <Text style={styles.footerGlobe}>○</Text>
          <Text style={styles.footerText}>{t.common.secureGateway}</Text>
        </Animated.View>
      </LinearGradient>
    );
  }

  if (!user) return <Redirect href={"/welcome/index" as any} />;
  if (user && !user.organizationId) return <Redirect href="/onboarding" />;
  if (user.role === "Contractor") return <Redirect href="/(contractor)/dashboard" />;
  if (user.role === "Supplier") return <Redirect href="/(supplier)/dashboard" />;

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <Text style={{ color: colors.foreground, fontSize: 16 }}>{t.auth.errors.adminNotSupported}</Text>
      <Text style={{ color: colors.outline, fontSize: 14, marginTop: 8 }}>{t.common.adminNotSupportedDesc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, overflow: "hidden" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  logoBox: {
    width: 128,
    height: 128,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  appName: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 26,
    color: "#FFFFFF",
    letterSpacing: -0.65,
    textAlign: "center",
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 26,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  loaderSection: {
    position: "absolute",
    bottom: 160,
    alignItems: "center",
    gap: 8,
  },
  loaderTrack: {
    width: SCREEN_WIDTH * 0.4,
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
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  footer: {
    position: "absolute",
    bottom: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerGlobe: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  footerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
});
