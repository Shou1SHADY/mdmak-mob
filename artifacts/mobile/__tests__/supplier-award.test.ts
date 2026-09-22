// What a supplier may be TOLD about an award (website's 22 Sep procurement
// review, applied to this app).
//
// Awarding an offer writes `مقبول` on it inside the buying company. The
// supplier must not read that until Finance has approved the purchase order and
// somebody has sent it, because Finance may still refuse: a supplier who had
// been told "accepted" would be committing stock against money nobody approved.
//
// Every supplier surface in this app now reads `asSupplierSees` rather than the
// stored status. That is one line per screen, which is exactly the kind of thing
// that gets dropped in a later edit — so this pins the whole state table, and
// the two derivations the screens build on top of it.

import { asSupplierSees, awardDisclosed, supplierOfferStatus, supplierSegmentOf, AWARDED, UNDER_REVIEW } from "@/lib/procurement/supplier";
import type { PoLine, PoStoredStatus, PurchaseOrder } from "@/lib/procurement/types";

const line = (over: Partial<PoLine> = {}): PoLine => ({
  id: "l1", name: "Cement", unit: "bag", quantity: 100, unitPrice: 20,
  accepted: 0, rejected: 0, held: 0, cancelled: 0, ...over,
});

const order = (status: PoStoredStatus, over: Partial<PurchaseOrder> = {}): PurchaseOrder => ({
  id: "po1", organizationId: "buyer", docNumber: "PO-2026/014", status, basis: "rfq",
  rfqId: "rfq1", rfqTitle: "Cement", offerId: "off1", projectId: null,
  supplierOrgId: "supplier", supplierUserId: "u1", supplierName: "Al Rajhi", isGuestSupplier: false,
  lines: [line()], totalExVat: 2000, vatRate: 0.15,
  offersCount: 3, lowestOfferTotal: 2000, shortCompetition: false, noOfficialQuote: false,
  preparedById: "buyer-user", preparedByName: "Buyer", createdAt: "2026-09-20T09:00:00.000Z",
  approverKind: "manager", log: [], ...over,
});

const map = (...pos: PurchaseOrder[]) => new Map(pos.map((po) => [po.id, po]));
const award = (over: Record<string, unknown> = {}) => ({ id: "off1", status: AWARDED, poId: "po1", awaitingOrderApproval: true, ...over });

describe("an award the supplier may not read yet", () => {
  it("waits while the order waits for Finance", () => {
    expect(supplierOfferStatus(award(), map(order("awaiting_approval")))).toBe(UNDER_REVIEW);
  });

  it("waits while the order is approved but nobody has sent it", () => {
    // Approval is not the telling — sending is.
    expect(supplierOfferStatus(award(), map(order("approved")))).toBe(UNDER_REVIEW);
  });

  it("waits when the order was returned to the preparer", () => {
    expect(supplierOfferStatus(award(), map(order("awaiting_approval", { returnedReason: "over the limit" })))).toBe(UNDER_REVIEW);
  });

  it("waits when the order was cancelled before it ever reached him", () => {
    expect(supplierOfferStatus(award(), map(order("cancelled")))).toBe(UNDER_REVIEW);
  });

  it("waits when the order cannot be read at all", () => {
    // An empty map is what a screen holds before the orders load, and what an
    // unreadable list leaves behind. Either way the answer is "not yet" — the
    // failure direction has to be silence, not an announcement.
    expect(supplierOfferStatus(award(), map())).toBe(UNDER_REVIEW);
  });

  it("waits on the flag alone, when the award never got its order", () => {
    // The order is written after the award, in a separate call: if that write
    // failed there is no order to ask, and the flag is all that is left.
    expect(supplierOfferStatus(award({ poId: null }), map())).toBe(UNDER_REVIEW);
  });
});

