import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ClaimLine, ClaimTotals, IpcTerms, MeasurementEntry } from "@/lib/ipc";

/**
 * The five ledgers a project keeps under itself, live.
 *
 * All of them are subcollections of `projects/{id}`, all readable by any member
 * of the owning org, and all small enough per project to hold whole — so one
 * hook subscribes to the set and each screen derives what it needs, rather than
 * every screen opening its own listener on the same documents.
 *
 * Four of the five are append-only ledgers by rule: a measurement, a waste
 * record and an audit entry are never edited, and a claim is immutable once
 * submitted. Only two mutations exist in the whole set — a claim flipping to
 * collected, and a purchase request being decided — and both are single-field
 * transitions the rules pin down exactly.
 */

export interface ProjectMember {
  id: string;
  userId?: string;
  name?: string;
  email?: string;
  groupId?: string | null;
  viaHandover?: boolean;
}

export interface PurchaseRequestLine {
  name: string;
  /** A string on the wire — the web's form writes what was typed. */
  quantity: string;
  unit: string;
}

export interface PurchaseRequest {
  id: string;
  title?: string;
  items?: PurchaseRequestLine[];
  notes?: string | null;
  status: "pending" | "approved" | "rejected";
  requestedByUserId?: string;
  requestedByUserName?: string;
  decidedByUserName?: string | null;
  /** Set when Procurement routed the need to the plant instead. */
  mfgRequestId?: string | null;
  mfgRoutedByName?: string | null;
  createdAt?: unknown;
}

/**
 * A claim as the website stores it.
 *
 * Two shapes live in this collection. A MEASURED claim carries `lines` and a
 * `totals` breakdown built from unclaimed measurements; a manually entered one
 * carries neither and only states its `amount`. Both always carry `amount`, and
 * it is the net — the collectible figure — which is why the money side reads
 * `amount` and never recomputes it from the breakdown.
 */
export interface IpcClaim {
  id: string;
  claimNumber?: number;
  status: "submitted" | "collected";
  description?: string;
  /** The net, and what the ledger posts on collection. */
  amount?: number;
  totals?: ClaimTotals;
  terms?: IpcTerms;
  lines?: ClaimLine[];
  percentOfContract?: number | null;
  periodTo?: string;
  submittedByUserId?: string;
  submittedAt?: unknown;
  collectedAt?: unknown;
}

export interface ProjectWasteRecord {
  id: string;
  itemName?: string;
  quantityTaken?: number;
  quantityUsed?: number;
  unit?: string | null;
  reasonCode?: string | null;
  boqItemId?: string | null;
  recordedByName?: string;
  recordedAt?: unknown;
}

export interface ProjectSite {
  measurements: MeasurementEntry[];
  members: ProjectMember[];
  purchaseRequests: PurchaseRequest[];
  claims: IpcClaim[];
  waste: ProjectWasteRecord[];
  isLoading: boolean;
}

/** One live listener per subcollection, torn down together with the screen. */
function useSub<T>(projectId: string | undefined | null, name: string): { items: T[]; isLoading: boolean } {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setItems([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const unsub = onSnapshot(
      collection(db, "projects", projectId, name),
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T));
        setIsLoading(false);
      },
      (e) => {
        if (__DEV__) console.warn(`[useProjectSite:${name}]`, e.message);
        setIsLoading(false);
      }
    );
    return unsub;
  }, [projectId, name]);

  return { items, isLoading };
}

export function useProjectSite(projectId: string | undefined | null): ProjectSite {
  const measurements = useSub<MeasurementEntry>(projectId, "measurements");
  const members = useSub<ProjectMember>(projectId, "members");
  const purchaseRequests = useSub<PurchaseRequest>(projectId, "purchaseRequests");
  const claims = useSub<IpcClaim>(projectId, "ipcClaims");
  const waste = useSub<ProjectWasteRecord>(projectId, "wasteRecords");

  return {
    measurements: measurements.items,
    members: members.items,
    purchaseRequests: purchaseRequests.items,
    claims: claims.items,
    waste: waste.items,
    isLoading: measurements.isLoading || purchaseRequests.isLoading || claims.isLoading,
  };
}
