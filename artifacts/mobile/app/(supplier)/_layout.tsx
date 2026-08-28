import React from "react";
import { Tabs, Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useT } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { AIChatWidget } from "@/components/AIChatWidget";
import { ModuleTabIcon, useModuleTabOptions } from "@/components/ModuleTabBar";


/**
 * The tab bar comes from components/ModuleTabBar — the same one every module
 * uses. It lived here as an inline copy, and the module bars were written from
 * it by hand, so six bars drifted apart: the label size that fit here sheared
 * off in the modules. One definition, one geometry.
 */
export default function SupplierLayout() {
  const colors = useColors();
  const t = useT();
  const { user, loading } = useAuth();
  const tabOptions = useModuleTabOptions();

  // Auth guard — protects every screen in this layout group
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.cta} />
      </View>
    );
  }
  if (!user) return <Redirect href="/auth/login" />;
  if (user.role !== "Supplier") return <Redirect href="/" />;
  return (
    <View style={{ flex: 1 }}>
    <Tabs screenOptions={tabOptions}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t.tabs.dashboard,
          tabBarIcon: ({ focused }) => (
            <ModuleTabIcon name="grid" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="rfqs"
        options={{
          title: t.tabs.browseRfqs,
          tabBarLabel: t.tabs.browseRfqsShort,
          tabBarIcon: ({ focused }) => (
            <ModuleTabIcon name="search" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          title: t.tabs.offers,
          tabBarIcon: ({ focused }) => (
            <ModuleTabIcon name="tag" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: t.tabs.messages,
          tabBarIcon: ({ focused }) => (
            <ModuleTabIcon name="message-circle" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.profile,
          tabBarIcon: ({ focused }) => (
            <ModuleTabIcon name="user" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="rfq/[id]" options={{ href: null }} />
      <Tabs.Screen name="submit-offer/[rfqId]" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen name="team" options={{ href: null }} />
    </Tabs>
    <AIChatWidget userRole="Supplier" />
    </View>
  );
}

