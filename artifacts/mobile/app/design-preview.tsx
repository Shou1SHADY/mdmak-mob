import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useTheme, type ThemeMode } from "@/context/ThemeContext";
import { ScreenHeader } from "@/components/ScreenHeader";
import { isPreview, setPreview } from "@/lib/preview";
import { scrollBottomPadding } from "@/lib/layout";

/**
 * Design preview — every module screen, rendered against fixtures, with no
 * sign-in.
 *
 * Reviewing this app's UI otherwise needs a live account and real records,
 * which makes design work slow and makes it impossible to see the states that
 * matter most: a long Arabic company name that has to truncate, an eight-figure
 * value, an overdue task, a record with half its optional fields missing. The
 * fixtures in lib/preview.ts are built from exactly those cases.
 *
 * Web only, and off unless this screen turns it on — see lib/preview.ts for how
 * that is enforced. It is deliberately absent from the module registry, so it
 * never appears in the launcher; reach it by typing the path.
 */

interface PreviewLink {
  label: string;
  href: string;
  note?: string;
}

const GROUPS: { title: string; links: PreviewLink[] }[] = [
  {
    title: "CRM",
    links: [
      { label: "Overview", href: "/(crm)/dashboard" },
      { label: "Leads", href: "/(crm)/leads", note: "long names, missing fields" },
      { label: "Lead detail", href: "/(crm)/leads/c1", note: "longest name in the set" },
      { label: "Opportunities", href: "/(crm)/opportunities", note: "8-figure value, overdue" },
      { label: "Deal detail", href: "/(crm)/opportunities/o1", note: "stage rail, gates" },
      { label: "Activities", href: "/(crm)/activities", note: "overdue / today / no date" },
    ],
  },
  {
    title: "Projects",
    links: [
      { label: "Projects", href: "/(projects)" },
      { label: "Project detail", href: "/(projects)/p1", note: "BOQ + tenders" },
    ],
  },
  {
    title: "Inventory",
    links: [
      { label: "Warehouses", href: "/(inventory)" },
      { label: "Stock", href: "/(inventory)/w1", note: "low stock, piece-tracked" },
      { label: "Requests", href: "/(inventory)/requests", note: "release / confirm" },
      { label: "Waste", href: "/(inventory)/waste" },
    ],
  },
  {
    title: "Finance & HR",
    links: [
      { label: "Invoices", href: "/(finance)/invoices", note: "overdue totals" },
      { label: "Guarantees", href: "/(finance)/guarantees" },
      { label: "Employees", href: "/(finance)/employees" },
    ],
  },
  {
    title: "Other",
    links: [
      { label: "Goods received", href: "/(goods)", note: "confirm sheet" },
      { label: "Connections", href: "/(connections)", note: "supplier only" },
      { label: "App launcher", href: "/apps" },
    ],
  },
];

export default function DesignPreviewScreen() {
  const colors = useColors();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, isRTL } = useLanguage();
  const { themeMode, setThemeMode } = useTheme();
  const [on, setOn] = useState(false);

  // Turn preview on when this screen opens, so the links below land on screens
  // that already have data rather than bouncing to the login guard.
  useEffect(() => {
    setPreview(true);
    setOn(isPreview());
  }, []);

  if (Platform.OS !== "web") {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 32 }]}>
        <Feather name="monitor" size={30} color={colors.outline} />
        <Text style={[styles.body, { color: colors.mutedForeground, textAlign: "center" }]}>
          Design preview runs on the web build only.
        </Text>
      </View>
    );
  }

  const Segmented = <T extends string>({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (v: T) => void;
  }) => (
    <View style={styles.control}>
      <Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.segment, { borderColor: colors.border, backgroundColor: colors.muted }]}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => onChange(o.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.segmentItem,
                active && { backgroundColor: colors.cta },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? colors.ctaForeground : colors.mutedForeground },
                ]}
              >
                {o.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Design preview" subtitle="fixtures · no sign-in" showBack />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: scrollBottomPadding(insets.bottom, false) }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.banner,
            { backgroundColor: colors.warning + "18", borderColor: colors.warning + "40" },
          ]}
        >
          <Feather name="eye" size={15} color={colors.warning} />
          <Text style={[styles.bannerText, { color: colors.warning }]}>
            {on
              ? "Preview is ON for this tab. Screens below show fixture data, not real records."
              : "Preview could not be enabled — session storage is blocked."}
          </Text>
        </View>

        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Segmented<ThemeMode>
            label="Theme"
            value={themeMode}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "system", label: "System" },
            ]}
            onChange={(v) => setThemeMode(v)}
          />
          <Segmented
            label="Language"
            value={language}
            options={[
              { value: "ar" as typeof language, label: "العربية" },
              { value: "en" as typeof language, label: "English" },
            ]}
            onChange={(v) => setLanguage(v)}
          />
        </View>

        {GROUPS.map((group) => (
          <View
            key={group.title}
            style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text
              style={[styles.groupTitle, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
            >
              {group.title}
            </Text>
            {group.links.map((link) => (
              <TouchableOpacity
                key={link.href}
                onPress={() => router.push(link.href as never)}
                accessibilityRole="button"
                style={[styles.row, { flexDirection: isRTL ? "row-reverse" : "row", borderTopColor: colors.border }]}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={[styles.rowLabel, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                  >
                    {link.label}
                  </Text>
                  {link.note ? (
                    <Text
                      style={[styles.rowNote, { color: colors.outline, textAlign: isRTL ? "right" : "left" }]}
                    >
                      {link.note}
                    </Text>
                  ) : null}
                </View>
                <Feather
                  name={isRTL ? "chevron-left" : "chevron-right"}
                  size={17}
                  color={colors.outline}
                />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <TouchableOpacity
          onPress={() => {
            setPreview(false);
            setOn(false);
            router.replace("/");
          }}
          accessibilityRole="button"
          style={[styles.exit, { borderColor: colors.border, flexDirection: isRTL ? "row-reverse" : "row" }]}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.exitText, { color: colors.destructive }]}>
            Exit preview and return to the real app
          </Text>
        </TouchableOpacity>

        <Text style={[styles.footnote, { color: colors.outline }]}>
          {t.modules.launcherSubtitle}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  body: { fontSize: 14, lineHeight: 23, fontFamily: "Inter_400Regular" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  bannerText: { flex: 1, fontSize: 12, lineHeight: 20, fontFamily: "Inter_500Medium" },
  panel: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  control: { marginBottom: 14 },
  controlLabel: { fontSize: 12, lineHeight: 20, fontFamily: "Inter_500Medium", marginBottom: 8 },
  segment: { flexDirection: "row", borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  segmentItem: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center" },
  segmentText: { fontSize: 13, lineHeight: 21, fontFamily: "Inter_600SemiBold" },
  groupTitle: { fontSize: 15, lineHeight: 24, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  row: {
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 14, lineHeight: 23, fontFamily: "Inter_500Medium" },
  rowNote: { fontSize: 11, lineHeight: 18, fontFamily: "Inter_400Regular" },
  exit: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  exitText: { fontSize: 13, lineHeight: 21, fontFamily: "Inter_600SemiBold" },
  footnote: { fontSize: 11, lineHeight: 18, textAlign: "center", marginTop: 14 },
});
