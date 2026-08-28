import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { can, type PermissionId, type TeamGroup } from "@/lib/permissions";

/**
 * Resolves what the signed-in user is allowed to do, using the same rules as the
 * website (lib/permissions.ts) and firestore.rules.
 *
 * Owners — which is every solo account, and every account this app registers —
 * can do everything, so the common case costs no reads. Only a team MEMBER,
 * invited from the website, needs their group fetched.
 *
 * This gates the UI only. The security rules enforce the same checks server-side;
 * the point of gating here is that a member sees a disabled action with an
 * explanation instead of tapping it and getting an opaque "permission denied".
 *
 * This hook answers ORG-WIDE questions only. Anything scoped to one project
 * must go through `useProjectPermissions` below instead — firestore.rules calls
 * `hasProjectPermission` there, which lets a project-level assignment override
 * the member's default group in BOTH directions. Asking this hook about a
 * project action would silently use the wrong group.
 */
export function usePermissions() {
  const { user } = useAuth();
  // Requires a user: without one there is no organization to own, and "not a
  // member" must not be mistaken for "is an owner" — that read would skip the
  // group fetch AND report full rights while can() grants almost none.
  const isOwner = !!user && user.organizationRole !== "member";
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [isLoading, setIsLoading] = useState(!!user && !isOwner);

  useEffect(() => {
    let cancelled = false;
    if (!user || isOwner) {
      setGroups([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "teamGroups"), where("organizationId", "==", user.organizationId))
        );
        if (!cancelled) {
          setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TeamGroup));
        }
      } catch (e: any) {
        // A member who cannot read the groups keeps the implicit read-only set,
        // which is what the rules would grant them anyway.
        console.warn("[usePermissions] group load failed:", e?.message);
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.organizationId, user?.organizationRole, isOwner]);

  // Stable identity: callers put this in useMemo/useEffect dependency arrays,
  // and a fresh closure every render would defeat every one of them.
  const check = useCallback(
    (permission: PermissionId) =>
      can(permission, {
        organizationRole: user?.organizationRole,
        defaultGroupId: user?.defaultGroupId ?? null,
        groups,
      }),
    [user?.organizationRole, user?.defaultGroupId, groups]
  );

  // `groups` is returned so useProjectPermissions can reuse this one fetch
  // rather than reading teamGroups again per project.
  return { isLoading, isOwner, groups, can: check };
}

/**
 * The same question, scoped to one project.
 *
 * firestore.rules resolves a project action with `hasProjectPermission`: if the
 * member is seated on `projects/{id}/members`, THAT assignment's group decides,
 * fully replacing their default group; otherwise the default group applies. The
 * override cuts both ways — a member with broad org rights can be seated on a
 * project as a viewer, and a member with none can be seated as its manager — so
 * gating a project screen on the org-wide hook would be wrong in both
 * directions, not merely conservative.
 *
 * Owners skip the read entirely, as they do everywhere else.
 */
export function useProjectPermissions(projectId: string | undefined | null) {
  const { user } = useAuth();
  const org = usePermissions();
  const [projectGroupId, setProjectGroupId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    if (!user || org.isOwner || !projectId) {
      setProjectGroupId(null);
      return;
    }
    (async () => {
      try {
        const seat = await getDoc(doc(db, "projects", projectId, "members", user.uid));
        if (!cancelled) {
          // No seat means "fall back to the default group", which `can()`
          // expresses as a null projectGroupId — not as an absent assignment.
          setProjectGroupId(seat.exists() ? (seat.data()?.groupId ?? null) : null);
        }
      } catch (e: any) {
        console.warn("[useProjectPermissions] seat load failed:", e?.message);
        if (!cancelled) setProjectGroupId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, org.isOwner, projectId]);

  const check = useCallback(
    (permission: PermissionId) =>
      can(permission, {
        organizationRole: user?.organizationRole,
        defaultGroupId: user?.defaultGroupId ?? null,
        groups: org.groups,
        projectGroupId,
      }),
    [user?.organizationRole, user?.defaultGroupId, org.groups, projectGroupId]
  );

  return {
    isOwner: org.isOwner,
    // Undefined means the seat lookup has not settled; gating on a half-resolved
    // answer would flash the wrong affordances.
    isLoading: org.isLoading || (!org.isOwner && projectGroupId === undefined),
    can: check,
  };
}
