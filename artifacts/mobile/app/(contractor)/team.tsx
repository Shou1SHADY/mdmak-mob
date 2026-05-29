import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Platform,
} from "react-native";
import { router } from "expo-router";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { EmptyState } from "@/components/ui/EmptyState";

interface TeamMember {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  city?: string;
}

export default function TeamScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!user?.organizationId) return;
      try {
        const q = query(collection(db, "users"), where("organizationId", "==", user.organizationId));
        const snap = await getDocs(q);
        setMembers(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as TeamMember)));
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [user?.organizationId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Team</Text>
        <View style={{ width: 24 }} />
      </View>
      <FlatList
        data={members}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
        renderItem={({ item }) => (
          <View style={[styles.memberItem, { borderBottomColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {item.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberName, { color: colors.foreground }]}>{item.displayName}</Text>
              <Text style={[styles.memberEmail, { color: colors.mutedForeground }]}>{item.email}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.roleText, { color: colors.mutedForeground }]}>
                {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="users" title="No team members" subtitle="Invite teammates to collaborate" />}
        scrollEnabled={!!members.length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: "700" as const },
  list: { paddingTop: 8 },
  memberItem: { flexDirection: "row", gap: 14, padding: 16, borderBottomWidth: 1, alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700" as const },
  memberName: { fontSize: 15, fontWeight: "600" as const },
  memberEmail: { fontSize: 13, marginTop: 2 },
  roleBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  roleText: { fontSize: 12, fontWeight: "500" as const },
});
