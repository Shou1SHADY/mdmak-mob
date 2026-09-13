import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RFQ_STATUSES, CATEGORIES, displayCity } from "@/constants/data";
import { type, space, radius, toneColors, type Tone } from "@/lib/design";

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
  const tone: Tone = statusData?.tone ?? "neutral";
  const toneC = toneColors(colors, tone);
  const statusInfo = { label: statusData ? (isRTL ? statusData.labelAr : statusData.label) : rfq.status, color: toneC.fg };

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
      if (diff < 0) return { label: t.cards.expired, color: colors.destructive, urgent: true };
      if (diff === 0) return { label: t.cards.today, color: colors.destructive, urgent: true };
      if (diff === 1) return { label: t.cards.tomorrow, color: colors.destructive, urgent: true };
      if (diff <= 3) return { label: t.cards.daysLeft.replace("{n}", String(diff)), color: colors.destructive, urgent: true };
      if (diff <= 7) return { label: t.cards.daysLeft.replace("{n}", String(diff)), color: colors.warning, urgent: false };
      return { label: formatDate(ts) ?? "", color: colors.mutedForeground, urgent: false };
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
          borderRadius: radius.card,
          marginBottom: space.md,
          ...colors.shadow.sm,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.987 : 1 }],
        },
      ]}
      accessibilityLabel={`${rfq.title}, ${statusInfo.label}, ${displayCityLabel}`}
      accessibilityRole="button"
    >
      {/* Status color stripe */}
      {!isRTL && <View style={[styles.stripe, { backgroundColor: statusInfo.color }]} />}

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
            <StatusBadge label={statusInfo.label} tone={tone} size="sm" />
          </View>
        </View>

        {/* Title */}
        <Text
          style={[
            styles.title,
            { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
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
              deadlineUrgency.urgent && { backgroundColor: colors.destructiveSoft, borderColor: colors.destructiveSoft },
              { flexDirection: isRTL ? "row-reverse" : "row" },
            ]}>
              <Feather name={deadlineUrgency.urgent ? "alert-circle" : "clock"} size={12} color={deadlineUrgency.color} />
              <Text style={[deadlineUrgency.urgent ? type.captionStrong : type.caption, { color: deadlineUrgency.color }]}>
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
              backgroundColor: offersCount > 0 ? colors.ctaSoft : colors.muted,
              borderColor: offersCount > 0 ? colors.ctaSoft : colors.border,
              flexDirection: isRTL ? "row-reverse" : "row",
            }]}>
              <Feather name="tag" size={11} color={offersCount > 0 ? colors.cta : colors.outline} />
              <Text style={[styles.offerCountText, { color: offersCount > 0 ? colors.cta : colors.outline }]}>
                {offersCount > 0 ? `${offersCount} ${t.rfq.offersSuffix}` : t.rfq.noOffers}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <View style={[styles.chevronWrap, { backgroundColor: colors.ctaSoft }]}>
            <Feather
              name={isRTL ? "chevron-left" : "chevron-right"}
              size={14}
              color={colors.cta}
            />
          </View>
        </View>
      </View>

      {isRTL && <View style={[styles.stripe, styles.stripeRTL, { backgroundColor: statusInfo.color }]} />}
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
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  inner: {
    flex: 1,
    padding: space.lg,
    gap: space.sm,
  },
  topRow: {
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  categoryRow: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  categoryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  category: {
    ...type.caption,
    flex: 1,
  },
  topRight: {
    alignItems: "center",
    gap: 6,
  },
  title: {
    ...type.title,
  },
  desc: {
    ...type.caption,
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
    ...type.caption,
  },
  bottomRow: {
    alignItems: "center",
    marginTop: 2,
  },
  offerCountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  offerCountText: {
    ...type.captionStrong,
  },
  urgentPill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
