// Shared Firestore document contracts — the fields the WEBSITE reads.
//
// Both apps write into the same collections, so a field the website queries on
// must be present on every document the mobile app creates, or the record
// silently disappears from the website's lists. These builders exist so that
// contract lives in exactly one file instead of being spread across screens.
//
// Website counterparts, for when this needs re-checking:
//   RFQ   -> src/components/contractor/RfqForm.tsx      (rfqData)
//   Offer -> src/components/supplier/SubmitOfferDialog.tsx (offerData)

import { collection, doc, runTransaction, type Firestore } from "firebase/firestore";
import { drawYearlyDocNumber } from "@/lib/sales-numbering";

/** A single RFQ line item, in the shape the website's RFQ views render. */
export interface RfqProduct {
  name: string;
  quantity: number;
  unitOfMeasure: string;
  description: string;
  category: string;
  subCategory: string;
  requiresWarranty: boolean;
}

export interface RfqLineItem {
  id?: string;
  description: string;
  unit: string;
  quantity: number;
  specs?: string;
}

export interface BuildRfqArgs {
  uid: string;
  organizationId: string;
  displayName: string;
  title: string;
  description: string;
  /** Canonical Arabic category name — must be a CATEGORIES_DATA key on the website. */
  category: string;
  city: string;
  district?: string | null;
  deadline?: string | null;
  items: RfqLineItem[];
  isDraft: boolean;
}

/**
 * Builds an RFQ document the website can read.
 *
 * The fields that are easy to get wrong, and why they matter:
 *  - `visibility` — the website's supplier feed queries
 *    `where("visibility", "==", "public")`. An RFQ without it is invisible to
 *    every supplier on the website, no matter its status.
 *  - `allowedSupplierOrgIds` — the private-RFQ counterpart of the above, queried
 *    with `array-contains`. Always present so the field exists to query.
 *  - `products` — the website renders line items from here (verified: the
 *    RfqForm reads only `products`; no production RFQ carries the legacy
 *    `boqItems` key).
 *  - `projectId` — null marks a standalone RFQ. The website's security rules
 *    check ownership of a non-null project, so it must never be a stray id.
 */
