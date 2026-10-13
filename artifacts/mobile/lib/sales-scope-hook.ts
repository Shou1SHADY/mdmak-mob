import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useOrgCollection } from "@/hooks/useOrgCollection";
import { salesScopeFilter, salesSeesAll } from "@/lib/sales-scope";

/**
 * The website's `useSalesScope` (src/hooks/useSalesScope.ts) for the phone's
 * Sales lists: `mine(record)` keeps what this viewer may see. While the CRM
 * contacts are still loading a rep sees nothing — an empty owner map would
 * otherwise read every client as unowned, i.e. everybody's.
 *
 * `finance`: the screen is also Finance's (Payments' notice inbox). Finance
 * answers from an unscoped desk on the website, so a viewer holding
 * `invoices.manage` / `accounting.post` sees every client there.
 */
export function useSalesScope(opts: { finance?: boolean } = {}) {
  const { user } = useAuth();
  const { can, isOwner, isLoading: permsLoading } = usePermissions();
  const { items: contacts, isLoading: contactsLoading } = useOrgCollection<{ id: string; ownerId?: string | null }>("crmContacts");

  const seesAll =
    salesSeesAll({ owner: isOwner, approve: can("sales.approve"), manage: can("sales.manage") }) ||
    (!!opts.finance && (can("invoices.manage") || can("accounting.post")));

  const isLoading = permsLoading || (!seesAll && contactsLoading);
  const mine = useMemo<(record: { contactId?: string | null; createdByUserId?: string | null }) => boolean>(() => {
    if (isLoading) return () => false;
    return salesScopeFilter({ userId: user?.uid ?? "", seesAll }, contacts);
  }, [isLoading, user?.uid, seesAll, contacts]);

  return { mine, seesAll, isLoading };
}
