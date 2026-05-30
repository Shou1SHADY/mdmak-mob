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
  const statusInfo = RFQ_STATUSES.find((s) => s.id === rfq.status) ?? {
    label: rfq.status,
    color: "#94a3b8",
  };

  const formatDate = (ts: any) => {
    if (!ts) return "\u2014";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString(isRTL ? "ar-SA" : "en-SA", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "\u2014";
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          marginBottom: colors.spacing.md,
          ...colors.shadow.sm,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      {!isRTL && (
        <View style={[styles.stripe, { backgroundColor: colors.accent }]} />
      )}

      <View style={[styles.inner, { padding: colors.spacing.md, gap: colors.spacing.xs }]}>
        <View style={styles.topRow}>
          <Text
            style={[
              styles.category,
              {
                color: colors.secondary,
                ...colors.typography.caption,
                marginRight: colors.spacing.sm,
              },
            ]}
            numberOfLines={1}
          >
            {rfq.category}
          </Text>
          <StatusBadge label={statusInfo.label} color={statusInfo.color} size="sm" />
        </View>

        <Text
          style={[
            styles.title,
            { color: colors.foreground, ...colors.typography.h4, fontWeight: "700" },
          ]}
          numberOfLines={2}
        >
          {rfq.title}
        </Text>

        {rfq.description && (
          <Text
            style={[styles.desc, { color: colors.mutedForeground, ...colors.typography.bodySm }]}
            numberOfLines={2}
          >
            {rfq.description}
          </Text>
        )}

        <View style={[styles.metaRow, { gap: colors.spacing.md }]}>
          <View style={styles.metaItem}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text
              style={[styles.metaText, { color: colors.mutedForeground, ...colors.typography.caption }]}
            >
              {rfq.city}
            </Text>
          </View>
          {rfq.deadline && (
            <View style={styles.metaItem}>
              <Feather name="calendar" size={12} color={colors.mutedForeground} />
              <Text
                style={[styles.metaText, { color: colors.mutedForeground, ...colors.typography.caption }]}
              >
                {formatDate(rfq.deadline)}
              </Text>
            </View>
          )}
          {showOffers && (
            <View style={styles.metaItem}>
              <Feather name="tag" size={12} color={colors.accent} />
              <Text style={[styles.metaText, { color: colors.accent, ...colors.typography.caption }]}>
                {rfq.offersCount ?? 0} {t.rfq.offersSuffix}
              </Text>
            </View>
          )}
        </View>
      </View>
      {isRTL && (
        <View style={[styles.stripe, styles.stripeRTL, { backgroundColor: colors.accent }]} />
      )}
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
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  stripeRTL: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  inner: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  category: {
    textTransform: "uppercase",
    letterSpacing: 0.6,
    flex: 1,
  },
  title: {},
  desc: {},
  metaRow: {
    flexDirection: "row",
    marginTop: 2,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {},
});
