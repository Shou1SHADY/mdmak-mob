import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RFQ_STATUSES } from "@/constants/data";

export interface RFQItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  subCategory?: string;
  city: string;
  district?: string;
  status: string;
  deadline?: any;
  createdAt?: any;
  updatedAt?: any;
  offersCount?: number;
  organizationId?: string;
  contractorId?: string;
  createdByUserId?: string;
  createdByUserName?: string;
}

interface RFQCardProps {
  rfq: RFQItem;
  onPress: () => void;
  showOffers?: boolean;
}

export function RFQCard({ rfq, onPress, showOffers = false }: RFQCardProps) {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const statusData = RFQ_STATUSES.find((s) => s.id === rfq.status);
  const statusInfo = statusData
    ? { label: isRTL ? statusData.labelAr : statusData.label, color: statusData.color }
    : { label: rfq.status, color: "#747688" };

  const formatDate = (ts: any) => {
    if (!ts) return null;
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString(isRTL ? "ar-SA" : "en-SA", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return null;
    }
  };

  const createdDate = formatDate(rfq.createdAt);
  const deadlineDate = formatDate(rfq.deadline);
  const offersCount = rfq.offersCount ?? 0;
  const hasOffers = showOffers && offersCount > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radiusXl,
          marginBottom: 10,
          ...colors.shadow.sm,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.987 : 1 }],
        },
      ]}
      accessibilityLabel={`${rfq.title}, ${statusInfo.label}, ${rfq.city}`}
      accessibilityRole="button"
    >
      {/* Status color stripe */}
      {!isRTL && <View style={[styles.stripe, { backgroundColor: statusInfo.color + "CC" }]} />}

      <View style={styles.inner}>
        {/* Top row: category + status badge + offers badge */}
        <View style={[styles.topRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.categoryRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.categoryDot, { backgroundColor: statusInfo.color }]} />
            <Text style={[styles.category, { color: colors.outline }]} numberOfLines={1}>
              {rfq.category}
            </Text>
          </View>
          <View style={[styles.topRight, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            {hasOffers && (
              <View style={[styles.offersBadge, { backgroundColor: colors.cta + "15", borderColor: colors.cta + "40" }]}>
                <Feather name="tag" size={10} color={colors.cta} />
                <Text style={[styles.offersBadgeText, { color: colors.cta }]}>
                  {offersCount} {t.rfq.offersSuffix}
                </Text>
              </View>
            )}
            <StatusBadge label={statusInfo.label} color={statusInfo.color} size="sm" />
          </View>
        </View>

        {/* Title */}
        <Text
          style={[
            styles.title,
            { color: colors.foreground, lineHeight: isRTL ? 30 : 26, textAlign: isRTL ? "right" : "left" },
          ]}
          numberOfLines={2}
        >
          {rfq.title}
        </Text>

        {/* Description (optional) */}
        {rfq.description ? (
          <Text
            style={[styles.desc, { color: colors.outline, textAlign: isRTL ? "right" : "left" }]}
            numberOfLines={1}
          >
            {rfq.description}
          </Text>
        ) : null}

        {/* Meta row */}
        <View style={[styles.metaRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.metaItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Feather name="map-pin" size={12} color={colors.outline} />
            <Text style={[styles.metaText, { color: colors.outline }]}>{rfq.city}</Text>
          </View>
          {deadlineDate && (
            <View style={[styles.metaItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Feather name="clock" size={12} color={colors.warning} />
              <Text style={[styles.metaText, { color: colors.warning }]}>{deadlineDate}</Text>
            </View>
          )}
          {createdDate && !deadlineDate && (
            <View style={[styles.metaItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Feather name="calendar" size={12} color={colors.outline} />
              <Text style={[styles.metaText, { color: colors.outline }]}>{createdDate}</Text>
            </View>
          )}
        </View>

        {/* Bottom row: no-offers hint + chevron */}
        <View style={[styles.bottomRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {showOffers && !hasOffers && (
            <Text style={[styles.noOffersHint, { color: colors.outline }]}>{t.rfq.noOffers}</Text>
          )}
          <View style={{ flex: 1 }} />
          <View style={[styles.chevronWrap, { backgroundColor: colors.accentBlueSoft }]}>
            <Feather
              name={isRTL ? "chevron-left" : "chevron-right"}
              size={14}
              color={colors.primary}
            />
          </View>
        </View>
      </View>

      {isRTL && <View style={[styles.stripe, styles.stripeRTL, { backgroundColor: statusInfo.color + "CC" }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderWidth: 1,
    overflow: "hidden",
  },
  stripe: {
    width: 4,
  },
  stripeRTL: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  inner: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  topRow: {
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryRow: {
    alignItems: "center",
    gap: 6,
    flex: 1,
    marginEnd: 8,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  category: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    flex: 1,
  },
  topRight: {
    alignItems: "center",
    gap: 6,
  },
  offersBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  offersBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  title: {
    fontSize: 16,
    fontFamily: "HankenGrotesk_600SemiBold",
  },
  desc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  metaRow: {
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  bottomRow: {
    alignItems: "center",
    marginTop: 2,
  },
  noOffersHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    fontStyle: "italic",
  },
  chevronWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
