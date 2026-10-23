// Receiving a delivery — and why the phone no longer writes it.
//
// Until Procurement 2.0 this file confirmed a legacy delivery (one with no
// purchase order) the way the website's RfqOffersView `handleConfirmDelivery`
// used to: mark the delivery confirmed, land the stock in a warehouse, post the
// books, tell the supplier. The website removed that path (Procurement 1.5,
// PUR-06: one way to receive) and, with Procurement 2.0 (G-08, G-09, 22 Oct
// 2026), firestore.rules refuse every client write that creates or confirms a
// delivery: «the receiver's confirmation IS the receipt», and ONE server act
// (src/lib/procurement/receipt-confirm-server.ts `confirmReceipt`) does it all —
// the blind count, the rejects with their reasons, the GR-yyyy/NNN number, the
// order's counters, the stock, the books, the workshop's request and the people
// who must know. It runs behind the receiver's page (a member the delivery was
// forwarded to, or anyone holding the link and its texted code) —
// /api/receipt-links/[token]/sign — and a legacy delivery is priced there from
// its awarded offer (`legacyOfferNet`).
//
// That flow (forward → link → count → code or sign-in → sign) is not ported to
// the phone yet; every delivery, with an order or without, is received on the
// website's receiving desk. This file keeps only the shared shape and where to
// send the user.

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
  /** Set when the award behind this delivery has a purchase order (PRD 3.0). */
  poId?: string | null;
}

/** Why a receipt is taken on the website: the rules refuse a device confirming one. */
export const RECEIVE_ON_WEB = "receive_on_web";

/** The website's goods-received desk, open on this delivery (forward it, or count it). */
export const receivingPath = (deliveryId: string) => `/contractor/goods-received?delivery=${deliveryId}`;
