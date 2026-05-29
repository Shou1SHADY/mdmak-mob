import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RFQ_STATUSES } from "@/constants/data";

export interface RFQItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  subcategory?: string;
  city: string;
  status: string;
  deadline?: any;
  createdAt?: any;
  offersCount?: number;
  contractorOrgId?: string;
}

interface RFQCardProps {
  rfq: RFQItem;
  onPress: () => void;
  showOffers?: boolean;
}

export function RFQCard({ rfq, onPress, showOffers = false }: RFQCardProps) {
  const colors = useColors();
  const statusInfo = RFQ_STATUSES.find((s) => s.id === rfq.status) ?? { label: rfq.status, color: "#94a3b8" };

  const formatDate = (ts: any) => {
    if (!ts) return "—";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString("en-SA", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "—";
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        <Text style={[styles.category, { color: colors.primary }]} numberOfLines={1}>
          {rfq.category}
        </Text>
        <StatusBadge label={statusInfo.label} color={statusInfo.color} size="sm" />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={2}>
        {rfq.title}
      </Text>
      {rfq.description && (
        <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {rfq.description}
        </Text>
      )}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Feather name="map-pin" size={13} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{rfq.city}</Text>
        </View>
        {rfq.deadline && (
          <View style={styles.metaItem}>
            <Feather name="calendar" size={13} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {formatDate(rfq.deadline)}
            </Text>
          </View>
        )}
        {showOffers && (
          <View style={styles.metaItem}>
            <Feather name="tag" size={13} color={colors.primary} />
            <Text style={[styles.metaText, { color: colors.primary }]}>
              {rfq.offersCount ?? 0} offers
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 6,
    marginBottom: 12,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  category: { fontSize: 12, fontWeight: "600" as const, textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 16, fontWeight: "700" as const, lineHeight: 22 },
  desc: { fontSize: 14, lineHeight: 20 },
  metaRow: { flexDirection: "row", gap: 16, marginTop: 4, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 13 },
});
