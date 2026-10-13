// What the contractor's phone home asks for — pure, so the tests read it.
//
// The website's home builds its queue in src/hooks/useWorkQueue.ts; this is the PHONE's slice of it:
// only the decisions a person can take standing on a site, with the same thresholds and the same
// order (closing soon, deliveries, offers to decide, orders to approve, stalled RFQs). Manufacturing
// handoffs, low stock, guarantees and project statuses stay on the website's home — they are desk work.
//
// Every row says where it opens: a screen of this app, or (`web: true`) the website page that owns it.

import { approvalRefusal } from "@/lib/procurement/po";
import type { ProcActor, ProcurementPolicies, PurchaseOrder } from "@/lib/procurement/types";
import { msOf } from "@/lib/supplier-home";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
/** website useWorkQueue NO_OFFERS_GRACE_MS / CLOSING_SOON_MS */
export const NO_OFFERS_GRACE_MS = 3 * DAY_MS;
export const CLOSING_SOON_MS = 48 * HOUR_MS;

/** An offer still waiting for the buyer's decision (website: "قيد المراجعة"). */
const PENDING_OFFER = new Set(["قيد المراجعة", "New"]);

export interface TodayRfq {
  id: string;
  title?: string | null;
  status?: string | null;
  deadline?: string | null;
  createdAt?: unknown;
}

export interface TodayOffer {
  id: string;
  rfqId?: string | null;
  rfqTitle?: string | null;
  status?: string | null;
  createdAt?: unknown;
}

export interface TodayDelivery {
  id: string;
  rfqTitle?: string | null;
  supplierName?: string | null;
  deliveryDate?: unknown;
  createdAt?: unknown;
}

export type ContractorDecision =
  | { kind: "rfq_closing"; id: string; rfqId: string; title: string; hoursLeft: number; overdue: boolean; href: string; web: false }
  | { kind: "delivery_confirm"; id: string; title: string; supplierName: string; href: string; web: false }
  | { kind: "offers_to_review"; id: string; rfqId: string; title: string; count: number; href: string; web: false }
  | { kind: "po_approve"; id: string; poId: string; docNumber: string; supplierName: string; href: string; web: true }
  | { kind: "rfq_no_offers"; id: string; rfqId: string; title: string; daysOpen: number; href: string; web: false };

export interface ContractorTodayInput {
  rfqs: TodayRfq[];
  offers: TodayOffer[];
  deliveries: TodayDelivery[];
  orders: PurchaseOrder[];
  now: number;
  /** offers.view — who decides offers. */
  seesOffers: boolean;
  /** deliveries.confirm — who receives goods. */
  receives: boolean;
  /** The approver as the website's procurement desk reads him; null hides approvals. */
  actor: ProcActor | null;
  policies: ProcurementPolicies;
}

const rfqHref = (id: string) => `/(contractor)/rfqs/${id}`;

/** The decisions waiting on this contractor member, most pressing first. */
export function contractorDecisions(input: ContractorTodayInput): ContractorDecision[] {
  const { now } = input;
  const open = input.rfqs.filter((r) => (r.status ?? "New") === "New");
  const offersByRfq = new Map<string, number>();
  const pendingByRfq = new Map<string, { count: number; title: string; latest: number }>();
  for (const o of input.offers) {
    if (!o.rfqId) continue;
    offersByRfq.set(o.rfqId, (offersByRfq.get(o.rfqId) ?? 0) + 1);
    if (!PENDING_OFFER.has(o.status ?? "")) continue;
    const prev = pendingByRfq.get(o.rfqId) ?? { count: 0, title: o.rfqTitle || "", latest: 0 };
    pendingByRfq.set(o.rfqId, { count: prev.count + 1, title: prev.title || o.rfqTitle || "", latest: Math.max(prev.latest, msOf(o.createdAt)) });
  }
  const titleOf = (rfqId: string, fallback: string) => input.rfqs.find((r) => r.id === rfqId)?.title || fallback;

  const closing: ContractorDecision[] = open
    .map((r) => ({ r, deadline: r.deadline ? Date.parse(r.deadline) : NaN }))
    .filter(({ deadline }) => Number.isFinite(deadline) && deadline - now <= CLOSING_SOON_MS)
    .sort((a, b) => a.deadline - b.deadline)
    .map(({ r, deadline }) => ({
      kind: "rfq_closing" as const,
      id: `rfq_closing:${r.id}`,
      rfqId: r.id,
      title: r.title || "",
      hoursLeft: Math.max(0, Math.round((deadline - now) / HOUR_MS)),
      overdue: deadline < now,
      href: rfqHref(r.id),
      web: false as const,
    }));

  const deliveries: ContractorDecision[] = input.receives
    ? input.deliveries
        .slice()
        .sort((a, b) => msOf(a.deliveryDate ?? a.createdAt) - msOf(b.deliveryDate ?? b.createdAt))
        .map((d) => ({
          kind: "delivery_confirm" as const,
          id: `delivery:${d.id}`,
          title: d.rfqTitle || "",
          supplierName: d.supplierName || "",
          href: "/(goods)",
          web: false as const,
        }))
    : [];

  const review: ContractorDecision[] = input.seesOffers
    ? [...pendingByRfq.entries()]
        .sort((a, b) => b[1].latest - a[1].latest)
        .map(([rfqId, v]) => ({
          kind: "offers_to_review" as const,
          id: `offers:${rfqId}`,
          rfqId,
          title: titleOf(rfqId, v.title),
          count: v.count,
          href: rfqHref(rfqId),
          web: false as const,
        }))
    : [];

  const actor = input.actor;
  const approvals: ContractorDecision[] = actor
    ? input.orders
        .filter((po) => po.status === "awaiting_approval" && !approvalRefusal(po, actor, input.policies))
        .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
        .map((po) => ({
          kind: "po_approve" as const,
          id: `po:${po.id}`,
          poId: po.id,
          docNumber: po.docNumber,
          supplierName: po.supplierName || "",
          href: `/contractor/rfqs/orders?po=${encodeURIComponent(po.id)}`,
          web: true as const,
        }))
    : [];

  const stalled: ContractorDecision[] = input.seesOffers
    ? open
        .filter((r) => !offersByRfq.has(r.id))
        .map((r) => ({ r, created: msOf(r.createdAt) }))
        .filter(({ created }) => created > 0 && now - created >= NO_OFFERS_GRACE_MS)
        .sort((a, b) => a.created - b.created)
        .map(({ r, created }) => ({
          kind: "rfq_no_offers" as const,
          id: `rfq_no_offers:${r.id}`,
          rfqId: r.id,
          title: r.title || "",
          daysOpen: Math.floor((now - created) / DAY_MS),
          href: rfqHref(r.id),
          web: false as const,
        }))
    : [];

  return [...closing, ...deliveries, ...review, ...approvals, ...stalled];
}

export interface ContractorTodayCounts {
  openRfqs: number;
  offersToReview: number;
  deliveriesToConfirm: number;
}

export function contractorTodayCounts(input: Pick<ContractorTodayInput, "rfqs" | "offers" | "deliveries">): ContractorTodayCounts {
  return {
    openRfqs: input.rfqs.filter((r) => (r.status ?? "New") === "New").length,
    offersToReview: input.offers.filter((o) => PENDING_OFFER.has(o.status ?? "")).length,
    deliveriesToConfirm: input.deliveries.length,
  };
}
