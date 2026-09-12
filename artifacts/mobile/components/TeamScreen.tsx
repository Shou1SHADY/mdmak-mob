import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { tabScreenBottomPadding } from "@/lib/layout";
import { type, space, radius, toneColors, MIN_TOUCH } from "@/lib/design";
import { useT, useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { auth, db } from "@/lib/firebase";
import { sendTeamInvitation } from "@/lib/site-api";
import type { TeamGroup } from "@/lib/permissions";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/SkeletonLoader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CrmSheet } from "@/components/crm/CrmSheet";
import { CrmChoice } from "@/components/crm/CrmChoice";

/**
 * The team, and — for the owner — the three things worth doing to it from a
 * phone: invite someone, change what a member may do, remove a member.
 *
 * Each write is exactly what firestore.rules lets an owner do from a client
 * (assign `defaultGroupId`; revert a member to their own solo org) and what
 * the website's team page does. Inviting creates nothing client-side: the
 * website's /api/invitations/send emails the link, and the account appears
 * here once they accept. Groups themselves (their permission sets) are edited
 * on the website.
 */

interface TeamMember {
  uid: string;
  name?: string;
  displayName?: string;
  email: string;
  organizationRole?: "owner" | "member";
  defaultGroupId?: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  name?: string | null;
  groupId?: string | null;
}