describe("an award the supplier may read", () => {
  it("once the order has been sent", () => {
    expect(supplierOfferStatus(award(), map(order("sent")))).toBe(AWARDED);
  });

  it("once he has accepted it", () => {
    expect(supplierOfferStatus(award(), map(order("accepted")))).toBe(AWARDED);
  });

  it("while it is part received — a derived state, not a stored one", () => {
    const po = order("accepted", { lines: [line({ accepted: 40 })] });
    expect(supplierOfferStatus(award(), map(po))).toBe(AWARDED);
  });

  it("after it closed", () => {
    expect(supplierOfferStatus(award(), map(order("closed")))).toBe(AWARDED);
  });

  it("when it was cancelled AFTER being sent — told once is told", () => {
    expect(supplierOfferStatus(award(), map(order("cancelled", { sentAt: "2026-09-21T08:00:00.000Z" })))).toBe(AWARDED);
  });

  it("when the award predates purchase orders entirely", () => {
    // Neither field: awarded before the order era, and told at the time.
    expect(awardDisclosed({ status: AWARDED }, map())).toBe(true);
    expect(supplierOfferStatus({ status: AWARDED }, map())).toBe(AWARDED);
  });
});

describe("every other status is none of this module's business", () => {
  it.each(["مرفوض", "مطلوب تخفيض", "قيد المراجعة", "تم التسليم"])("%s passes through", (status) => {
    // Even with an undisclosed order hanging off it — only an award is masked.
    expect(supplierOfferStatus({ status, poId: "po1", awaitingOrderApproval: true }, map(order("awaiting_approval")))).toBe(status);
  });
});

describe("asSupplierSees, which is what the screens actually call", () => {
  it("rewrites only the awards that are not the supplier's to read", () => {
    const offers = [
      { id: "a", status: AWARDED, poId: "po1", awaitingOrderApproval: true },
      { id: "b", status: AWARDED, poId: "po2", awaitingOrderApproval: true },
      { id: "c", status: "مرفوض" },
    ];
    const shown = asSupplierSees(offers, map(order("sent"), order("awaiting_approval", { id: "po2" })));
    expect(shown.map((o) => o.status)).toEqual([AWARDED, UNDER_REVIEW, "مرفوض"]);
  });

  it("leaves the stored document alone", () => {
    // The screens hold these objects; a mutation here would write the masked
    // status back through any later update.
    const offers = [{ id: "a", status: AWARDED, poId: "po1", awaitingOrderApproval: true }];
    asSupplierSees(offers, map());
    expect(offers[0].status).toBe(AWARDED);
  });

  it("hands back the same object when nothing changed", () => {
    const offer = { id: "a", status: "مرفوض" };
    expect(asSupplierSees([offer], map())[0]).toBe(offer);
  });
});

describe("the count the dashboard corrects", () => {
  // The dashboard asks the server how many offers carry `مقبول`, which cannot
  // know about disclosure. It moves the undisclosed ones to "pending" by
  // counting the orders that are not the supplier's to see yet — so that count
  // has to mean exactly what the mask means.
  const undisclosed = (pos: PurchaseOrder[]) => pos.filter((po) => supplierSegmentOf(po) == null).length;

  it("counts the orders still inside the buying company", () => {
    expect(undisclosed([
      order("awaiting_approval", { id: "a" }),
      order("approved", { id: "b" }),
      order("cancelled", { id: "c" }),
      order("sent", { id: "d" }),
      order("accepted", { id: "e" }),
      order("closed", { id: "f" }),
      order("cancelled", { id: "g", sentAt: "2026-09-21T08:00:00.000Z" }),
    ])).toBe(3);
  });

  it("agrees with the mask, order by order", () => {
    const every: PoStoredStatus[] = ["awaiting_approval", "approved", "sent", "accepted", "closed", "cancelled"];
    for (const status of every) {
      const po = order(status);
      const masked = supplierOfferStatus(award(), map(po)) === UNDER_REVIEW;
      expect(masked).toBe(supplierSegmentOf(po) == null);
    }
  });
});
