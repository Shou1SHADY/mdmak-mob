import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RFQ_STATUSES, CATEGORIES, CITIES_EN, displayCity } from "@/constants/data";

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
  boqItems?: import("@/components/BOQEditor").BOQItem[];
  /** The website's line-item key — read both via readRfqLineItems(). */
  products?: Array<Record<string, any>>;
  /** "public" or "private"; private RFQs list their invitees in allowedSupplierOrgIds. */
  visibility?: string;
  allowedSupplierOrgIds?: string[];
  projectId?: string | null;
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

  const displayCategory = isRTL
    ? rfq.category
    : (CATEGORIES.find((c) => c.labelAr === rfq.category)?.label ?? rfq.category);
  const displayCityLabel = displayCity(rfq.city, isRTL);

  const formatDate = (ts: any) => {
    if (!ts) return null;
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString(isRTL ? "ar-SA" : "en-SA", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return null;
    }
  };

  const getDeadlineUrgency = (ts: any): { label: string; color: string; urgent: boolean } | null => {
    if (!ts) return null;
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diff < 0) return { label: isRTL ? "انتهى الموعد" : "Expired", color: "#ef4444", urgent: true };
      if (diff === 0) return { label: isRTL ? "اليوم" : "Today", color: "#ef4444", urgent: true };
      if (diff === 1) return { label: isRTL ? "غداً" : "Tomorrow", color: "#ef4444", urgent: true };
      if (diff <= 3) return { label: isRTL ? `${diff} أيام` : `${diff}d left`, color: "#ef4444", urgent: true };
      if (diff <= 7) return { label: isRTL ? `${diff} أيام` : `${diff}d left`, color: "#f59e0b", urgent: false };
      return { label: formatDate(ts) ?? "", color: "#f59e0b", urgent: false };
    } catch {
      return null;
    }
  };

  const createdDate = formatDate(rfq.createdAt);
  const deadlineUrgency = getDeadlineUrgency(rfq.deadline);
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
      accessibilityLabel={`${rfq.title}, ${statusInfo.label}, ${displayCityLabel}`}
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
              {displayCategory}
            </Text>
          </View>
          <View style={[styles.topRight, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
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
            <Text style={[styles.metaText, { color: colors.outline }]}>{displayCityLabel}</Text>
          </View>
          {deadlineUrgency ? (
            <View style={[
              styles.metaItem,
              deadlineUrgency.urgent && styles.urgentPill,
              deadlineUrgency.urgent && { backgroundColor: "#ef444418", borderColor: "#ef444430" },
              { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}>
              <Feather name={deadlineUrgency.urgent ? "alert-circle" : "clock"} size={12} color={deadlineUrgency.color} />
              <Text style={[styles.metaText, { color: deadlineUrgency.color, fontFamily: deadlineUrgency.urgent ? "Inter_700Bold" : "Inter_400Regular" }]}>
                {deadlineUrgency.label}
              </Text>
            </View>
          ) : createdDate ? (
            <View style={[styles.metaItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Feather name="calendar" size={12} color={colors.outline} />
              <Text style={[styles.metaText, { color: colors.outline }]}>{createdDate}</Text>
            </View>
          ) : null}
        </View>

        {/* Bottom row: offer count chip + chevron */}
        <View style={[styles.bottomRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {showOffers && (
            <View style={[styles.offerCountPill, {
              backgroundColor: offersCount > 0 ? colors.cta + "12" : colors.muted,
              borderColor: offersCount > 0 ? colors.cta + "35" : colors.border,
              flexDirection: isRTL ? "row-reverse" : "row",
            }]}>
              <Feather name="tag" size={11} color={offersCount > 0 ? colors.cta : colors.outline} />
              <Text style={[styles.offerCountText, { color: offersCount > 0 ? colors.cta : colors.outline }]}>
                {offersCount > 0 ? `${offersCount} ${t.rfq.offersSuffix}` : t.rfq.noOffers}
              </Text>
            </View>
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
    width: 5,
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
  offerCountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  offerCountText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  urgentPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  chevronWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