export function TeamScreen({ role }: { role: "Contractor" | "Supplier" }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const t = useT();
  const { isRTL } = useLanguage();
  const { showToast } = useToast();
  const row = isRTL ? "row-reverse" : "row";
  const align = isRTL ? "right" : "left";

  const isOwner = user?.organizationRole === "owner";
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteGroup, setInviteGroup] = useState<string>("none");
  const [assignTarget, setAssignTarget] = useState<TeamMember | null>(null);
  const [assignGroup, setAssignGroup] = useState<string>("none");

  const load = useCallback(async () => {
    if (!user?.organizationId) return;
    setError(false);
    try {
      const [memberSnap, groupSnap, inviteSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("organizationId", "==", user.organizationId))),
        getDocs(query(collection(db, "teamGroups"), where("organizationId", "==", user.organizationId))),
        isOwner
          ? getDocs(query(collection(db, "invitations"), where("invitedBy", "==", user.uid), where("status", "==", "pending")))
          : Promise.resolve(null),
      ]);
      setMembers(memberSnap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<TeamMember, "uid">) })));
      setGroups(groupSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as TeamGroup));
      setInvites(
        (inviteSnap?.docs ?? [])
          .map((d) => ({ id: d.id, ...(d.data() as Omit<PendingInvite, "id"> & { type?: string }) }))
          .filter((i) => (i as { type?: string }).type === "team_invite")
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId, user?.uid, isOwner]);

  useEffect(() => { load(); }, [load]);

  const groupName = (id: string | null | undefined) => groups.find((g) => g.id === id)?.name ?? t.team.noGroup;
  const groupOptions = useMemo(
    () => [{ value: "none", label: t.team.noGroup }, ...groups.map((g) => ({ value: g.id, label: g.name }))],
    [groups, t]
  );

  const sorted = useMemo(
    () => [...members].sort((a, b) => (a.organizationRole === "owner" ? -1 : b.organizationRole === "owner" ? 1 : 0)),
    [members]
  );

  const doInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!/\S+@\S+\.\S+/.test(email)) { Alert.alert(t.common.error, t.auth.validation.emailInvalid); return; }
    if (email === user?.email?.toLowerCase()) { Alert.alert(t.common.error, t.team.selfInvite); return; }
    setBusy(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("no session");
      const result = await sendTeamInvitation({
        idToken,
        email,
        name: inviteName.trim() || undefined,
        groupId: inviteGroup === "none" ? undefined : inviteGroup,
      });
      if (!result.ok) throw new Error(result.code);
      showToast(t.team.invited, "success");
      setInviteOpen(false);
      setInviteEmail(""); setInviteName(""); setInviteGroup("none");
      load();
    } catch {
      Alert.alert(t.common.error, t.team.inviteFailed);
    } finally {
      setBusy(false);
    }
  };

  const cancelInvite = (inv: PendingInvite) => {
    Alert.alert(t.team.cancelInvite, inv.email, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.confirm,
        style: "destructive",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "invitations", inv.id), { status: "cancelled" });
            showToast(t.team.cancelled, "success");
            load();
          } catch {
            Alert.alert(t.common.error, t.team.saveFailed);
          }
        },
      },
    ]);
  };

  const doAssign = async () => {
    if (!assignTarget) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, "users", assignTarget.uid), {
        defaultGroupId: assignGroup === "none" ? null : assignGroup,
        updatedAt: serverTimestamp(),
      });
      showToast(t.team.assigned, "success");
      setAssignTarget(null);
      load();
    } catch {
      Alert.alert(t.common.error, t.team.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const removeMember = (m: TeamMember) => {
    Alert.alert(t.team.remove, t.team.removeConfirm.replace("{name}", m.name || m.displayName || m.email), [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.team.remove,
        style: "destructive",
        onPress: async () => {
          try {
            // The rules' second owner branch: back to a solo company of their own.
            await updateDoc(doc(db, "users", m.uid), {
              organizationId: m.uid,
              organizationRole: "owner",
              defaultGroupId: null,
              updatedAt: serverTimestamp(),
            });
            showToast(t.team.removed, "success");
            load();
          } catch {
            Alert.alert(t.common.error, t.team.saveFailed);
          }
        },
      },
    ]);
  };

  const inviteButton = isOwner ? (
    <TouchableOpacity
      onPress={() => setInviteOpen(true)}
      style={[styles.headerBtn, { backgroundColor: colors.ctaSoft }]}
      accessibilityRole="button"
      accessibilityLabel={t.team.invite}
    >
      <Feather name="user-plus" size={18} color={colors.cta} />
    </TouchableOpacity>
  ) : undefined;

  const renderMember = ({ item }: { item: TeamMember }) => {
    const name = item.name || item.displayName || item.email;
    const isMe = item.uid === user?.uid;
    const owner = item.organizationRole === "owner";
    const tc = toneColors(colors, owner ? "primary" : "cta");
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.memberRow, { flexDirection: row }]}>
          <View style={[styles.avatar, { backgroundColor: tc.bg }]}>
            <Text style={[type.title, { color: tc.fg }]}>{name.trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.bodyStrong, { color: colors.foreground, textAlign: align }]} numberOfLines={1}>
              {name}{isMe ? ` · ${t.team.you}` : ""}
            </Text>
            <Text style={[type.caption, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={1}>
              {item.email}
            </Text>
          </View>
          <StatusBadge label={owner ? t.team.owner : groupName(item.defaultGroupId)} tone={owner ? "primary" : "neutral"} size="sm" />
        </View>
        {isOwner && !owner && !isMe && (
          <View style={[styles.actions, { flexDirection: row, borderTopColor: colors.border }]}>
            <Button
              title={t.team.assignGroup}
              size="sm"
              variant="secondary"
              onPress={() => { setAssignTarget(item); setAssignGroup(item.defaultGroupId ?? "none"); }}
            />
            <Button title={t.team.remove} size="sm" variant="ghost" onPress={() => removeMember(item)} textStyle={{ color: colors.destructive }} />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t.team.title} subtitle={isOwner ? undefined : t.team.ownerOnly} showBack right={inviteButton} />
      {error ? (
        <EmptyState variant="error" icon="users" title={t.errors.somethingWentWrong} actionLabel={t.common.retry} onAction={() => { setLoading(true); load(); }} />
      ) : loading ? (
        <View style={{ padding: space.lg }}>{[1, 2, 3].map((k) => <CardSkeleton key={k} />)}</View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.uid}
          renderItem={renderMember}
          contentContainerStyle={{ padding: space.lg, paddingBottom: tabScreenBottomPadding(insets.bottom) }}
          ListEmptyComponent={<EmptyState icon="users" title={t.team.noMembers} subtitle={t.team.noMembersDesc} />}
          ListFooterComponent={
            invites.length > 0 ? (
              <View style={{ marginTop: space.lg, gap: space.sm }}>
                <Text style={[type.captionStrong, { color: colors.mutedForeground, textAlign: align }]}>{t.team.pending}</Text>
                {invites.map((inv) => (
                  <View key={inv.id} style={[styles.card, styles.inviteRow, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: row }]}>
                    <Feather name="mail" size={16} color={colors.mutedForeground} />
                    <View style={{ flex: 1 }}>
                      <Text style={[type.body, { color: colors.foreground, textAlign: align }]} numberOfLines={1}>{inv.name || inv.email}</Text>
                      {inv.name ? <Text style={[type.caption, { color: colors.mutedForeground, textAlign: align }]} numberOfLines={1}>{inv.email}</Text> : null}
                    </View>
                    <TouchableOpacity onPress={() => cancelInvite(inv)} accessibilityRole="button" accessibilityLabel={t.team.cancelInvite} style={styles.iconBtn}>
                      <Feather name="x" size={18} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null
          }
        />
      )}

      <CrmSheet visible={inviteOpen} title={t.team.inviteTitle} onClose={() => setInviteOpen(false)} onSubmit={doInvite} submitLabel={t.team.invite} submitting={busy}>
        <Text style={[type.caption, { color: colors.mutedForeground, textAlign: align, marginBottom: space.md }]}>{t.team.inviteHint}</Text>
        <Input label={t.team.inviteEmail} value={inviteEmail} onChangeText={setInviteEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" leftIcon="mail" required isRTL={isRTL} containerStyle={{ marginBottom: space.md }} />
        <Input label={t.team.inviteName} value={inviteName} onChangeText={setInviteName} leftIcon="user" isRTL={isRTL} containerStyle={{ marginBottom: space.md }} />
        <CrmChoice label={t.team.group} options={groupOptions} value={inviteGroup} onChange={setInviteGroup} scroll />
      </CrmSheet>

      <CrmSheet visible={!!assignTarget} title={t.team.assignGroupTitle} onClose={() => setAssignTarget(null)} onSubmit={doAssign} submitLabel={t.common.save} submitting={busy}>
        <Text style={[type.body, { color: colors.foreground, textAlign: align }]}>{assignTarget?.name || assignTarget?.displayName || assignTarget?.email}</Text>
        <Text style={[type.caption, { color: colors.mutedForeground, textAlign: align, marginBottom: space.md }]}>{t.team.assignHint}</Text>
        <CrmChoice label={t.team.group} options={groupOptions} value={assignGroup} onChange={setAssignGroup} />
      </CrmSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBtn: { width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: radius.card, borderWidth: 1, padding: space.lg, marginBottom: space.sm },
  memberRow: { alignItems: "center", gap: space.md },
  avatar: { width: 44, height: 44, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  actions: { gap: space.sm, marginTop: space.md, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  inviteRow: { alignItems: "center", gap: space.md, paddingVertical: space.md },
  iconBtn: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: "center", justifyContent: "center", marginHorizontal: -8 },
});
