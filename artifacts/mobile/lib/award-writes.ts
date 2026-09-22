// Awarding an offer, and why this app does not do it (website's 22 Sep
// procurement review).
//
// Until that review, awarding was one batch — the offer marked `مقبول`, the RFQ
// marked Awarded — and the supplier was told on the spot. It is now the first
// half of a longer act: the award prepares a PURCHASE ORDER that Finance
// approves and somebody sends, and only the sending tells the supplier. The
// order carries a yearly document number drawn inside a transaction, the
// approval limit that decides who may approve it, and the award facts the
// Exceptions report reads.
//
// Half of that is worse than none. An award written here without its order
// would sit `awaitingOrderApproval` for ever: no order for Finance to approve,
// nothing for anyone to send, and a supplier who never hears. So the phone
// hands this one to the website, exactly as it hands over receiving a delivery
// against an order (`RECEIVE_ON_WEB` in delivery-writes.ts).
//
// Rejecting an offer and asking for a lower price are untouched — they were
// never part of the order flow, and the supplier still hears at once.

/** Thrown when an award must be made on the website, because it has to create
 * a purchase order and route it to Finance. */
export const AWARD_ON_WEB = "award_on_web";

/** The website's offers view for an RFQ, where the award is made. */
export const awardPath = (rfqId: string) => `/contractor/rfqs/${rfqId}`;
