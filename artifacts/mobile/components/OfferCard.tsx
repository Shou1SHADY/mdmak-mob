import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OFFER_STATUSES } from "@/constants/data";

export interface OfferItem {
  id: string;
  rfqId: string;
  supplierOrgId: string;
  price: number;
  notes?: string;
  status: string;
  createdAt?: any;
  supplierName?: string;
  rfqTitle?: string;
}

interface OfferCardProps {
  offer: OfferItem;
  onPress?: () => void;
  actions?: React.ReactNode;
}

export function OfferCard({ offer, onPress, actions }: OfferCardProps) {
  const colors = useColors();
  const statusInfo = OFFER_STATUSES.find((s) => s.id === offer.status) ?? {
    label: offer.status,
    color: "#94a3b8",
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" }).format(amount);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <View style={styles.topRow}>
        <Text style={[styles.price, { color: colors.primary }]}>{formatCurrency(offer.price)}</Text>
        <StatusBadge label={statusInfo.label} color={statusInfo.color} size="sm" />
      </View>
      {offer.supplierName && (
        <View style={styles.metaItem}>
          <Feather name="briefcase" size={13} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{offer.supplierName}</Text>
        </View>
      )}
      {offer.rfqTitle && (
        <Text style={[styles.rfqTitle, { color: colors.foreground }]} numberOfLines={1}>
          {offer.rfqTitle}
        </Text>
      )}
      {offer.notes && (
        <Text style={[styles.notes, { color: colors.mutedForeground }]} numberOfLines={2}>
          {offer.notes}
        </Text>
      )}
      {actions && <View style={styles.actions}>{actions}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price: { fontSize: 20, fontWeight: "700" as const },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13 },
  rfqTitle: { fontSize: 14, fontWeight: "600" as const },
  notes: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
});
