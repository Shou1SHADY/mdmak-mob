import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OFFER_STATUSES } from "@/constants/data";
import { type, space, radius, toneColors, type Tone } from "@/lib/design";

export interface OfferItem {
  /** Share-link offer with no account behind it: nobody to chat with or notify in-app. */
  isGuestOffer?: boolean;
  id: string;
  rfqId: string;
  organizationId: string;
  supplierId?: string;
  price: string;
  notes?: string;
  status: string;
  createdAt?: any;
  updatedAt?: any;
  supplierName?: string;
  companyName?: string;
  rfqTitle?: string;
  contractorId?: string;
  contractorOrgId?: string;
  submittedByUserId?: string;
  submittedByUserName?: string;
  targetPrice?: number;
  reductionNote?: string;
  executionDuration?: string;
  executionDurationUnit?: string;
  deliveryLocation?: string;
}

interface OfferCardProps {
  offer: OfferItem;
  onPress?: () => void;
  actions?: React.ReactNode;
  rank?: number;
}

export function OfferCard({ offer, onPress, actions, rank }: OfferCardProps) {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();

  const statusData = OFFER_STATUSES.find((s) => s.id === offer.status);
  const tone: Tone = statusData?.tone ?? "neutral";
  const statusInfo = { label: statusData ? (isRTL ? statusData.labelAr : statusData.label) : offer.status };
  const accentColor = toneColors(colors, tone).fg;
  // Rank is coloured by meaning too: the lowest price is the good news.
  const rankTone: Tone | undefined = rank === 1 ? "success" : rank === 2 ? "warning" : rank === 3 ? "accent" : undefined;
  const rankC = rankTone ? toneColors(colors, rankTone) : undefined;
  const rankColor = rankC?.fg;
  const rankLabel = rank === 1
    ? t.cards.rankLowest
    : rank === 2
    ? t.cards.rankSecond
    : rank === 3
    ? t.cards.rankThird
    : undefined;

  const formatCurrency = (amount: string) =>
    new Intl.NumberFormat(isRTL ? "ar-SA" : "en-SA", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.card,
          // Physical, not logical: RTL is handled by hand in this app, so a
          // start-edge border would land on the wrong side in Arabic.
          [isRTL ? "borderRightWidth" : "borderLeftWidth"]: 4,
          [isRTL ? "borderRightColor" : "borderLeftColor"]: accentColor,
          ...colors.shadow.sm,
        },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.82 : 1}
      accessibilityLabel={`${t.rfq.quotedPrice}: ${formatCurrency(offer.price)}, ${statusInfo.label}`}
      accessibilityRole={onPress ? "button" : "none"}
    >
      {/* Rank + status row */}
      <View style={[styles.topRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {rankLabel && rankColor ? (
          <View style={[styles.rankBadge, { backgroundColor: rankC!.bg, borderColor: rankC!.border }]}>
            {rank === 1 && <Feather name="trending-down" size={11} color={rankColor} />}
            <Text style={[styles.rankText, { color: rankColor }]}>{rankLabel}</Text>
          </View>
        ) : <View />}
        <View style={[styles.badgeRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {/* A share-link offer has no account behind it: say so where the status is. */}
          {offer.isGuestOffer ? <StatusBadge label={t.rfq.guestOffer} tone="neutral" size="sm" /> : null}
          <StatusBadge label={statusInfo.label} tone={tone} />
          {onPress && (
            <Feather
              name={isRTL ? "chevron-left" : "chevron-right"}
              size={15}
              color={colors.outline}
            />
          )}
        </View>
      </View>

      {/* Price */}
      <View>
        <Text style={[styles.priceLabel, { color: colors.outline, textAlign: isRTL ? "right" : "left" }]}>
          {t.rfq.quotedPrice}
        </Text>
        <Text style={[styles.price, { color: rankColor ?? colors.foreground, textAlign: isRTL ? "right" : "left" }]}>
          {formatCurrency(offer.price)}
        </Text>
      </View>

      {/* Supplier name */}
      {(offer.supplierName || offer.companyName) && (
        <View style={[styles.metaItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Feather name="briefcase" size={13} color={colors.outline} />
          <Text
            style={[styles.metaText, { color: colors.onSurfaceVariant, textAlign: isRTL ? "right" : "left" }]}
          >
            {offer.companyName || offer.supplierName}
          </Text>
        </View>
      )}

      {/* RFQ title */}
      {offer.rfqTitle && (
        <View style={[styles.metaItem, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Feather name="file-text" size={13} color={colors.outline} />
          <Text
            style={[styles.rfqTitle, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left", flex: 1 }]}
            numberOfLines={1}
          >
            {offer.rfqTitle}
          </Text>
        </View>
      )}

      {/* Notes */}
      {offer.notes ? (
        <View
          style={[
            styles.notesRow,
            { backgroundColor: colors.surfaceGray, borderRadius: radius.control, flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <Feather name="message-square" size={12} color={colors.outline} style={{ marginTop: 1 }} />
          <Text
            style={[styles.notesText, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left", flex: 1 }]}
            numberOfLines={2}
          >
            {offer.notes}
          </Text>
        </View>
      ) : null}

      {/* Price reduction info — shown when contractor has set a target price */}
      {offer.status === "مطلوب تخفيض" && (offer.targetPrice || offer.reductionNote) && (  // ui-ok: stored offer status value
        <View style={[styles.reductionBox, { backgroundColor: colors.warningSoft, borderColor: colors.warningSoft }]}>
          {offer.targetPrice ? (
            <View style={[styles.reductionRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Feather name="trending-down" size={12} color={colors.warning} />
              <Text style={[styles.reductionLabel, { color: colors.warning }]}>
                {t.cards.targetPrice}
                {"  "}
                <Text style={[styles.reductionValue, { color: colors.warning }]}>
                  {new Intl.NumberFormat(isRTL ? "ar-SA" : "en-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(offer.targetPrice)}
                </Text>
              </Text>
            </View>
          ) : null}
          {offer.reductionNote ? (
            <View style={[styles.reductionRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Feather name="message-circle" size={12} color={colors.warning} />
              <Text style={[styles.reductionNote, { color: colors.warning, textAlign: isRTL ? "right" : "left", flex: 1 }]} numberOfLines={2}>
                {offer.reductionNote}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Action buttons */}
      {actions && <View style={styles.actions}>{actions}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: space.lg,
    gap: space.sm,
    marginBottom: space.md,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 2,
  },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  rankText: {
    ...type.captionStrong,
  },
  priceLabel: {
    ...type.caption,
  },
  price: {
    ...type.display,
    fontVariant: ["tabular-nums"],
  },
  metaItem: {
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    ...type.body,
  },
  rfqTitle: {
    ...type.caption,
  },
  notesRow: {
    gap: 6,
    padding: space.md,
    alignItems: "flex-start",
  },
  notesText: {
    ...type.caption,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  reductionBox: {
    borderWidth: 1,
    borderRadius: radius.control,
    padding: space.md,
    gap: 6,
  },
  reductionRow: {
    alignItems: "flex-start",
    gap: 6,
  },
  reductionLabel: {
    ...type.captionStrong,
  },
  reductionValue: {
    ...type.bodyStrong,
  },
  reductionNote: {
    ...type.caption,
  },
});
