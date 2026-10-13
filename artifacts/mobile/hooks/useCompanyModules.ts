import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  COMPANY_MODULES,
  applyModuleSwitches,
  offSet,
  portalOfRole,
  type OptionalModule,
} from "@/lib/company-modules";
import { componentsForRole, visibleComponents, type PortalComponentDef } from "@/lib/portal-components";

/**
 * What the signed-in company has switched off — the website's useCompanyModules. A company nobody
 * has switched anything for has everything on, and so does an account whose switch document cannot be
 * read (the rules let every member `get` it; a failure must not hide modules the company paid for).
 */
export function useCompanyModules(): { off: ReadonlySet<OptionalModule>; loading: boolean } {
  const { user } = useAuth();
  const orgId = user?.organizationId ?? null;
  const portal = portalOfRole(user?.role);
  const [data, setData] = useState<{ off?: unknown } | null>(null);
  const [loading, setLoading] = useState(Boolean(orgId && portal));

  useEffect(() => {
    if (!orgId || !portal) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    return onSnapshot(
      doc(db, COMPANY_MODULES, orgId),
      (snap) => {
        setData(snap.exists() ? (snap.data() as { off?: unknown }) : null);
        setLoading(false);
      },
      () => {
        setData(null);
        setLoading(false);
      }
    );
  }, [orgId, portal]);

  const off = useMemo(() => offSet(data, portal), [data, portal]);
  return { off, loading };
}

/**
 * The modules this member sees, in order: the role's registry, minus what the company switched off,
 * minus what the member's permissions leave empty. Every screen that lists modules goes through this.
 */
export function useVisibleModules(): { modules: PortalComponentDef[]; loading: boolean; on: (id: OptionalModule) => boolean } {
  const { user } = useAuth();
  const { can, isLoading: permsLoading } = usePermissions();
  const { off, loading: modulesLoading } = useCompanyModules();
  const portal = portalOfRole(user?.role);
  const modules = useMemo(() => {
    const all = componentsForRole(user?.role);
    return visibleComponents(portal ? applyModuleSwitches(all, off, portal) : all, can);
  }, [user?.role, portal, off, can]);
  const on = useMemo(() => (id: OptionalModule) => !off.has(id), [off]);
  return { modules, loading: permsLoading || modulesLoading, on };
}
