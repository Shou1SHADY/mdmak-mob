import React from "react";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function ContractorLayout() {
  const colors = useColors();
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
        tabBarActiveBackgroundColor: "transparent",
        tabBarInactiveBackgroundColor: "transparent",
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Feather name="grid" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rfqs/index"
        options={{
          title: "My RFQs",
          tabBarIcon: ({ color }) => <Feather name="file-text" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="suppliers"
        options={{
          title: "Suppliers",
          tabBarIcon: ({ color }) => <Feather name="users" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => <Feather name="message-circle" size={21} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Feather name="user" size={21} color={color} />,
        }}
      />
      <Tabs.Screen name="rfqs/create" options={{ href: null }} />
      <Tabs.Screen name="rfqs/[id]" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="team" options={{ href: null }} />
    </Tabs>
  );
}
