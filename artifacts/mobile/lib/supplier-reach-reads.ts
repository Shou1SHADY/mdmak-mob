// The open RFQs that reach a supplier, read the way the rule needs them (lib/supplier-reach.ts): the RFQs naming one of
// his tree sub-categories, the older ones naming one of his category names, and the ones he was invited to — each
// query on ONE field (no composite index), 30 values a slice — then filtered by the one rule (field AND city).

import { collection, getDocs, query, where, type Firestore } from "firebase/firestore";
import { slices, type SupplierField } from "@/lib/materials/reach";
import { rfqReachesSupplier } from "@/lib/supplier-reach";

type Rec = Record<string, unknown>;

export async function fetchReachingRfqs<T extends { id: string }>(
  db: Firestore,
  orgId: string,
  field: SupplierField,
  opts: { status?: string; max?: number } = {}
): Promise<T[]> {
  const status = opts.status ?? "New";
  const reads = [
    ...slices(field.subIds).map((ids) => query(collection(db, "rfqs"), where("subCategoryIds", "array-contains-any", ids))),
    ...slices(field.specs).map((names) => query(collection(db, "rfqs"), where("category", "in", names))),
    ...(orgId ? [query(collection(db, "rfqs"), where("allowedSupplierOrgIds", "array-contains", orgId))] : []),
  ];
  const snaps = await Promise.all(reads.map((q) => getDocs(q).catch(() => null)));
  const byId = new Map<string, T>();
  for (const snap of snaps) snap?.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() } as T));
  const out = [...byId.values()].filter((r) => {
    const rec = r as unknown as Rec;
    return (rec.status ?? "New") === status && rec.directAward !== true && rfqReachesSupplier(rec, orgId, field);
  });
  return opts.max ? out.slice(0, opts.max) : out;
}
