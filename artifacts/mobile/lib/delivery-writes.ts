import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import { receiveDelivery } from "@/lib/warehouse-transfer";
import { onGoodsReceived } from "@/lib/accounting/hooks";
import { markPurchaseArrived } from "@/lib/manufacturing-writes";

// Confirming a delivery, mirroring the website's handleConfirmDelivery in
// src/components/contractor/RfqOffersView.tsx.
//
// Confirmation is three things, in this order and with these failure semantics:
//
//   1. Mark the delivery confirmed. This is the write that matters; if it
//      throws, nothing else runs and the caller reports failure.
//   2. Receive the stock into a warehouse. Deliberately isolated in its own
//      try/catch — step 1 has already committed and must NOT be rolled back
//      because a warehouse write failed. The website makes the same call for
//      the same reason.
//   3. Notify the supplier. Best-effort for the same reason.
//
// Getting that ordering wrong would either lose a confirmation the contractor
// already gave, or credit stock for a delivery that was never confirmed.

export interface DeliveryItem {
  name?: string;
  quantity?: number;
  unitOfMeasure?: string;
  unit?: string;
}

export interface DeliveryDoc {
  id: string;
  contractorOrgId?: string;
  supplierId?: string | null;
  supplierOrgId?: string | null;
  supplierName?: string | null;
  offerId?: string | null;
  rfqId?: string | null;
  rfqTitle?: string | null;
  projectId?: string | null;
  items?: DeliveryItem[];
  status?: string;
  isGuestDelivery?: boolean;
  deliveryDate?: string | null;
  createdAt?: unknown;
  confirmedAt?: unknown;
}

/** Names of the central warehouse this app creates when none exists yet. Kept
 * as parameters rather than hardcoded Arabic so the caller passes localized
 * strings, matching the website, which reads them from its message catalog. */
export interface CentralWarehouseLabels {
  name: string;
  location: string;
  description: string;
}

export interface ConfirmDeliveryInput {
  firestore: Firestore;
  delivery: DeliveryDoc;
  receiverName: string;
  uid: string;
  /** Who confirms — the name on the journal entry and the purchase request. */
  userName?: string;
  centralLabels: CentralWarehouseLabels;
}

/** Mirrors the website's delivery confirmation (RfqOffersView, 19 Sep 2026):
 * the receipt is priced from the awarded offer — quoted EXCLUDING VAT — and
 * posted to the books; stock carries the unit cost when it is exact; an RFQ
 * that answered a Manufacturing purchase request closes it. Returns whether the
 * stock actually landed, so the screen can say so when it did not. */
