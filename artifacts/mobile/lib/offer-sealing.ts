// Sealed offers — when the buyer may see an offer's price, and where the
// decisions the phone no longer makes are taken instead.
//
// The website hides offer prices from the buyer until the RFQ's deadline when
// the company keeps a sealed round (`procurementSettings.sealOffersUntilDeadline`,
// ON by default — absent document = the PRD reference value). A buyer who
// watches prices land one by one can tell the next supplier what to beat, which
// is the whole reason the round is sealed. While sealed the screen says how many
// offers arrived and from whom — never an amount.
//
// `offersSealed` mirrors the website's
//   src/lib/procurement/award.ts:48  `offersSealed(rfq, policies, now)`
// line for line, and `pricesVisible` its use in
//   src/components/contractor/RfqOffersView.tsx:871-874
//   (`showPrices = seesPrices && !sealed`, `seesPrices` from
//   src/hooks/useProcActor.ts:32 — owner / offers.view / offers.accept / po.approve).
// The policy is read the way src/lib/procurement/policies.ts `resolvePolicies`
// reads it: only a stored boolean overrides the default.
//
// Pure: no Firebase here, so the rule is tested on its own.

import { dayOf, todayOf } from "@/lib/procurement/po";
import { DEFAULT_POLICIES, type ProcurementPolicies } from "@/lib/procurement/types";

export interface SealableRfq {
  /** `YYYY-MM-DD` as the RFQ form writes it. */
  deadline?: string | null;
  status?: string | null;
  /** A manager closed the round before its date (website only). */
  closedEarly?: { at?: string | null } | null;
}

export type SealPolicy = Pick<ProcurementPolicies, "sealOffersUntilDeadline">;

/** The seal policy from the stored `procurementSettings/{orgId}` document (or
 * nothing at all) — only a stored boolean overrides the default (ON). */
export function sealPolicyOf(raw: unknown): SealPolicy {
  const v = raw && typeof raw === "object" ? (raw as { sealOffersUntilDeadline?: unknown }).sealOffersUntilDeadline : undefined;
  return { sealOffersUntilDeadline: typeof v === "boolean" ? v : DEFAULT_POLICIES.sealOffersUntilDeadline };
}

/**
 * Whether this RFQ's prices are still the suppliers' own business.
 *
 * Sealing ends the day AFTER the deadline: on the deadline day itself a
 * supplier may still quote. Days are compared, not timestamps. No deadline, an
 * award already made, a cancellation or a manager's early close all open it.
 */
export function offersSealed(rfq: SealableRfq | null | undefined, policies: SealPolicy, now: Date): boolean {
  if (!policies.sealOffersUntilDeadline) return false;
  const day = dayOf(typeof rfq?.deadline === "string" ? rfq.deadline : null);
  if (!day) return false;
  if (rfq?.status === "Awarded" || rfq?.status === "Cancelled") return false;
  if (rfq?.closedEarly) return false;
  return todayOf(now) <= day;
}

/** Who may see an amount at all — an expediter sees dates and quantities only. */
export function seesOfferPrices(can: (permission: "offers.view" | "offers.accept" | "po.approve") => boolean): boolean {
  return can("offers.view") || can("offers.accept") || can("po.approve");
}

/** Why the prices are not on screen, or null when they are. */
export type PriceHiddenReason = "sealed" | "role" | null;

export function priceHiddenReason(rfq: SealableRfq | null | undefined, policies: SealPolicy, now: Date, seesPrices: boolean): PriceHiddenReason {
  if (offersSealed(rfq, policies, now)) return "sealed";
  if (!seesPrices) return "role";
  return null;
}

/** `showPrices = seesPrices && !sealed`. */
export function pricesVisible(rfq: SealableRfq | null | undefined, policies: SealPolicy, now: Date, seesPrices: boolean): boolean {
  return priceHiddenReason(rfq, policies, now, seesPrices) === null;
}

/** The deadline as a calendar date in the reader's language (Western digits,
 * Gregorian — the stored day, never shifted by a timezone). */
export function deadlineLabel(deadline: string | null | undefined, isRTL: boolean): string {
  const day = dayOf(typeof deadline === "string" ? deadline : null);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString(isRTL ? "ar-SA-u-ca-gregory-nu-latn" : "en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

// ---------------------------------------------------------------------------
// Decisions the phone hands to the website
// ---------------------------------------------------------------------------

/** The website's offers page for an RFQ — where an award, an exclusion (with
 * its reason) and the one reduction round per RFQ are made. Since Procurement 1.5
 * (PUR-09 #5, 20 Oct 2026) an RFQ has ONE page, with or without a project; the
 * project's tender address only redirects to it. */
export function offersPagePath(rfq: { id: string; projectId?: string | null }): string {
  return `/contractor/rfqs/${rfq.id}/offers`;
}

/** The supplier's offers page on the website, where a price is revised across
 * every line and delivery batch (the website's offer-pricing.ts `revisePrice`). */
export const SUPPLIER_OFFERS_PATH = "/supplier/offers";
