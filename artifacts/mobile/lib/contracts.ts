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
 *  - `products` — the website renders line items from here. The mobile BOQ
 *    editor's rows are mirrored into it (and still written as `boqItems` for
 *    screens in this app that already read that key).
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
    // Kept alongside `products` for this app's own screens, which read it.
    boqItems: args.items.length > 0 ? args.items : null,
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
    offersCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Reads an RFQ's line items whichever way they were written.
 *
 * The website stores them as `products`; this app has always stored them as
 * `boqItems`. Screens should call this rather than reading either key directly,
 * so an RFQ published on the website still shows its lines here.
 */
export function readRfqLineItems(rfq: Record<string, any> | null | undefined): RfqLineItem[] {
  if (!rfq) return [];
  if (Array.isArray(rfq.boqItems) && rfq.boqItems.length > 0) {
    return rfq.boqItems as RfqLineItem[];
  }
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
