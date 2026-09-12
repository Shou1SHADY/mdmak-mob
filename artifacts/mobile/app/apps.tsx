import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { router, Redirect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ScreenHeader } from "@/components/ScreenHeader";
import { scrollBottomPadding } from "@/lib/layout";
import { type, space, radius } from "@/lib/design";
import { siteUrl } from "@/lib/site-api";
import {
  communicationForRole,
  componentsForRole,
  hasBuiltScreens,
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
 * see there. Modules with screens on the phone are cards listing those screens.
 * Modules that are desktop work (Sales, Manufacturing, Accounting) are listed
 * compactly under "More on the web app" and open the website in one tap —
 * hiding them would suggest the company does not have the feature, and listing
 * every desktop page as a dimmed row would bury the ones that matter here.
 */
export default function AppsLauncherScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user, loading } = useAuth();
  const { can, isLoading: permsLoading } = usePermissions();

  const align = isRTL ? "right" : "left";
  const row = isRTL ? "row-reverse" : "row";

  const accent = (token: AccentToken): string => {
    const map: Record<AccentToken, string> = {
      primary: colors.primaryText,
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
  const onPhone = useMemo(() => modules.filter((m) => hasBuiltScreens(m, can)), [modules, can]);
  const onWebOnly = useMemo(() => modules.filter((m) => !hasBuiltScreens(m, can)), [modules, can]);
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

  const openOnWeb = (path: string) => {
    void WebBrowser.openBrowserAsync(siteUrl(path));
  };

  const openItem = (item: NavItem) => {
    if (!item.built) {
      openOnWeb(item.href);
      return;
    }
    router.push(item.href as never);
  };

  const openModule = (mod: PortalComponentDef) => {
    const items = visibleItems(mod.items, can);
    const home = items.find((i) => i.href === mod.homeHref && i.built) ?? items.find((i) => i.built);
    if (!home) {
      openOnWeb(mod.homeHref);
      return;
    }
    router.push(home.href as never);
  };

  const label = (mod: PortalComponentDef) => t.modules.labels[mod.labelKey as keyof typeof t.modules.labels];
  const description = (mod: PortalComponentDef) =>
    t.modules.descriptions[mod.descKey as keyof typeof t.modules.descriptions];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.modules.launcherTitle} subtitle={t.modules.launcherSubtitle} showBack />
      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingBottom: scrollBottomPadding(insets.bottom, false) }}
        showsVerticalScrollIndicator={false}
      >
        {onPhone.map((mod) => {
          const items = visibleItems(mod.items, can);
          const tint = accent(mod.accentToken);

          return (
            <View key={mod.id} style={[styles.module, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => openModule(mod)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={label(mod)}
                style={[styles.moduleHeader, { flexDirection: row }]}
              >
                <View style={[styles.moduleIcon, { backgroundColor: tint + "1A" }]}>
                  <Feather name={mod.icon} size={20} color={tint} />
                </View>
                <View style={styles.moduleTitles}>
                  <Text style={[type.title, { color: colors.foreground, textAlign: align }]}>{label(mod)}</Text>
                  <Text
                    style={[type.caption, { color: colors.mutedForeground, textAlign: align }]}
                    numberOfLines={1}
                  >
                    {description(mod)}
                  </Text>
                </View>
                <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={20} color={colors.outline} />
              </TouchableOpacity>

              <View style={[styles.items, { borderTopColor: colors.border }]}>
                {items.map((item) => (
                  <TouchableOpacity
                    key={item.href}
                    onPress={() => openItem(item)}
                    activeOpacity={0.7}
                    accessibilityRole={item.built ? "button" : "link"}
                    style={[styles.item, { flexDirection: row }]}
                  >
                    <Feather name={item.icon} size={16} color={item.built ? colors.mutedForeground : colors.outline} />
                    <Text
                      style={[
                        type.body,
                        { flex: 1, color: item.built ? colors.foreground : colors.mutedForeground, textAlign: align },
                      ]}
                      numberOfLines={1}
                    >
                      {t.modules.items[item.titleKey as keyof typeof t.modules.items]}
                    </Text>
                    {/* An item that lives on the website says so, and opens it there. */}
                    {!item.built && <Feather name="external-link" size={13} color={colors.outline} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}

        <Text style={[type.captionStrong, styles.sectionLabel, { color: colors.mutedForeground, textAlign: align }]}>
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
                style={[styles.item, { flexDirection: row }]}
              >
                <Feather name={item.icon} size={16} color={colors.mutedForeground} />
                <Text style={[type.body, { flex: 1, color: colors.foreground, textAlign: align }]}>
                  {t.modules.items[item.titleKey as keyof typeof t.modules.items]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {onWebOnly.length > 0 && (
          <>
            <Text
              style={[type.captionStrong, styles.sectionLabel, { color: colors.mutedForeground, textAlign: align }]}
            >
              {t.modules.moreOnWeb}
            </Text>
            <Text style={[type.caption, styles.sectionHint, { color: colors.outline, textAlign: align }]}>
              {t.modules.moreOnWebHint}
            </Text>
            <View style={[styles.module, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.items}>
                {onWebOnly.map((mod) => {
                  const tint = accent(mod.accentToken);
                  return (
                    <TouchableOpacity
                      key={mod.id}
                      onPress={() => openModule(mod)}
                      activeOpacity={0.7}
                      accessibilityRole="link"
                      accessibilityLabel={label(mod)}
                      style={[styles.webRow, { flexDirection: row }]}
                    >
                      <View style={[styles.webIcon, { backgroundColor: tint + "1A" }]}>
                        <Feather name={mod.icon} size={16} color={tint} />
                      </View>
                      <View style={styles.moduleTitles}>
                        <Text style={[type.bodyStrong, { color: colors.foreground, textAlign: align }]}>
                          {label(mod)}
                        </Text>
                        <Text
                          style={[type.caption, { color: colors.mutedForeground, textAlign: align }]}
                          numberOfLines={1}
                        >
                          {description(mod)}
                        </Text>
                      </View>
                      <Feather name="external-link" size={14} color={colors.outline} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  module: {
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: space.md,
    overflow: "hidden",
  },
  moduleHeader: {
    alignItems: "center",
    gap: space.md,
    padding: space.lg,
  },
  moduleIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleTitles: { flex: 1, gap: space.xs },
  items: { borderTopWidth: StyleSheet.hairlineWidth },
  item: {
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    // 44px minimum touch target.
    minHeight: 44,
  },
  webRow: {
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    minHeight: 56,
  },
  webIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    marginTop: space.sm,
    marginBottom: space.sm,
    marginHorizontal: space.xs,
  },
  sectionHint: {
    marginTop: -space.xs,
    marginBottom: space.sm,
    marginHorizontal: space.xs,
  },
});
