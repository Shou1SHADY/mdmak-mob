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
}

export function OfferCard({ offer, onPress, actions }: OfferCardProps) {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const statusInfo = OFFER_STATUSES.find((s) => s.id === offer.status) ?? {
    label: offer.status,
    color: "#94a3b8",
  };

  const formatCurrency = (amount: string) =>
    new Intl.NumberFormat(isRTL ? "ar-SA" : "en-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(parseFloat(amount));

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.82 : 1}
    >
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>{t.rfq.quotedPrice}</Text>
          <Text style={[styles.price, { color: colors.foreground }]}>{formatCurrency(offer.price)}</Text>
        </View>
        <StatusBadge label={statusInfo.label} color={statusInfo.color} />
      </View>
      {offer.supplierName && (
        <View style={styles.metaItem}>
          <Feather name="briefcase" size={13} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.secondary }]}>{offer.supplierName}</Text>
        </View>
      )}
      {offer.rfqTitle && (
        <Text style={[styles.rfqTitle, { color: colors.foreground }]} numberOfLines={1}>
          {offer.rfqTitle}
        </Text>
      )}
      {actions && <View style={styles.actions}>{actions}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 16,
    gap: 8,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  priceLabel: { fontSize: 11, fontWeight: "500" as const, marginBottom: 2 },
  price: { fontSize: 22, fontWeight: "700" as const },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, fontWeight: "500" as const },
  rfqTitle: { fontSize: 14, fontWeight: "600" as const },
  notes: { fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4, flexWrap: "wrap" },
});
