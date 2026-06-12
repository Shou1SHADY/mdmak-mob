import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Platform, TouchableOpacity,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { RFQItem } from "@/components/RFQCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { RFQ_STATUSES } from "@/constants/data";

export default function SupplierRFQDetailScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rfq, setRfq] = useState<RFQItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const rfqDoc = await getDoc(doc(db, "rfqs", id));
        if (rfqDoc.exists()) setRfq({ id: rfqDoc.id, ...rfqDoc.data() } as RFQItem);
      } catch (e) {
        console.warn("[RFQDetail]", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const statusData = rfq ? RFQ_STATUSES.find((s) => s.id === rfq.status) : null;
  const statusInfo = statusData
    ? { label: isRTL ? statusData.labelAr : statusData.label, color: statusData.color }
    : rfq ? { label: rfq.status, color: colors.outline } : null;

  const formatDate = (ts: any) => {
    if (!ts) return null;
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString(isRTL ? "ar-SA" : "en-SA", { day: "numeric", month: "long", year: "numeric" });
    } catch { return null; }
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Back button while loading */}
        <View style={[styles.loadingHeader, { paddingTop: topPad + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </View>
    );
  }

  if (!rfq) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <Feather name="alert-circle" size={32} color={colors.outline} />
        <Text style={{ color: colors.outline, marginTop: 12, fontFamily: "Inter_400Regular" }}>
          {t.rfq.detail}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.cta, fontFamily: "Inter_600SemiBold" }}>{t.common.back}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const deadline = formatDate(rfq.deadline);
  const createdAt = formatDate(rfq.createdAt);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Gradient hero header */}
      <LinearGradient
        colors={colors.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topPad + 12 }]}
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.heroBackBtn, { backgroundColor: "rgba(255,255,255,0.12)" }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Category + status */}
        <View style={[styles.heroMeta, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{rfq.category}</Text>
          </View>
          {statusInfo && <StatusBadge label={statusInfo.label} color={statusInfo.color} />}
        </View>

        {/* Title */}
        <Text
          style={[styles.heroTitle, { textAlign: isRTL ? "right" : "left" }]}
          numberOfLines={3}
        >
          {rfq.title}
        </Text>

        {/* Location + deadline mini row */}
        <View style={[styles.heroStats, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.heroStat, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Feather name="map-pin" size={13} color="rgba(255,255,255,0.7)" />
            <Text style={styles.heroStatText}>{rfq.city}</Text>
          </View>
          {deadline && (
            <View style={[styles.heroStat, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Feather name="clock" size={13} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroStatText}>{deadline}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Description */}
        {rfq.description ? (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.sectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.cta + "14" }]}>
                <Feather name="align-left" size={14} color={colors.cta} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.rfq.description}</Text>
            </View>
            <Text style={[styles.desc, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}>
              {rfq.description}
            </Text>
          </View>
        ) : null}

        {/* Details grid */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.success + "14" }]}>
              <Feather name="info" size={14} color={colors.success} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{t.rfq.detail}</Text>
          </View>
          <View style={styles.detailsGrid}>
            {[
              { icon: "map-pin", label: t.rfq.city, value: rfq.city, color: colors.cta },
              rfq.district ? { icon: "navigation", label: t.rfq.district ?? "District", value: rfq.district, color: colors.purpleAccent } : null,
              deadline ? { icon: "clock", label: t.rfq.deadline, value: deadline, color: colors.warning } : null,
              createdAt ? { icon: "calendar", label: t.rfq.createdAt ?? "Posted", value: createdAt, color: colors.outline } : null,
              rfq.subCategory ? { icon: "tag", label: t.rfq.subCategory ?? "Sub-category", value: rfq.subCategory, color: colors.tealAccent } : null,
            ]
              .filter(Boolean)
              .map((item: any) => (
                <View
                  key={item.label}
                  style={[styles.detailItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                >
                  <View style={[styles.detailIconWrap, { backgroundColor: item.color + "14" }]}>
                    <Feather name={item.icon} size={13} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.detailLabel, { color: colors.outline }]}>{item.label}</Text>
                    <Text style={[styles.detailValue, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
                      {item.value}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky action footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <Button
          title={t.rfq.submitOffer}
          onPress={() => router.push(`/(supplier)/submit-offer/${rfq.id}`)}
          fullWidth
          size="lg"
        />
        <TouchableOpacity
          style={[styles.msgBtn, { borderColor: colors.border }]}
          onPress={() => router.push("/(supplier)/chats")}
          activeOpacity={0.75}
        >
          <Feather name="message-circle" size={16} color={colors.foreground} />
          <Text style={[styles.msgBtnText, { color: colors.foreground }]}>{t.rfq.messageContractor}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    gap: 12,
  },
  heroBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  heroMeta: {
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  categoryPill: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  categoryText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.9)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: "HankenGrotesk_700Bold",
    color: "#FFFFFF",
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  heroStats: {
    gap: 16,
    flexWrap: "wrap",
  },
  heroStat: {
    alignItems: "center",
    gap: 5,
  },
  heroStatText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },

  // Content
  scroll: {
    padding: 16,
    gap: 12,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginBottom: 12,
  },
  sectionHeader: {
    alignItems: "center",
    gap: 10,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "HankenGrotesk_600SemiBold",
  },
  desc: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },

  // Details grid
  detailsGrid: {
    gap: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  detailIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  msgBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
  },
  msgBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
