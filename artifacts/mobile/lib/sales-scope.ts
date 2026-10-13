// Who sees which client's Sales documents — ported from the website's
// `inSalesScope` (src/lib/sales-quotes.ts) and `useSalesScope`
// (src/hooks/useSalesScope.ts), Sales PRD D10 / RQ-05.
//
// The owner and the sales manager (`sales.approve`) see every client. A rep
// (`sales.manage` without `sales.approve`) sees only his own clients — by the
// client's relationship owner in CRM (`crmContacts.ownerId`); a client nobody
// owns yet is everybody's, and what a rep wrote himself is always his.
//
// One phone-only addition: the Sales module's door also admits Finance
// (`invoices.manage` / `accounting.post`) for the transfer-notice inbox. On the
// website Finance answers those from its own desk, which is not scoped by
// client, so a viewer who holds no `sales.manage` is not a rep and sees all.
// Pure — no Firebase.

export interface SalesViewer {
  userId: string;
  /** The owner and the sales manager see every client. */
  seesAll: boolean;
}

/** The website's `inSalesScope`, verbatim in behaviour. */
export function inSalesScope(
  viewer: SalesViewer,
  record: { contactOwnerId?: string | null; createdByUserId?: string | null }
): boolean {
  if (viewer.seesAll) return true;
  if (record.createdByUserId && record.createdByUserId === viewer.userId) return true;
  return !record.contactOwnerId || record.contactOwnerId === viewer.userId;
}

/** Is this viewer a rep — limited to his own clients? Owner and `sales.approve` see all;
 * a viewer without `sales.manage` is in Sales only as Finance and is not a rep. */
export function salesSeesAll(input: { owner: boolean; approve: boolean; manage: boolean }): boolean {
  return input.owner || input.approve || !input.manage;
}

/** `useSalesScope().mine` without React: a predicate over anything carrying its client's id. */
export function salesScopeFilter(
  viewer: SalesViewer,
  contacts: ReadonlyArray<{ id: string; ownerId?: string | null }>
): (record: { contactId?: string | null; createdByUserId?: string | null }) => boolean {
  if (viewer.seesAll) return () => true;
  const ownerByContact = new Map(contacts.map((c) => [c.id, c.ownerId ?? null]));
  return (record) =>
    inSalesScope(viewer, {
      contactOwnerId: record.contactId ? ownerByContact.get(record.contactId) ?? null : null,
      createdByUserId: record.createdByUserId ?? null,
    });
}