export async function confirmDelivery(input: ConfirmDeliveryInput): Promise<{ stockLanded: boolean }> {
  const { firestore, delivery, receiverName, uid, centralLabels } = input;
  const userName = input.userName || "";
  let stockLanded = true;

  // 1 — the confirmation itself.
  await updateDoc(doc(firestore, "deliveries", delivery.id), {
    status: "confirmed",
    receivedByName: receiverName.trim(),
    confirmedAt: serverTimestamp(),
    confirmedByUserId: uid,
  });

  // 2 — goods receipt. Confirming is the moment stock actually enters a
  // warehouse: the project's warehouse when the delivery names one project,
  // otherwise the org's central warehouse, created here with the SAME
  // deterministic id the website uses (`central_{orgId}`) so both apps land on
  // one warehouse rather than two.
  const orgId = delivery.contractorOrgId;
  let net = 0;
  try {
    if (delivery.offerId) {
      const offerSnap = await getDoc(doc(firestore, "offers", delivery.offerId));
      const o = offerSnap.data() as { price?: string | number; totalBatchesPrice?: number } | undefined;
      net = Math.max(0, Number(o?.totalBatchesPrice ?? o?.price) || 0);
    }
  } catch {
    net = 0;
  }
  try {
    const rawItems = (delivery.items ?? [])
      .map((it) => ({
        name: it.name || "",
        unit: it.unitOfMeasure || it.unit || "",
        quantity: Number(it.quantity) || 0,
      }))
      .filter((it) => it.name && it.unit && it.quantity > 0);
    // A unit cost only when it is exact: one line, one price.
    const items = rawItems.map((it) => ({ ...it, unitCost: rawItems.length === 1 && net > 0 ? Math.round((net / it.quantity) * 100) / 100 : null }));

    if (orgId && items.length > 0) {
      let targetWarehouseId: string | null = null;
      if (delivery.projectId) {
        const projectSnap = await getDoc(doc(firestore, "projects", delivery.projectId));
        targetWarehouseId =
          (projectSnap.data() as { warehouseId?: string } | undefined)?.warehouseId || null;
      }
      if (!targetWarehouseId) {
        const centralRef = doc(firestore, "warehouses", `central_${orgId}`);
        const centralSnap = await getDoc(centralRef);
        if (!centralSnap.exists()) {
          await setDoc(centralRef, {
            name: centralLabels.name,
            location: centralLabels.location,
            description: centralLabels.description,
            organizationId: orgId,
            isCentral: true,
            projectId: null,
            projectName: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        targetWarehouseId = `central_${orgId}`;
      }
      await receiveDelivery({ firestore, warehouseId: targetWarehouseId, items, organizationId: orgId });
    }
  } catch (receiptErr) {
    stockLanded = false;
    if (__DEV__) console.error("[confirmDelivery] goods receipt into warehouse failed:", receiptErr);
  }

  // 2b — the books, and Manufacturing's purchase request, once stock is in.
  if (orgId && stockLanded) {
    onGoodsReceived(
      firestore,
      { organizationId: orgId, userId: uid, userName },
      {
        deliveryId: delivery.id,
        net,
        supplierId: delivery.supplierOrgId && delivery.supplierOrgId !== "guest" ? delivery.supplierOrgId : null,
        supplierName: delivery.supplierName || null,
        rfqTitle: delivery.rfqTitle || null,
        projectId: delivery.projectId || null,
      }
    );
    try {
      if (delivery.rfqId) {
        const rfqSnap = await getDoc(doc(firestore, "rfqs", delivery.rfqId));
        const src = (rfqSnap.data() as { purchaseSource?: { kind?: string; workOrderId?: string; purchaseRequestId?: string } } | undefined)?.purchaseSource;
        if (src?.kind === "mfg_purchase" && src.workOrderId && src.purchaseRequestId) {
          await markPurchaseArrived(firestore, { orderId: src.workOrderId, purchaseRequestId: src.purchaseRequestId, actor: { id: uid, name: userName } });
        }
      }
    } catch (linkErr) {
      if (__DEV__) console.warn("[confirmDelivery] purchase request not closed:", linkErr);
    }
  }

  // 3 — tell the supplier. A guest supplier has no user doc to write to; they
  // see the confirmation on their own offer page instead.
  try {
    if (delivery.supplierId && !delivery.isGuestDelivery && delivery.supplierId !== "guest") {
      await addDoc(collection(firestore, "users", delivery.supplierId, "notifications"), {
        userId: delivery.supplierId,
        organizationId: delivery.supplierOrgId || delivery.supplierId,
        type: "delivery_confirmed",
        i18n: { title: "pn_delivery_confirmed_title", message: "pn_delivery_confirmed", params: { rfq: delivery.rfqTitle || "" } },
        title: "✅ تم تأكيد الاستلام",
        message: `أكد المقاول استلام الشحنة لطلب عروض الأسعار: ${delivery.rfqTitle || ""}`,
        offerId: delivery.offerId ?? null,
        rfqId: delivery.rfqId ?? null,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  } catch (notifyErr) {
    if (__DEV__) console.warn("[confirmDelivery] supplier notification failed:", notifyErr);
  }
  return { stockLanded };
}
