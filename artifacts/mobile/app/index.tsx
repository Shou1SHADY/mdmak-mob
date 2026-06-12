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

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const isSmallScreen = SCREEN_H < 700;
const LOGO_BOX = isSmallScreen ? 148 : 184;
const LOADER_WIDTH = Math.min(SCREEN_W * 0.52, 220);

// Ring center anchored at 43% of screen height (where logo lives)
const RING_CENTER_Y = SCREEN_H * 0.43;

/* ── Decorative concentric ring with slow breathe pulse ── */
function DecorativeRing({
  size,
  opacity,
  delay,
}: {
  size: number;
  opacity: number;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1.04, duration: 3200, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 3200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: `rgba(255,255,255,${opacity})`,
        left: (SCREEN_W - size) / 2,
        top: RING_CENTER_Y - size / 2,
        transform: [{ scale: anim }],
      }}
    />
  );
}

/* ── Three loading dots that pulse sequentially ── */
function PulseDots() {
  const d0 = useRef(new Animated.Value(0.3)).current;
  const d1 = useRef(new Animated.Value(0.3)).current;
  const d2 = useRef(new Animated.Value(0.3)).current;
  const dots = [d0, d1, d2];

  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 220),
          Animated.timing(d, { toValue: 1, duration: 420, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 420, useNativeDriver: true }),
          Animated.delay((dots.length - 1 - i) * 220),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.dotsRow}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[styles.dot, { opacity: d }]} />
      ))}
    </View>
  );
}

export default function Index() {
  const { user, loading } = useAuth();
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  // Entrance animations
  const logoScale   = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const haloOpacity = useRef(new Animated.Value(0)).current;
  const haloScale   = useRef(new Animated.Value(0.6)).current;
  const titleY      = useRef(new Animated.Value(18)).current;
  const titleOp     = useRef(new Animated.Value(0)).current;
  const taglineY    = useRef(new Animated.Value(14)).current;
  const taglineOp   = useRef(new Animated.Value(0)).current;
  const barWidth    = useRef(new Animated.Value(0)).current;
  const barOp       = useRef(new Animated.Value(0)).current;
  const footerOp    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) return;
    Animated.sequence([
      // Halo + logo pop in together
      Animated.parallel([
        Animated.spring(haloScale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 12 }),
        Animated.timing(haloOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, tension: 90, friction: 10 }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      // Brand name slides up
      Animated.parallel([
        Animated.spring(titleY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(titleOp, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
      // Tagline slides up
      Animated.parallel([
        Animated.spring(taglineY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(taglineOp, { toValue: 1, duration: 340, useNativeDriver: true }),
      ]),
      // Progress bar
      Animated.parallel([
        Animated.timing(barOp, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(barWidth, { toValue: 1, duration: 2200, useNativeDriver: false }),
      ]),
      // Footer fades in near end of bar
      Animated.timing(footerOp, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [loading]);

  if (loading) {
    const topPad    = Math.max(insets.top, 16);
    const bottomPad = Math.max(insets.bottom + 32, isSmallScreen ? 40 : 56);

    return (
      <LinearGradient
        colors={colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.root}
      >
        {/* ── Decorative rings (concentric, centered on logo) ── */}
        <DecorativeRing size={280}  opacity={0.10} delay={0}    />
        <DecorativeRing size={480}  opacity={0.065} delay={600} />
        <DecorativeRing size={700}  opacity={0.04}  delay={1200} />

        {/* ── Center: logo + copy ── */}
        <View style={[styles.center, { paddingTop: topPad }]}>
          {/* Glow halo behind logo */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.halo,
              {
                opacity: haloOpacity,
                transform: [{ scale: haloScale }],
              },
            ]}
          />

          {/* Logo */}
          <Animated.View
            style={{
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
              zIndex: 1,
            }}
          >
            <View style={[styles.logoFrame, { width: LOGO_BOX, height: LOGO_BOX }]}>
              <Image
                source={require("@/assets/images/figma/logo2.png")}
                style={{ width: LOGO_BOX * 0.76, height: LOGO_BOX * 0.76 }}
                contentFit="contain"
              />
            </View>
          </Animated.View>

          {/* Brand name */}
          <Animated.View style={{ opacity: titleOp, transform: [{ translateY: titleY }], alignItems: "center" }}>
            <Text style={[styles.appName, isSmallScreen && { fontSize: 22 }]}>
              {isRTL ? t.common.appNameAr : t.common.appName}
            </Text>
          </Animated.View>

          {/* Tagline */}
          <Animated.View
            style={{
              opacity: taglineOp,
              transform: [{ translateY: taglineY }],
              paddingHorizontal: 44,
              alignItems: "center",
            }}
          >
            <Text style={[styles.tagline, isSmallScreen && { fontSize: 13, lineHeight: 20 }]}>
              {t.common.tagline}
            </Text>
          </Animated.View>
        </View>

        {/* ── Bottom: loader + footer ── */}
        <View style={[styles.bottom, { paddingBottom: bottomPad }]}>
          {/* Progress bar */}
          <Animated.View style={{ opacity: barOp, alignItems: "center", gap: 10 }}>
            <View style={[styles.track, { width: LOADER_WIDTH }]}>
              <Animated.View
                style={[
                  styles.fill,
                  {
                    width: barWidth.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
            <PulseDots />
          </Animated.View>

          {/* Footer */}
          <Animated.View style={[styles.footer, { opacity: footerOp }]}>
            <View style={styles.footerDivider} />
            <View style={styles.footerInner}>
              <Ionicons name="shield-checkmark-outline" size={12} color="rgba(255,255,255,0.45)" />
              <Text style={styles.footerText}>{t.common.secureGateway}</Text>
            </View>
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
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
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
  root: {
    flex: 1,
    overflow: "hidden",
  },

  /* Center section */
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },

  /* Glow halo behind logo */
  halo: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.07)",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
  },

  /* Logo container — subtle frosted-glass border ring */
  logoFrame: {
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },

  appName: {
    fontFamily: "HankenGrotesk_700Bold",
    fontSize: 28,
    color: "#FFFFFF",
    letterSpacing: -0.7,
    textAlign: "center",
  },

  tagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 14.5,
    lineHeight: 23,
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
  },

  /* Bottom section */
  bottom: {
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 40,
  },

  /* Progress bar track */
  track: {
    height: 3.5,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.14)",
  },

  /* Progress fill — brighter white */
  fill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.88)",
  },

  /* Pulsing dots row */
  dotsRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.6)",
  },

  /* Footer */
  footer: {
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  footerDivider: {
    width: 48,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 1,
  },
  footerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.2,
  },
});
