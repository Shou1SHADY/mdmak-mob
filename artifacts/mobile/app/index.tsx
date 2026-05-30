import { Redirect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useEffect, useRef } from "react";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function AnimatedDot({ delay, size, top, left, opacity }: { delay: number; size: number; top: string; left: string; opacity: number }) {
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
        backgroundColor: "#20CBD5",
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
  const ringRotate = useRef(new Animated.Value(0)).current;
  const barWidth = useRef(new Animated.Value(0)).current;
  const barOpacity = useRef(new Animated.Value(0)).current;

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
        Animated.timing(barOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(barWidth, { toValue: 1, duration: 2000, useNativeDriver: false }),
      ]).start();

      const ringAnim = Animated.loop(
        Animated.timing(ringRotate, { toValue: 1, duration: 6000, useNativeDriver: true })
      );
      ringAnim.start();
      return () => {
        logoScale.setValue(0.3);
        logoOpacity.setValue(0);
        titleSlide.setValue(20);
        titleOpacity.setValue(0);
        barWidth.setValue(0);
        barOpacity.setValue(0);
        ringAnim.stop();
      };
    }
  }, [loading]);

  if (loading) {
    const ringInterpolation = ringRotate.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });

    return (
      <View style={[styles.splash, { backgroundColor: colors.primary }]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <AnimatedDot
            key={i}
            delay={i * 400}
            size={6 + (i % 3) * 4}
            top={`${10 + (i * 17) % 80}%`}
            left={`${5 + (i * 22) % 85}%`}
            opacity={0.15 + (i % 3) * 0.06}
          />
        ))}

        <View style={styles.content}>
          <Animated.View
            style={{
              transform: [
                { scale: logoScale },
                { rotate: ringInterpolation },
              ],
              opacity: logoOpacity,
            }}
          >
            <View style={[styles.logoOuterRing, { borderColor: colors.accent + "40" }]}>
              <View style={[styles.logoRing, { borderColor: colors.accent }]}>
                <Text style={styles.logoGlyph}>م</Text>
              </View>
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
            <Text style={styles.appNameAr}>
              {isRTL ? t.common.appName : t.common.appNameAr}
            </Text>
            <Text style={styles.tagline}>{t.common.tagline}</Text>
          </Animated.View>

          <Animated.View style={[styles.loaderSection, { opacity: barOpacity }]}>
            <View style={[styles.loaderTrack, { backgroundColor: "rgba(248,250,252,0.12)" }]}>
              <Animated.View
                style={[
                  styles.loaderBar,
                  {
                    backgroundColor: colors.accent,
                    width: barWidth.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                  },
                ]}
              />
            </View>
          </Animated.View>
        </View>
      </View>
    );
  }

  if (!user) return <Redirect href="/auth/login" />;
  if (user && !user.organizationId) return <Redirect href="/onboarding" />;
  if (user.role === "Contractor") return <Redirect href="/(contractor)/dashboard" />;
  if (user.role === "Supplier") return <Redirect href="/(supplier)/dashboard" />;

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
      <Text style={{ color: colors.foreground, fontSize: 16 }}>Admin accounts are not supported.</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 14, marginTop: 8 }}>Please use the web application.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, overflow: "hidden" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 28 },
  logoOuterRing: {
    width: 100,
    height: 100,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed" as any,
  },
  logoRing: {
    width: 68,
    height: 68,
    borderRadius: 18,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(32,203,213,0.12)",
  },
  logoGlyph: { fontSize: 34, fontWeight: "700" as const, color: "#20CBD5" },
  appName: { fontSize: 28, fontWeight: "800" as const, color: "#F8FAFC", letterSpacing: 1 },
  appNameAr: { fontSize: 20, fontWeight: "700" as const, color: "#20CBD5", letterSpacing: 0, marginTop: 2 },
  tagline: { fontSize: 13, color: "rgba(248,250,252,0.5)", textAlign: "center", letterSpacing: 0.5, marginTop: 2 },
  loaderSection: { position: "absolute", bottom: 80, width: SCREEN_WIDTH * 0.4, alignItems: "center" },
  loaderTrack: { width: "100%", height: 3, borderRadius: 2, overflow: "hidden" },
  loaderBar: { height: "100%", borderRadius: 2 },
});
