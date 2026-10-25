// Whether an RFQ reaches this supplier — ADAPTED from the website's src/lib/supplier-free/quote-rules.ts
// `requestReaches` (pinned in scripts/check-mirrors.mjs), over the verbatim mirror lib/materials/reach.ts:
// invited by name, or public in his field AND one of its delivery cities (ED-21 — an RFQ naming no city is
// nationwide, a supplier who gave no city is still reached). A supplier who chose no field at all is reached
// by no public RFQ, as on the website. Pure.

import { publicFieldReaches, supplierCities, supplierSubIds, type SupplierField } from "@/lib/materials/reach";

type Rec = Record<string, unknown>;
const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0) : []);

/** A supplier's field from his (resolved) company profile: tree specialties, older category names, cities. */
export function supplierFieldOf(profile: Rec | null | undefined): SupplierField {
  return { subIds: supplierSubIds(profile), specs: list(profile?.specializations), cities: supplierCities(profile) };
}

/** Invited by name — whatever the visibility. */
export const namesSupplier = (rfq: Rec, orgId: string): boolean =>
  [rfq.allowedSupplierOrgIds, rfq.invitedSupplierOrgIds].some((l) => Array.isArray(l) && (l as unknown[]).includes(orgId));

/** The website's `requestReaches`: named, or public and in his field and cities. */
export function rfqReachesSupplier(rfq: Rec, orgId: string, field: SupplierField): boolean {
  if (orgId && namesSupplier(rfq, orgId)) return true;
  if (rfq.visibility === "private") return false;
  return publicFieldReaches(field, rfq);
}