export function buildRfqDoc(args: BuildRfqArgs): Record<string, unknown> {
  const now = new Date().toISOString();
  const products: RfqProduct[] = args.items.map((item) => ({
    name: item.description,
    quantity: item.quantity,
    unitOfMeasure: item.unit,
    description: item.specs ?? "",
    category: args.category,
    // The mobile BOQ editor collects free-text lines rather than a subcategory
    // pick, so there is no subcategory to report. Blank is what the website
    // already renders for RFQs whose lines don't share one.
    subCategory: "",
    requiresWarranty: false,
  }));

  return {
    contractorId: args.uid,
    organizationId: args.organizationId,
    createdByUserId: args.uid,
    createdByUserName: args.displayName,
    projectId: null,
    title: args.title,
    description: args.description,
    category: args.category,
    subCategory: "",
    products,
    country: "SA",
    city: args.city,
    district: args.district ?? null,
    deadline: args.deadline ?? null,
    estimatedBudget: null,
    notes: "",
    pdfUrl: "",
    pdfStoragePath: "",
    status: args.isDraft ? "Draft" : "New",
    visibility: "public",
    allowedSupplierOrgIds: [] as string[],
    orderedFromMdmakDirect: false,
    requiresWarranty: false,
    // The buyer's payment terms (RFQ-11). The phone has no terms picker, and an
    // RFQ whose buyer set none stores none — the award then freezes the offer's
    // own terms (RFQ › offer › 100% at 30 days), as the website's untouched form.
    paymentTermsList: null,
    offersCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Reads an RFQ's line items from `products` — the one key both apps write and
 * the website renders. (The legacy `boqItems` fallback was removed after an
 * Admin-SDK sweep found zero documents carrying it.)
 */
export function readRfqLineItems(rfq: Record<string, any> | null | undefined): RfqLineItem[] {
  if (!rfq) return [];
  if (Array.isArray(rfq.products) && rfq.products.length > 0) {
    return (rfq.products as Array<Record<string, any>>).map((prod, i) => ({
      id: String(i),
      description: prod.name ?? "",
      unit: prod.unitOfMeasure ?? "",
      quantity: Number(prod.quantity) || 0,
      specs: prod.description ?? "",
    })) as RfqLineItem[];
  }
  return [];
}

export interface BuildOfferArgs {
  uid: string;
  organizationId: string;
  displayName: string;
  orgName: string;
  rfqId: string;
  rfqTitle: string;
  /** From the RFQ document — both are needed by the website's contractor views. */
  contractorId: string | null;
  contractorOrgId: string | null;
  projectId: string | null;
  price: string;
  quantity?: string;
  notes?: string | null;
  deliveryLocation?: string | null;
  boqPricing?: unknown[] | null;
  executionDuration?: string;
  executionDurationUnit?: string;
}

/**
 * Builds an offer document the website can read.
 *
 * `contractorOrgId` is the critical one: the website's contractor notifications,
 * work queue, receipts, goods-received and guarantees pages all query offers
 * with `where("contractorOrgId", "==", myOrgId)`. An offer missing it reaches
 * the contractor's RFQ detail page (which queries by `rfqId`) but never shows up
 * anywhere else — so the contractor is never alerted that it arrived.
 */
export function buildOfferDoc(args: BuildOfferArgs): Record<string, unknown> {
  const now = new Date().toISOString();
  const doc: Record<string, unknown> = {
    rfqId: args.rfqId,
    rfqTitle: args.rfqTitle,
    supplierId: args.uid,
    organizationId: args.organizationId,
    supplierName: args.displayName,
    companyName: args.orgName,
    submittedByUserId: args.uid,
    submittedByUserName: args.displayName,
    contractorId: args.contractorId,
    contractorOrgId: args.contractorOrgId,
    projectId: args.projectId,
    price: args.price,
    notes: args.notes ?? null,
    deliveryLocation: args.deliveryLocation ?? null,
    deliveryBatches: [
      {
        location: args.deliveryLocation ?? "",
        deliveryDate: "",
        price: args.price,
        // The website's multi-shipment view sums this; an absent quantity
        // renders as NaN there.
        quantity: args.quantity ?? "",
      },
    ],
    boqPricing: args.boqPricing ?? null,
    status: "قيد المراجعة",
    createdAt: now,
    updatedAt: now,
  };
  if (args.executionDuration) {
    doc.executionDuration = args.executionDuration;
    doc.executionDurationUnit = args.executionDurationUnit;
  }
  return doc;
}

/** The RFQ's document type in the yearly `mfgCounters` sequences (website procurement/numbering.ts). */
export const RFQ_DOC_TYPE = "RFQ";

/** The year an RFQ is numbered in: Riyadh's (UTC+3, no daylight saving), as the website's `riyadhYear`. */
export const riyadhYear = (now: Date = new Date()): number =>
  Number(new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 4));

/**
 * A new RFQ with its number (`RFQ-2026/031`) drawn in the same transaction —
 * the website's createRfqWithNumber (procurement/rfq-writes.ts, NAV-08): every
 * RFQ is numbered at creation, a draft included, from the org's yearly
 * `{orgId}__RFQ__{year}` counter, so two buyers never hold the same number and
 * a phone-made RFQ reads like any other on the website.
 */
export async function createRfqWithNumber(
  firestore: Firestore,
  data: Record<string, unknown>,
  now: Date = new Date()
): Promise<{ id: string; rfqNumber: string }> {
  const organizationId = typeof data.organizationId === "string" ? data.organizationId : "";
  if (!organizationId) throw new Error("missing_organization");
  const ref = doc(collection(firestore, "rfqs"));
  const rfqNumber = await runTransaction(firestore, async (tx) => {
    const no = await drawYearlyDocNumber(firestore, tx, organizationId, RFQ_DOC_TYPE, riyadhYear(now));
    tx.set(ref, { ...data, rfqNumber: no });
    return no;
  });
  return { id: ref.id, rfqNumber };
}
