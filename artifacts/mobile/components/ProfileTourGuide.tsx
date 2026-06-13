import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  Animated,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";

const STORAGE_KEY = "profile_tour_seen";

export interface TourStep {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  /** Which section of the profile to scroll to (passed back via onScrollTo) */
  sectionIndex: number;
}

interface ProfileTourGuideProps {
  visible: boolean;
  onDismiss: () => void;
  /** Called each time the step changes so the parent can scroll to the section */
  onScrollTo?: (sectionIndex: number) => void;
}

export function useProfileTour(): {
  showTour: boolean;
  markTourSeen: () => Promise<void>;
  resetTour: () => Promise<void>;
} {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val !== "true") setShowTour(true);
    });
  }, []);

  const markTourSeen = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "true");
    setShowTour(false);
  };

  const resetTour = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setShowTour(true);
  };

  return { showTour, markTourSeen, resetTour };
}

export function ProfileTourGuide({
  visible,
  onDismiss,
  onScrollTo,
}: ProfileTourGuideProps) {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);

  const slideAnim = useRef(new Animated.Value(300)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(1)).current;

  const steps: TourStep[] = [
    {
      icon: "briefcase",
      title: t.profileTour.step1Title,
      description: t.profileTour.step1Desc,
      sectionIndex: 0,
    },
    {
      icon: "phone",
      title: t.profileTour.step2Title,
      description: t.profileTour.step2Desc,
      sectionIndex: 0,
    },
    {
      icon: "award",
      title: t.profileTour.step3Title,
      description: t.profileTour.step3Desc,
      sectionIndex: 0,
    },
    {
      icon: "file-text",
      title: t.profileTour.step4Title,
      description: t.profileTour.step4Desc,
      sectionIndex: 0,
    },
    {
      icon: "map-pin",
      title: t.profileTour.step5Title,
      description: t.profileTour.step5Desc,
      sectionIndex: 0,
    },
    {
      icon: "upload-cloud",
      title: t.profileTour.step6Title,
      description: t.profileTour.step6Desc,
      sectionIndex: 1,
    },
  ];

  const totalSteps = steps.length;
  const current = steps[step];
  const progress = (step + 1) / totalSteps;

  useEffect(() => {
    if (visible) {
      setStep(0);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (visible && onScrollTo) onScrollTo(current.sectionIndex);
  }, [step, visible]);

  const animateStep = (next: () => void) => {
    Animated.sequence([
      Animated.timing(stepAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(stepAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
    setTimeout(next, 120);
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      animateStep(() => setStep((s) => s + 1));
    } else {
      onDismiss();
    }
  };

  const handlePrev = () => {
    if (step > 0) animateStep(() => setStep((s) => s - 1));
  };

  const stepLabel = t.profileTour.stepOf
    .replace("{n}", String(step + 1))
    .replace("{total}", String(totalSteps));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="box-none"
      />

      {/* Bottom Sheet */}
      <View style={styles.sheetContainer} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${progress * 100}%`,
                },
              ]}
            />
          </View>

          {/* Header row */}
          <View style={[styles.headerRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.stepBadge, { backgroundColor: colors.primary + "14" }]}>
              <Text style={[styles.stepBadgeText, { color: colors.primary }]}>{stepLabel}</Text>
            </View>
            <Pressable onPress={onDismiss} style={styles.closeBtn} hitSlop={12}>
              <Feather name="x" size={18} color={colors.outline} />
            </Pressable>
          </View>

          {/* Step content */}
          <Animated.View style={{ opacity: stepAnim }}>
            <View style={[styles.iconRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.stepIconBox, { backgroundColor: colors.primary + "12" }]}>
                <Feather name={current.icon} size={26} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.stepTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                >
                  {current.title}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.stepDesc,
                { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {current.description}
            </Text>
          </Animated.View>

          {/* Step dots */}
          <View style={styles.dotsRow}>
            {steps.map((_, i) => (
              <Pressable key={i} onPress={() => animateStep(() => setStep(i))} hitSlop={8}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: i === step ? colors.primary : colors.border,
                      width: i === step ? 20 : 7,
                    },
                  ]}
                />
              </Pressable>
            ))}
          </View>

          {/* Navigation buttons */}
          <View style={[styles.btnRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {step > 0 ? (
              <Pressable
                onPress={handlePrev}
                style={[styles.prevBtn, { borderColor: colors.border }]}
              >
                <Feather
                  name={isRTL ? "chevron-right" : "chevron-left"}
                  size={16}
                  color={colors.foreground}
                />
                <Text style={[styles.prevBtnText, { color: colors.foreground }]}>
                  {t.profileTour.prev}
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={onDismiss} style={styles.skipBtn}>
                <Text style={[styles.skipBtnText, { color: colors.outline }]}>
                  {t.profileTour.skip}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleNext}
              style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.nextBtnText}>
                {step === totalSteps - 1 ? t.profileTour.finish : t.profileTour.next}
              </Text>
              {step < totalSteps - 1 && (
                <Feather
                  name={isRTL ? "chevron-left" : "chevron-right"}
                  size={16}
                  color="#fff"
                />
              )}
              {step === totalSteps - 1 && (
                <Feather name="check-circle" size={16} color="#fff" />
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    gap: 16,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  stepBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  closeBtn: {
    padding: 6,
  },
  iconRow: {
    alignItems: "center",
    gap: 14,
  },
  stepIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    fontSize: 19,
    fontFamily: "HankenGrotesk_700Bold",
    lineHeight: 28,
  },
  stepDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  btnRow: {
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  skipBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  skipBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  prevBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  prevBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  nextBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  nextBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
