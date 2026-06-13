import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { Button } from "@/components/ui/Button";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Organization, LegalDoc } from "@/context/AuthContext";

interface ProfileGateProps {
  role: "contractor" | "supplier";
  organization: Organization | null;
  missingFields: string[];
}

export function useProfileGate(
  role: "contractor" | "supplier",
  organization: Organization | null
): { isComplete: boolean; missingFields: string[] } {
  const t = useT();

  const docs = organization?.documents ?? {};
  const hasCR = !!(docs["cr"] as LegalDoc | undefined)?.url;
  const hasVAT = !!(docs["vat"] as LegalDoc | undefined)?.url;

  const checks = [
    { ok: !!organization?.name, label: t.profile.companyName },
    { ok: !!(organization?.phone), label: t.profile.phone },
    { ok: !!organization?.crNumber, label: t.profile.crNumber },
    { ok: !!organization?.taxNumber, label: t.profile.taxNumber },
    { ok: !!organization?.city, label: t.profile.city },
    { ok: !!organization?.location, label: t.profile.location },
    { ok: hasCR, label: t.profile.docCR },
    { ok: hasVAT, label: t.profile.docVAT },
  ];

  const missing = checks.filter((c) => !c.ok).map((c) => c.label);
  return { isComplete: missing.length === 0, missingFields: missing };
}

export function ProfileIncompleteGate({ role, organization, missingFields }: ProfileGateProps) {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  const desc = role === "contractor" ? t.profile.gateContractorDesc : t.profile.gateSupplierDesc;
  const profileRoute =
    role === "contractor" ? "/(contractor)/profile" : "/(supplier)/profile";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.profile.gateTitle} showBack />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 40 },
        ]}
      >
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: colors.warning + "18" }]}>
          <Feather name="alert-circle" size={40} color={colors.warning} />
        </View>

        <Text
          style={[
            styles.title,
            { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t.profile.gateTitle}
        </Text>

        <Text
          style={[
            styles.desc,
            { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {desc}
        </Text>

        {/* Missing items */}
        {missingFields.length > 0 && (
          <View
            style={[
              styles.missingCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.missingTitle,
                { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {t.profile.gateMissing}
            </Text>
            {missingFields.map((field) => (
              <View
                key={field}
                style={[
                  styles.missingRow,
                  { flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
              >
                <View
                  style={[styles.missingDot, { backgroundColor: colors.destructive }]}
                />
                <Text style={[styles.missingText, { color: colors.mutedForeground }]}>
                  {field}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Button
          title={t.profile.gateAction}
          onPress={() => router.push(profileRoute as any)}
          fullWidth
          size="lg"
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 20,
    alignItems: "stretch",
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: "HankenGrotesk_700Bold",
  },
  desc: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
  },
  missingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  missingTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  missingRow: {
    alignItems: "center",
    gap: 10,
  },
  missingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  missingText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
});
