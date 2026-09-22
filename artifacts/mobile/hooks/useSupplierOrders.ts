import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PURCHASE_ORDERS, type PurchaseOrder } from "@/lib/procurement/types";

/**
 * The purchase orders addressed to this supplier organisation, by id.
 *
 * Every supplier screen that shows an award needs this, because whether an
 * award may be SHOWN is decided by its order (`awardDisclosed`): Procurement's
 * award is a decision inside the buying company until Finance has approved the
 * order and it has been sent. A supplier told "accepted" before that would be
 * committing stock against money nobody approved.
 *
 * `ready` is false until the orders have loaded. A screen must not decide on a
 * half-read map, or an award would flash as accepted and then turn back into
 * "under review" — which is exactly the thing this is here to prevent.
 */
export function useSupplierOrders(supplierOrgId: string | null | undefined): {
  ordersById: ReadonlyMap<string, PurchaseOrder>;
  ready: boolean;
} {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supplierOrgId) {
      setOrders([]);
      setReady(false);
      return;
    }
    setReady(false);
    const unsub = onSnapshot(
      query(collection(db, PURCHASE_ORDERS), where("supplierOrgId", "==", supplierOrgId)),
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PurchaseOrder));
        setReady(true);
      },
      (e) => {
        if (__DEV__) console.warn("[useSupplierOrders]", e.message);
        // An unreadable order list leaves every award undisclosed rather than
        // disclosed — the map stays empty and `awardDisclosed` says no.
        setOrders([]);
        setReady(true);
      }
    );
    return unsub;
  }, [supplierOrgId]);

  const ordersById = useMemo(() => new Map(orders.map((po) => [po.id, po])), [orders]);
  return { ordersById, ready };
}
