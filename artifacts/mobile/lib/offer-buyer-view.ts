// What the buyer's screens show about each offer beyond its own status — the decisions Procurement 2.0 keeps
// APART from the offer (website G-15): the shortlist ★ and the exclusion with its reason, in the private
// `offerDecisions/{offerId}` record, and the two requests the supplier must see, riding on the offer as
// `bafo` (a better price) and `reval` (confirm the price).
//
// Everything is read through the mirrored lib/procurement/offer-decisions.ts, so an offer excluded or cut the
// old way (`status` «مرفوض» / «مطلوب تخفيض») reads the same until the website's migration moves it.
//
// The phone only READS these: firestore.rules let the buying company read its own records
// (`offerDecisions`: `allow read: if ownsDoc()`, so a query must name `organizationId`) and write none —
// every decision is taken on the website through /api/procurement/offers/decide. Pure: no I/O.

import {
  bafoOf,
  bafoReplyBy,
  exclusionOf,
  isShortlisted,
  revalOpen,
  type BafoView,
  type DecidableOffer,
  type DecisionExclusion,
  type DecisionMap,
  type OfferDecision,
} from "@/lib/procurement/offer-decisions";

export { OFFER_DECISIONS } from "@/lib/procurement/offer-decisions";

export interface OfferMarks {
  /** The exclusion that stands — the record's, else a legacy «مرفوض» offer's. */
  exclusion: DecisionExclusion | null;
  shortlisted: boolean;
  bafo: BafoView;
  /** `YYYY-MM-DD` the supplier answers a better-price request by, or "". */
  bafoReplyBy: string;
  revalOpen: boolean;
  revalAnswered: boolean;
}

/** The decision records of one RFQ as the website's `useOfferDecisions` keys them: by offer id (the record's id). */
export function decisionMapOf(records: Array<{ id: string } & Partial<Pick<OfferDecision, "shortlist" | "exclusion">>>): DecisionMap {
  return Object.fromEntries(records.map((r) => [r.id, { shortlist: r.shortlist ?? null, exclusion: r.exclusion ?? null }]));
}

export function offerMarks(offer: DecidableOffer, decision: Pick<OfferDecision, "shortlist" | "exclusion"> | null | undefined): OfferMarks {
  return {
    exclusion: exclusionOf(offer, decision),
    shortlisted: isShortlisted(decision),
    bafo: bafoOf(offer),
    bafoReplyBy: bafoReplyBy(offer),
    revalOpen: revalOpen(offer),
    revalAnswered: Boolean(offer.reval?.answered),
  };
}

/** A withdrawn quote stays on record but is out of the running (the supplier's quote.withdraw). */
export const isWithdrawn = (offer: { status?: string | null; withdrawnAt?: unknown }): boolean =>
  offer.status === "مسحوب" || Boolean(offer.withdrawnAt); // ui-ok: stored offer status value

/** Whether an offer can be the «best» one: neither excluded (either way) nor withdrawn. */
export const inTheRunning = (offer: DecidableOffer & { withdrawnAt?: unknown }, decision: Pick<OfferDecision, "exclusion"> | null | undefined): boolean =>
  !isWithdrawn(offer) && exclusionOf(offer, decision) == null;
