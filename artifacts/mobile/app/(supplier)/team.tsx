import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, Alert,
} from "react-native";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { tabScreenBottomPadding } from "@/lib/layout";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";

interface TeamMember {
  uid: string;
  displayName: string;
  email: string;
  role: string;
}

export default function SupplierTeamScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const t = useT();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!user?.organizationId) { setLoading(false); return; }
      try {
        const snap = await getDocs(
          query(collection(db, "users"), where("organizationId", "==", user.organizationId))
        );
        setMembers(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as TeamMember)));
      } catch (e: any) {
        console.warn("[Team]", e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [user?.organizationId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.team.title} showBack />
      <FlatList
        data={members}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={[styles.list, { paddingBottom: tabScreenBottomPadding(insets.bottom) }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.memberItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.cta + "15" }]}>
              <Text style={[styles.avatarText, { color: colors.cta }]}>
                {item.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberName, { color: colors.foreground }]} numberOfLines={1} ellipsizeMode="tail">
                {item.displayName}
              </Text>
              <Text style={[styles.memberEmail, { color: colors.mutedForeground }]} numberOfLines={1} ellipsizeMode="tail">
                {item.email}
              </Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "20" }]}>
              <Text style={[styles.roleText, { color: colors.primary }]}>
                {item.role?.charAt(0)?.toUpperCase() ?? "?"}{item.role ? item.role.slice(1) : ""}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="users" title={t.team.noMembers} subtitle={t.team.noMembersDesc} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  memberItem: {
    flexDirection: "row",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: { fontSize: 20, fontFamily: "HankenGrotesk_700Bold" },
  memberName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  memberEmail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  roleBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    flexShrink: 0,
  },
  roleText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
