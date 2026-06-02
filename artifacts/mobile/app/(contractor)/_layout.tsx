import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useT } from "@/context/LanguageContext";

const TAB_ICON_SIZE = 22;

function TabIcon({ name, color, focused, colors }: { name: keyof typeof Feather.glyphMap; color: string; focused: boolean; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={{
      width: 40,
      height: 32,
      borderRadius: 10,
      backgroundColor: focused ? colors.glowBlue : "transparent",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <Feather name={name} size={TAB_ICON_SIZE} color={color} />
    </View>
  );
}

const sharedTabOptions = (colors: ReturnType<typeof useColors>, isWeb: boolean) => ({
  tabBarActiveTintColor: colors.cta,
  tabBarInactiveTintColor: colors.outline,
  headerShown: false,
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    elevation: 0,
    height: isWeb ? 82 : 66,
    paddingBottom: isWeb ? 14 : 8,
    paddingTop: 6,
    paddingHorizontal: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  } as any,
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: "600" as const,
    letterSpacing: 0.2,
    marginTop: 4,
  } as any,
  tabBarItemStyle: {
    gap: 0,
    paddingHorizontal: 6,
  } as any,
});

export default function ContractorLayout() {
  const colors = useColors();
  const t = useT();
  const isWeb = Platform.OS === "web";

  return (
    <Tabs screenOptions={sharedTabOptions(colors, isWeb)}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t.tabs.dashboard,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="grid" color={focused ? colors.cta : colors.outline} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="rfqs/index"
        options={{
          title: t.tabs.rfqs,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="file-text" color={focused ? colors.cta : colors.outline} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="suppliers"
        options={{
          title: t.tabs.suppliers,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="users" color={focused ? colors.cta : colors.outline} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: t.tabs.messages,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="message-circle" color={focused ? colors.cta : colors.outline} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.profile,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="user" color={focused ? colors.cta : colors.outline} focused={focused} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen name="rfqs/create" options={{ href: null }} />
      <Tabs.Screen name="rfqs/[id]" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="team" options={{ href: null }} />
    </Tabs>
  );
}
