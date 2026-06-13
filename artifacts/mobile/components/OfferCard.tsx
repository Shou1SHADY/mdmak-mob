import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OFFER_STATUSES } from "@/constants/data";

export interface OfferItem {
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
  const statusInfo = statusData
    ? { label: isRTL ? statusData.labelAr : statusData.label, color: statusData.color }
    : { label: offer.status, color: "#747688" };

  const accentColor = statusInfo.color;
  const rankColor = rank === 1 ? "#12A063" : rank === 2 ? "#f59e0b" : rank === 3 ? "#06b6d4" : undefined;
  const rankLabel = rank === 1
    ? (isRTL ? "الأدنى سعراً" : "Lowest")
    : rank === 2
    ? (isRTL ? "الثاني" : "2nd")
    : rank === 3
    ? (isRTL ? "الثالث" : "3rd")
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
          borderRadius: colors.radiusXl,
          borderStartWidth: 4,
          borderStartColor: accentColor,
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
          <View style={[styles.rankBadge, { backgroundColor: rankColor + "18", borderColor: rankColor + "40" }]}>
            {rank === 1 && <Feather name="trending-down" size={11} color={rankColor} />}
            <Text style={[styles.rankText, { color: rankColor }]}>{rankLabel}</Text>
          </View>
        ) : <View />}
        <View style={[styles.badgeRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <StatusBadge label={statusInfo.label} color={accentColor} />
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
        <Text style={[styles.price, { color: rankColor ?? colors.foreground, fontFamily: "HankenGrotesk_700Bold", textAlign: isRTL ? "right" : "left" }]}>
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
            { backgroundColor: colors.surfaceGray, borderRadius: colors.radiusMd, flexDirection: isRTL ? "row-reverse" : "row" },
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

      {/* Action buttons */}
      {actions && <View style={styles.actions}>{actions}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginBottom: 12,
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
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  rankText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 3,
    fontFamily: "Inter_600SemiBold",
  },
  price: {
    fontSize: 24,
    lineHeight: 30,
  },
  metaItem: {
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  rfqTitle: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  notesRow: {
    gap: 6,
    padding: 10,
    alignItems: "flex-start",
  },
  notesText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
});
