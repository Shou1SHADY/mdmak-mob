import React, { useEffect, useMemo, useState } from "react";
import { View, Text, SectionList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useColors } from "@/hooks/useColors";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { ScreenHeader } from "@/components/ScreenHeader";
import { scrollBottomPadding } from "@/lib/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { db } from "@/lib/firebase";
import { useOrgCollection } from "@/hooks/useOrgCollection";
import { acceptInvitation, declineInvitation, type Invitation } from "@/lib/connection-writes";

interface SupplierLink {
  id: string;
  contractorOrgId?: string;
  supplierOrgId?: string;
  contractorName?: string | null;
  status?: string;
  connectedAt?: unknown;
}

/**
 * Incoming contractor invitations, and who this supplier is already linked to.
 *
 * The website files this under CRM — it is a relationship inbox — and so does
 * the registry here. Accepting on a phone is reasonable: it is a yes/no on a
 * named company, not a form.
 *
 * Invitations are matched on EMAIL, not org: firestore.rules only lets a caller
 * list invitations addressed to their own `request.auth.token.email`, so the
 * query has to filter on exactly that or it is denied outright.
 */
export default function ConnectionsScreen() {
  const colors = useColors();
  const t = useT();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user, organization, loading } = useAuth();
  const { can, isLoading: permsLoading } = usePermissions();

  const { items: links, isLoading: linksLoading } = useOrgCollection<SupplierLink>(
    "contractorSupplierLinks",
    "supplierOrgId"
  );

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invLoading, setInvLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const email = user?.email?.toLowerCase();

  useEffect(() => {
    if (!email) {
      setInvLoading(false);
      return;
    }
    setInvLoading(true);
    const unsub = onSnapshot(
      query(
        collection(db, "invitations"),
        where("email", "==", email),
        where("status", "==", "pending")
      ),
      (snap) => {
        setInvitations(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invitation));
        setInvLoading(false);
      },
      (e) => {
        console.warn("[Connections] invitations:", e.message);
        setInvLoading(false);
      }
    );
    return unsub;
  }, [email]);

  const activeLinks = useMemo(() => links.filter((l) => l.status === "active"), [links]);
  const linkedOrgIds = useMemo(
    () => new Set(activeLinks.map((l) => l.contractorOrgId).filter(Boolean) as string[]),
    [activeLinks]
  );

  if (loading || permsLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.cta} />
      </View>
    );
  }
  if (!user) return <Redirect href="/auth/login" />;
  if (user.role !== "Supplier") return <Redirect href="/" />;

  if (!can("crm.manage")) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: 32 }]}>
        <Feather name="lock" size={32} color={colors.outline} />
        <Text style={[styles.deniedTitle, { color: colors.foreground }]}>
          {t.errors.noPermissionTitle}
        </Text>
        <Text style={[styles.deniedBody, { color: colors.mutedForeground }]}>
          {t.errors.noPermission}
        </Text>
      </View>
    );
  }

  const doAccept = async (inv: Invitation) => {
    if (!user?.organizationId) return;
    setBusyId(inv.id);
    try {
      await acceptInvitation({
        firestore: db,
        invitation: inv,
        supplierOrgId: user.organizationId,
        supplierName: user.orgName || organization?.name || "",
        supplierCategories: organization?.specializations ?? [],
        alreadyLinkedOrgIds: linkedOrgIds,
      });
      Alert.alert(t.common.success, t.connections.accepted);
    } catch (e: any) {
      console.warn("[Connections] accept:", e?.message);
      Alert.alert(t.common.error, t.connections.failed);
    } finally {
      setBusyId(null);
    }
  };

  const doDecline = async (inv: Invitation) => {
    setBusyId(inv.id);
    try {
      await declineInvitation(db, inv.id);
      Alert.alert(t.common.success, t.connections.declined);
    } catch (e: any) {
      console.warn("[Connections] decline:", e?.message);
      Alert.alert(t.common.error, t.connections.failed);
    } finally {
      setBusyId(null);
    }
  };

  const sections = [
    { key: "invitations", title: t.connections.invitations, data: invitations as any[] },
    { key: "connected", title: t.connections.connected, data: activeLinks as any[] },
  ].filter((s) => s.data.length > 0);

  const isLoading = invLoading || linksLoading;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.connections.title} showBack />

      {isLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: scrollBottomPadding(insets.bottom, false),
          }}
          renderSectionHeader={({ section }) => (
            <Text
              style={[
                styles.sectionHeader,
                { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" },
              ]}
            >
              {section.title} · {section.data.length}
            </Text>
          )}
          renderItem={({ item, section }) => {
            if (section.key === "invitations") {
              const inv = item as Invitation;
              return (
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text
                    style={[styles.name, { color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                    numberOfLines={1}
                  >
                    {inv.contractorName || "—"}
                  </Text>
                  <Text
                    style={[styles.meta, { color: colors.mutedForeground, textAlign: isRTL ? "right" : "left" }]}
                  >
                    {t.connections.invitedYou}
                  </Text>
                  <View style={[styles.actionRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <TouchableOpacity
                      onPress={() => doAccept(inv)}
                      disabled={busyId === inv.id}
                      accessibilityRole="button"
                      style={[styles.action, { backgroundColor: colors.success, opacity: busyId === inv.id ? 0.5 : 1, flexDirection: isRTL ? "row-reverse" : "row" }]}
                    >
                      <Feather name="check" size={15} color={colors.successForeground} />
                      <Text style={[styles.actionText, { color: colors.successForeground }]}>
                        {t.connections.accept}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => doDecline(inv)}
                      disabled={busyId === inv.id}
                      accessibilityRole="button"
                      style={[styles.action, { backgroundColor: colors.muted, opacity: busyId === inv.id ? 0.5 : 1, flexDirection: isRTL ? "row-reverse" : "row" }]}
                    >
                      <Feather name="x" size={15} color={colors.foreground} />
                      <Text style={[styles.actionText, { color: colors.foreground }]}>
                        {t.connections.decline}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            const link = item as SupplierLink;
            return (
              <View
                style={[
                  styles.row,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    flexDirection: isRTL ? "row-reverse" : "row",
                  },
                ]}
              >
                <View style={[styles.icon, { backgroundColor: colors.success + "1A" }]}>
                  <Feather name="link" size={16} color={colors.success} />
                </View>
                <Text
                  style={[styles.name, { flex: 1, color: colors.foreground, textAlign: isRTL ? "right" : "left" }]}
                  numberOfLines={1}
                >
                  {link.contractorName || link.contractorOrgId || "—"}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="link"
              title={t.connections.noConnections}
              subtitle={t.connections.noConnectionsHint}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  deniedTitle: { fontSize: 17, lineHeight: 28, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  deniedBody: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 23 },
  sectionHeader: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: 14,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 8 },
  name: { fontSize: 15, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actionRow: { gap: 10, marginTop: 2 },
  action: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: 12,
  },
  actionText: { fontSize: 13, lineHeight: 21, fontFamily: "Inter_600SemiBold" },
  row: {
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    minHeight: 56,
  },
  icon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});
