import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { router, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ScreenHeader } from "@/components/ScreenHeader";
import { scrollBottomPadding } from "@/lib/layout";
import {
  communicationForRole,
  componentsForRole,
  visibleComponents,
  visibleItems,
  type AccentToken,
  type NavItem,
  type PortalComponentDef,
} from "@/lib/portal-components";

/**
 * The module launcher — this app's equivalent of the website's `/contractor/apps`
 * page and its app-switcher dropdown.
 *
 * It reads the same registry the website's sidebar reads, filtered through the
 * same permission checks, so a member sees exactly the modules here that they
 * see there. A module whose screens have not been ported yet still appears, but
 * dimmed with an explanation — hiding it would suggest the company does not have
 * the feature, when in fact it is one tab away on the web app.
 */
export default function AppsLauncherScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user, loading } = useAuth();
  const { can, isLoading: permsLoading } = usePermissions();

  const accent = (token: AccentToken): string => {
    const map: Record<AccentToken, string> = {
      primary: colors.primary,
      secondary: colors.secondary,
      accent: colors.accent,
      success: colors.success,
      cta: colors.cta,
      warning: colors.warning,
      destructive: colors.destructive,
    };
    return map[token];
  };

  const modules = useMemo(
    () => visibleComponents(componentsForRole(user?.role), can),
    // `can` closes over the member's groups, which load asynchronously.
    [user?.role, can]
  );
  const communication = useMemo(() => communicationForRole(user?.role), [user?.role]);

  // The launcher lists every module the caller may open, so it needs the same
  // guard they do. Without it a signed-out visitor saw a partial list built
  // from the implicit read-only permissions rather than the login screen.
  if (loading || permsLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.cta} />
      </View>
    );
  }
  if (!user) return <Redirect href="/auth/login" />;

  const openItem = (item: NavItem) => {
    if (!item.built) {
      Alert.alert(t.modules.onWebOnly, t.modules.onWebOnlyHint);
      return;
    }
    router.push(item.href as never);
  };

  const openModule = (mod: PortalComponentDef) => {
    const items = visibleItems(mod.items, can);
    const home = items.find((i) => i.href === mod.homeHref && i.built) ?? items.find((i) => i.built);
    if (!home) {
      Alert.alert(t.modules.onWebOnly, t.modules.onWebOnlyHint);
      return;
    }
    router.push(home.href as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t.modules.launcherTitle}
        subtitle={t.modules.launcherSubtitle}
        showBack
      />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: scrollBottomPadding(insets.bottom, false) }}
        showsVerticalScrollIndicator={false}
      >
        {modules.map((mod) => {
          const items = visibleItems(mod.items, can);
          const tint = accent(mod.accentToken);
          const anyBuilt = items.some((i) => i.built);

          return (
            <View
              key={mod.id}
              style={[styles.module, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <TouchableOpacity
                onPress={() => openModule(mod)}
                activeOpacity={0.8}
                accessibilityRole="button"
                style={[styles.moduleHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}
              >
                <View style={[styles.moduleIcon, { backgroundColor: tint + "1A" }]}>
                  <Feather name={mod.icon} size={20} color={tint} />
                </View>
                <View style={styles.moduleTitles}>
                  <Text
                    style={[
                      styles.moduleTitle,
                      { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
                    ]}
                  >
                    {t.modules.labels[mod.labelKey as keyof typeof t.modules.labels]}
                  </Text>
                  <Text
                    style={[
                      styles.moduleDesc,
                      { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
                    ]}
                    numberOfLines={1}
                  >
                    {t.modules.descriptions[mod.descKey as keyof typeof t.modules.descriptions]}
                  </Text>
                </View>
                {anyBuilt ? (
                  <Feather
                    name={isRTL ? "chevron-left" : "chevron-right"}
                    size={20}
                    color={colors.outline}
                  />
                ) : (
                  <View style={[styles.webBadge, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.webBadgeText, { color: colors.mutedForeground }]}>
                      {t.modules.onWebOnly}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={[styles.items, { borderTopColor: colors.border }]}>
                {items.map((item) => (
                  <TouchableOpacity
                    key={item.href}
                    onPress={() => openItem(item)}
                    activeOpacity={item.built ? 0.7 : 1}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !item.built }}
                    style={[styles.item, { flexDirection: isRTL ? "row-reverse" : "row" }]}
                  >
                    <Feather
                      name={item.icon}
                      size={16}
                      color={item.built ? colors.mutedForeground : colors.outline}
                    />
                    <Text
                      style={[
                        styles.itemText,
                        {
                          color: item.built ? colors.foreground : colors.outline,
                          textAlign: isRTL ? "right" : "left",
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {t.modules.items[item.titleKey as keyof typeof t.modules.items]}
                    </Text>
                    {!item.built && (
                      <Feather name="external-link" size={13} color={colors.outline} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}

        <Text
          style={[
            styles.sectionLabel,
            { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
          ]}
        >
          {t.tabs.messages}
        </Text>
        <View style={[styles.module, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.items}>
            {communication.map((item) => (
              <TouchableOpacity
                key={item.href}
                onPress={() => openItem(item)}
                activeOpacity={0.7}
                accessibilityRole="button"
                style={[styles.item, { flexDirection: isRTL ? "row-reverse" : "row" }]}
              >
                <Feather name={item.icon} size={16} color={colors.mutedForeground} />
                <Text
                  style={[
                    styles.itemText,
                    { color: colors.foreground, textAlign: isRTL ? "right" : "left" },
                  ]}
                >
                  {t.modules.items[item.titleKey as keyof typeof t.modules.items]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  module: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  moduleHeader: {
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  moduleIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleTitles: { flex: 1, gap: 2 },
  moduleTitle: { fontSize: 15, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  moduleDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  webBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  webBadgeText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  items: { borderTopWidth: StyleSheet.hairlineWidth },
  item: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    // 44px minimum touch target.
    minHeight: 44,
  },
  itemText: { flex: 1, fontSize: 13, lineHeight: 21, fontFamily: "Inter_400Regular" },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
    marginBottom: 8,
    marginHorizontal: 4,
  },
});
