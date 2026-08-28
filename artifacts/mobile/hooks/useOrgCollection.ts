import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

/**
 * A live listener over any top-level collection scoped to the signed-in member's
 * organization.
 *
 * Invoices, employees and guarantees are all read the same way on the website —
 * `where("organizationId", "==", orgId)` — and the Finance and HR screens here
 * only read. One hook rather than three near-identical ones; anything needing a
 * different query (guarantees, which match on TWO org fields) keeps its own.
 */
export function useOrgCollection<T>(collectionName: string, field = "organizationId") {
  const { user } = useAuth();
  const orgId = user?.organizationId || "";
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsub = onSnapshot(
      query(collection(db, collectionName), where(field, "==", orgId)),
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
        setIsLoading(false);
      },
      (e) => {
        console.warn(`[useOrgCollection:${collectionName}]`, e.message);
        setIsLoading(false);
      }
    );
    return unsub;
  }, [orgId, collectionName, field]);

  return { items, orgId, isLoading };
}

/**
 * Guarantees, which name the contractor org and the supplier org separately —
 * a document is visible to whichever side you are. Two listeners merged, rather
 * than one `or` query, because the website's rules allow either field to match
 * and an `or` query would need a composite index neither app has.
 */
export function useGuarantees<T extends { id: string }>() {
  const contractorSide = useOrgCollection<T>("guarantees", "contractorOrgId");
  const supplierSide = useOrgCollection<T>("guarantees", "supplierOrgId");

  const byId = new Map<string, T>();
  for (const g of contractorSide.items) byId.set(g.id, g);
  for (const g of supplierSide.items) byId.set(g.id, g);

  return {
    items: Array.from(byId.values()),
    orgId: contractorSide.orgId,
    isLoading: contractorSide.isLoading || supplierSide.isLoading,
  };
}
