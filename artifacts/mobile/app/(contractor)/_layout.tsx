import React from "react";
import { Tabs, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, View, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useT } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { AIChatWidget } from "@/components/AIChatWidget";

function TabIcon({
  name,
  focused,
  colors,
}: {
  name: keyof typeof Feather.glyphMap;
  focused: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={[
        styles.iconWrap,
        focused && {
          backgroundColor: colors.cta + "18",
          borderColor: colors.cta + "22",
          borderWidth: 1,
        },
      ]}
    >
      <Feather
        name={name}
        size={21}
        color={focused ? colors.cta : colors.outline}
      />
    </View>
  );
}

export default function ContractorLayout() {
  const colors = useColors();
  const t = useT();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { user, loading } = useAuth();

  // Auth guard — protects every screen in this layout group
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.cta} />
      </View>
    );
  }
  if (!user) return <Redirect href="/auth/login" />;
  if (user.role !== "Contractor") return <Redirect href="/" />;
  const bottomOffset = (insets.bottom || 0) + 10;

  const tabBarStyle = isWeb
    ? {
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        height: 82,
        paddingBottom: 14,
        paddingTop: 6,
        paddingHorizontal: 12,
        elevation: 0,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      }
    : {
        position: "absolute" as const,
        left: 12,
        right: 12,
        bottom: bottomOffset,
        height: 72,
        borderRadius: 22,
        backgroundColor: colors.surface,
        borderTopWidth: 0,
        paddingBottom: 6,
        paddingTop: 0,
        paddingHorizontal: 4,
        shadowColor: "#0A1120",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.14,
        shadowRadius: 28,
        elevation: 18,
      };

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.cta,
        tabBarInactiveTintColor: colors.outline,
        tabBarStyle: tabBarStyle as any,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_600SemiBold",
          marginTop: 2,
        } as any,
        tabBarItemStyle: {
          paddingVertical: 4,
          gap: 0,
        } as any,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t.tabs.dashboard,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="grid" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="rfqs/index"
        options={{
          title: t.tabs.rfqs,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="file-text" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: t.tabs.compare,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="bar-chart-2" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: t.tabs.messages,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="message-circle" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.profile,
          tabBarIcon: ({ focused }) => (
            <TabIcon name="user" focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen name="rfqs/create" options={{ href: null }} />
      <Tabs.Screen name="rfqs/[id]" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="team" options={{ href: null }} />
      <Tabs.Screen name="suppliers" options={{ href: null }} />
    </Tabs>
    <AIChatWidget userRole="Contractor" />
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 46,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
});
