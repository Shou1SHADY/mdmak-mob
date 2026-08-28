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
  centralLabels: CentralWarehouseLabels;
}

export async function confirmDelivery(input: ConfirmDeliveryInput): Promise<void> {
  const { firestore, delivery, receiverName, uid, centralLabels } = input;

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
  try {
    const orgId = delivery.contractorOrgId;
    const items = (delivery.items ?? [])
      .map((it) => ({
        name: it.name || "",
        unit: it.unitOfMeasure || it.unit || "",
        quantity: Number(it.quantity) || 0,
      }))
      .filter((it) => it.name && it.unit && it.quantity > 0);

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
    console.error("[confirmDelivery] goods receipt into warehouse failed:", receiptErr);
  }

  // 3 — tell the supplier. A guest supplier has no user doc to write to; they
  // see the confirmation on their own offer page instead.
  try {
    if (delivery.supplierId && !delivery.isGuestDelivery && delivery.supplierId !== "guest") {
      await addDoc(collection(firestore, "users", delivery.supplierId, "notifications"), {
        userId: delivery.supplierId,
        organizationId: delivery.supplierOrgId || delivery.supplierId,
        type: "delivery_confirmed",
        title: "✅ تم تأكيد الاستلام",
        message: `أكد المقاول استلام الشحنة لطلب عروض الأسعار: ${delivery.rfqTitle || ""}`,
        offerId: delivery.offerId ?? null,
        rfqId: delivery.rfqId ?? null,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  } catch (notifyErr) {
    console.warn("[confirmDelivery] supplier notification failed:", notifyErr);
  }
}
