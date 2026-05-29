import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Platform,
} from "react-native";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { StatsCard } from "@/components/StatsCard";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function AdminDashboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [stats, setStats] = useState({ users: 0, contractors: 0, suppliers: 0, rfqs: 0, offers: 0, pending: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const [usersSnap, rfqsSnap, offersSnap, pendingSnap, contractorSnap, supplierSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "rfqs")),
        getDocs(collection(db, "offers")),
        getDocs(query(collection(db, "organizations"), where("verified", "==", false), where("type", "==", "supplier"))),
        getDocs(query(collection(db, "organizations"), where("type", "==", "contractor"))),
        getDocs(query(collection(db, "organizations"), where("type", "==", "supplier"))),
      ]);
      setStats({
        users: usersSnap.size,
        contractors: contractorSnap.size,
        suppliers: supplierSnap.size,
        rfqs: rfqsSnap.size,
        offers: offersSnap.size,
        pending: pendingSnap.size,
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 80) }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <View style={[styles.adminBadge, { backgroundColor: "#7c3aed20" }]}>
          <Text style={[styles.adminText, { color: "#7c3aed" }]}>Admin Portal</Text>
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>Platform Overview</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Mdmak Tech — مدماك تيك</Text>
      </View>

      <SectionHeader title="Users" />
      <View style={styles.statsGrid}>
        <StatsCard title="Total Users" value={stats.users} icon="users" color={colors.primary} />
        <StatsCard title="Contractors" value={stats.contractors} icon="briefcase" color={colors.accent} />
        <StatsCard title="Suppliers" value={stats.suppliers} icon="truck" color="#8b5cf6" />
        <StatsCard title="Pending Verification" value={stats.pending} icon="clock" color={colors.warning} />
      </View>

      <SectionHeader title="Marketplace" />
      <View style={styles.statsGrid}>
        <StatsCard title="Total RFQs" value={stats.rfqs} icon="file-text" color={colors.primary} />
        <StatsCard title="Total Offers" value={stats.offers} icon="tag" color={colors.success} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 20 },
  header: { gap: 4 },
  adminBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginBottom: 4 },
  adminText: { fontSize: 12, fontWeight: "700" as const, textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: "800" as const },
  subtitle: { fontSize: 14 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
});
