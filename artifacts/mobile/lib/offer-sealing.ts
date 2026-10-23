// When the buyer may see an offer's price, and where the decisions the phone
// no longer makes are taken instead.
//
// Procurement 2.0 (website 227e0eb, 22 Oct 2026) removed the sealed round
// everywhere: `procurementSettings.sealOffersUntilDeadline` is gone from the
// policies, and an offer's price is on the buyer's screen as soon as it lands —
// for whoever may see amounts at all. What is left is the ROLE rule:
//   src/hooks/useProcActor.ts:33 `seesPrices` — owner / offers.view /
//   offers.accept / po.approve; an expediter sees dates and quantities only.
//
// The file keeps its name so the screens' imports stay put.
//
// Pure: no Firebase here, so the rule is tested on its own.

/** Who may see an amount at all — an expediter sees dates and quantities only. */
export function seesOfferPrices(can: (permission: "offers.view" | "offers.accept" | "po.approve") => boolean): boolean {
  return can("offers.view") || can("offers.accept") || can("po.approve");
}

/** Why the prices are not on screen, or null when they are. Only the role hides
 * them since the website dropped the seal. */
export type PriceHiddenReason = "role" | null;

export function priceHiddenReason(seesPrices: boolean): PriceHiddenReason {
  return seesPrices ? null : "role";
}

/** `showPrices = seesPrices`. */
export function pricesVisible(seesPrices: boolean): boolean {
  return priceHiddenReason(seesPrices) === null;
}

// ---------------------------------------------------------------------------
// Decisions the phone hands to the website
// ---------------------------------------------------------------------------

/** The website's offers page for an RFQ — where an award, an exclusion (with
 * its reason) and a request for a better price are made. Since Procurement 1.5
 * (PUR-09 #5, 20 Oct 2026) an RFQ has ONE page, with or without a project; the
 * project's tender address only redirects to it. */
export function offersPagePath(rfq: { id: string; projectId?: string | null }): string {
  return `/contractor/rfqs/${rfq.id}/offers`;
}

/** The supplier's offers page on the website, where a price is revised — every
 * edit is a new version of the quote, written by the server (G-15). */
export const SUPPLIER_OFFERS_PATH = "/supplier/offers";
