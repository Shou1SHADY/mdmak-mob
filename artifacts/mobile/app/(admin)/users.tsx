import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Platform, RefreshControl,
} from "react-native";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { db } from "@/lib/firebase";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface OrgItem {
  id: string;
  name: string;
  type: "contractor" | "supplier";
  city?: string;
  verified?: boolean;
  crNumber?: string;
}

export default function AdminUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [tab, setTab] = useState<"supplier" | "contractor">("supplier");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrgs = async () => {
    try {
      const snap = await getDocs(collection(db, "organizations"));
      setOrgs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrgItem)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchOrgs(); }, []);

  const handleVerify = (org: OrgItem) => {
    Alert.alert(
      org.verified ? "Revoke Verification" : "Verify Supplier",
      `${org.verified ? "Revoke verification for" : "Approve and verify"} ${org.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            await updateDoc(doc(db, "organizations", org.id), { verified: !org.verified });
            setOrgs((prev) => prev.map((o) => o.id === org.id ? { ...o, verified: !o.verified } : o));
          },
        },
      ]
    );
  };

  const filtered = orgs.filter((o) => o.type === tab);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.topBar, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>User Management</Text>
        <View style={[styles.tabRow, { backgroundColor: colors.muted, borderRadius: 12 }]}>
          {(["supplier", "contractor"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, { backgroundColor: tab === t ? colors.primary : "transparent", borderRadius: 10 }]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, { color: tab === t ? "#fff" : colors.mutedForeground }]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}s
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 16 }}>{[1, 2, 3].map((k) => <CardSkeleton key={k} />)}</View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrgs(); }} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <View style={[styles.orgCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.orgTop}>
                <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.orgName, { color: colors.foreground }]}>{item.name}</Text>
                  {item.city && <Text style={[styles.orgCity, { color: colors.mutedForeground }]}>{item.city}</Text>}
                </View>
                {item.verified !== undefined && (
                  <StatusBadge label={item.verified ? "Verified" : "Unverified"} color={item.verified ? colors.success : colors.warning} size="sm" />
                )}
              </View>
              {tab === "supplier" && (
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: item.verified ? colors.destructive : colors.primary, backgroundColor: item.verified ? colors.destructive + "10" : colors.primary + "10" }]}
                  onPress={() => handleVerify(item)}
                >
                  <Feather name={item.verified ? "x-circle" : "check-circle"} size={15} color={item.verified ? colors.destructive : colors.primary} />
                  <Text style={[styles.actionText, { color: item.verified ? colors.destructive : colors.primary }]}>
                    {item.verified ? "Revoke" : "Verify"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={<EmptyState icon="users" title={`No ${tab}s found`} subtitle="Organizations will appear here" />}
          scrollEnabled={!!filtered.length}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  title: { fontSize: 24, fontWeight: "700" as const },
  tabRow: { flexDirection: "row", padding: 4, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: "center" },
  tabText: { fontSize: 14, fontWeight: "600" as const },
  list: { padding: 16, gap: 12 },
  orgCard: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 12, marginBottom: 12 },
  orgTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700" as const },
  orgName: { fontSize: 16, fontWeight: "600" as const },
  orgCity: { fontSize: 13, marginTop: 2 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start" },
  actionText: { fontSize: 13, fontWeight: "600" as const },
});
