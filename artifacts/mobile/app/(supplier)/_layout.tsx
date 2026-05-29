import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function SupplierLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "500" as const },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Dashboard", tabBarIcon: ({ color }) => <Feather name="grid" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="rfqs"
        options={{ title: "Browse RFQs", tabBarIcon: ({ color }) => <Feather name="search" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="offers"
        options={{ title: "My Offers", tabBarIcon: ({ color }) => <Feather name="tag" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="chats"
        options={{ title: "Messages", tabBarIcon: ({ color }) => <Feather name="message-circle" size={22} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} /> }}
      />
      <Tabs.Screen name="rfq/[id]" options={{ href: null }} />
      <Tabs.Screen name="submit-offer/[rfqId]" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen name="team" options={{ href: null }} />
    </Tabs>
  );
}
