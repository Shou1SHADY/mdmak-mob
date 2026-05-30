import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useT } from "@/context/LanguageContext";

export default function SupplierLayout() {
  const colors = useColors();
  const t = useT();
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: "#64748B",
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: colors.primary,
          borderTopWidth: 0,
          elevation: 0,
          height: isWeb ? 80 : 62,
          paddingBottom: isWeb ? 10 : 6,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600" as const,
          marginTop: 1,
        },
        tabBarIconStyle: { marginTop: 4 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: t.tabs.dashboard, tabBarIcon: ({ color }) => <Feather name="grid" size={21} color={color} /> }}
      />
      <Tabs.Screen
        name="rfqs"
        options={{ title: t.tabs.browseRfqs, tabBarIcon: ({ color }) => <Feather name="search" size={21} color={color} /> }}
      />
      <Tabs.Screen
        name="offers"
        options={{ title: t.tabs.offers, tabBarIcon: ({ color }) => <Feather name="tag" size={21} color={color} /> }}
      />
      <Tabs.Screen
        name="chats"
        options={{ title: t.tabs.messages, tabBarIcon: ({ color }) => <Feather name="message-circle" size={21} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t.tabs.profile, tabBarIcon: ({ color }) => <Feather name="user" size={21} color={color} /> }}
      />
      <Tabs.Screen name="rfq/[id]" options={{ href: null }} />
      <Tabs.Screen name="submit-offer/[rfqId]" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen name="team" options={{ href: null }} />
    </Tabs>
  );
}
