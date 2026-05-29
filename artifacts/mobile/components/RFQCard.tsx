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
  const statusInfo = RFQ_STATUSES.find((s) => s.id === rfq.status) ?? {
    label: rfq.status,
    color: "#94a3b8",
  };

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
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {/* Category stripe */}
      <View style={[styles.stripe, { backgroundColor: colors.accent }]} />

      <View style={styles.inner}>
        <View style={styles.topRow}>
          <Text style={[styles.category, { color: colors.secondary }]} numberOfLines={1}>
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
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{rfq.city}</Text>
          </View>
          {rfq.deadline && (
            <View style={styles.metaItem}>
              <Feather name="calendar" size={12} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {formatDate(rfq.deadline)}
              </Text>
            </View>
          )}
          {showOffers && (
            <View style={styles.metaItem}>
              <Feather name="tag" size={12} color={colors.accent} />
              <Text style={[styles.metaText, { color: colors.accent }]}>
                {rfq.offersCount ?? 0} offers
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  stripe: { width: 4 },
  inner: { flex: 1, padding: 14, gap: 5 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  category: {
    fontSize: 11,
    fontWeight: "600" as const,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    flex: 1,
    marginRight: 8,
  },
  title: { fontSize: 15, fontWeight: "700" as const, lineHeight: 21 },
  desc: { fontSize: 13, lineHeight: 19 },
  metaRow: { flexDirection: "row", gap: 14, marginTop: 2, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12 },
});
