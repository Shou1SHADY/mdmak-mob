import {
  addDoc,
  collection,
  doc,
  increment,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { logFinanceAudit } from "@/lib/finance-audit";
import { onIpcClaimCollected } from "@/lib/accounting/hooks";

/**
 * The three acts a phone performs on a project, written exactly as the website
 * writes them.
 *
 * Each one is pinned by a rule that lists the fields it may touch, so these are
 * not free-form updates: a measurement must name its author and arrive
 * unclaimed, a purchase request may only move from pending to a terminal
 * answer, and a claim may only flip to collected. Writing a field outside the
 * allowlist does not warn — it is refused.
 */

export interface Actor {
  uid: string;
  name: string;
  organizationId: string;
}

export interface MeasurableLine {
  id: string;
  itemNo?: string | null;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  unit?: string | null;
}

/**
 * Record what was built, against the line that priced it.
 *
 * Two writes in one batch: the measurement joins an append-only ledger, and the
 * BOQ line's running total moves by the same amount. The total is an
 * `increment`, not a recomputed sum, so two people measuring different lines on
 * the same afternoon cannot overwrite each other.
 *
 * A negative quantity is how a correction is made — the ledger is never edited,
 * so an over-measurement is answered with an entry that takes it back. Zero is
 * refused because it records nothing while still claiming to be a measurement.
 *
 * The line being locked into a tender does NOT stop this: being drawn into a
 * tender is a commercial fact, and work on site continues regardless. The rules
 * whitelist `executedQuantity` on locked rows for exactly this reason.
 */
export async function recordMeasurement(
  firestore: Firestore,
  projectId: string,
  line: MeasurableLine,
  input: { quantity: number; measuredAt: string; note?: string | null },
  actor: Actor
): Promise<string> {
  const quantity = Number(input.quantity);
  if (!quantity || Number.isNaN(quantity)) throw new Error("bad_quantity");

  const batch = writeBatch(firestore);
  const ref = doc(collection(firestore, "projects", projectId, "measurements"));
  batch.set(ref, {
    boqItemId: line.id,
    itemNo: line.itemNo || "",
    description: line.descriptionAr || line.descriptionEn || "",
    unit: line.unit || "",
    quantity,
    measuredAt: input.measuredAt,
    note: input.note?.trim() || null,
    // Null, and the rules insist on it: a measurement is born unclaimed, and
    // only the claim that consumes it may ever stamp this field.
    claimId: null,
    recordedByUserId: actor.uid,
    recordedByName: actor.name,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(firestore, "projects", projectId, "boqItems", line.id), {
    executedQuantity: increment(quantity),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return ref.id;
}

/**
 * Answer a purchase request: approved or rejected, once.
 *
 * The rules allow exactly these five fields and only from `pending`, so there
 * is no edit flow and no way back — an answer given is an answer kept. Approval
 * deliberately has no side effect: it authorises the spend, it does not move
 * stock or raise a tender.
 */
export async function decidePurchaseRequest(
  firestore: Firestore,
  projectId: string,
  requestId: string,
  decision: "approved" | "rejected",
  actor: Actor
): Promise<void> {
  await updateDoc(doc(firestore, "projects", projectId, "purchaseRequests", requestId), {
    status: decision,
    decidedByUserId: actor.uid,
    decidedByUserName: actor.name,
    decidedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * The money arrived.
 *
 * Three things follow, in descending order of how much they matter. The claim
 * flips to collected — that is the write the rules gate, and the only one that
 * can fail loudly. The finance audit log gains an entry, because who marked a
 * claim collected and when is a question that gets asked later. And the
 * collection posts to the ledger: bank debited, the client's receivable
 * cleared.
 *
 * The ledger post is deliberately not awaited and cannot fail this call — it
 * no-ops entirely when the org has not switched Accounting on. Marking the
 * money in must not depend on the books being kept.
 */
export async function markClaimCollected(
  firestore: Firestore,
  projectId: string,
  claim: { id: string; claimNumber?: number; amount?: number },
  projectName: string | null,
  actor: Actor
): Promise<void> {
  await updateDoc(doc(firestore, "projects", projectId, "ipcClaims", claim.id), {
    status: "collected",
    collectedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const amount = claim.amount || 0;
  void logFinanceAudit(firestore, projectId, {
    action: "ipc_collected",
    actorId: actor.uid,
    actorName: actor.name,
    targetType: "ipcClaim",
    targetId: claim.id,
    amount,
  });

  onIpcClaimCollected(
    firestore,
    { organizationId: actor.organizationId, userId: actor.uid, userName: actor.name },
    {
      claimId: claim.id,
      claimNumber: claim.claimNumber ?? 0,
      projectId,
      projectName,
      amount,
    }
  );
}

/** A purchase request raised from the site — anyone on the project may. */
export async function raisePurchaseRequest(
  firestore: Firestore,
  projectId: string,
  input: { title: string; items: Array<{ name: string; quantity: string; unit: string }>; notes?: string | null },
  actor: Actor
): Promise<string> {
  const items = input.items.filter((i) => i.name.trim() && Number(i.quantity) > 0);
  if (items.length === 0) throw new Error("no_items");
  const ref = await addDoc(collection(firestore, "projects", projectId, "purchaseRequests"), {
    title: input.title.trim(),
    items,
    notes: input.notes?.trim() || null,
    status: "pending",
    requestedByUserId: actor.uid,
    requestedByUserName: actor.name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
