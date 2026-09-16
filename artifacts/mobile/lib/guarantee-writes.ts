import { doc, serverTimestamp, updateDoc, type Firestore } from "firebase/firestore";

/**
 * The contractor's answer on a supplier's guarantee.
 *
 * Exactly three fields, because that is exactly what the rules allow to change:
 * anything else in the same update is refused outright, not merged. The answer
 * is also one-way in practice — a supplier may revise their submission until it
 * is accepted, and never after — so accepting is the end of the conversation.
 *
 * The permission here is `deliveries.confirm`, which is what firestore.rules
 * requires. The website's own button asks for `offers.accept` instead, and the
 * two do not line up in the seeded groups: Finance holds `offers.accept` and
 * would be refused by the rules, while Supply Chain holds `deliveries.confirm`
 * and is the group the rules actually authorise. Owners pass both, which is why
 * the mismatch is invisible until a member tries. This app follows the rules,
 * so the button appears for the people who can actually use it.
 */
export async function reviewGuarantee(
  firestore: Firestore,
  guaranteeId: string,
  decision: "accepted" | "rejected",
  reviewerUid: string
): Promise<void> {
  await updateDoc(doc(firestore, "guarantees", guaranteeId), {
    status: decision,
    reviewedAt: serverTimestamp(),
    reviewedByUserId: reviewerUid,
  });
}

/**
 * Whether this person may answer this guarantee.
 *
 * Three things must all hold, and each rules out a different mistake: the
 * guarantee must still be awaiting an answer (an accepted one is final, and a
 * rejected one is the supplier's move), the reader must be on the CONTRACTOR
 * side of it — a supplier opening their own submission is reading it, not
 * deciding it — and they must hold `deliveries.confirm`.
 */
export function canAnswerGuarantee(
  guarantee: { status?: string | null; contractorOrgId?: string | null },
  orgId: string | null | undefined,
  hasDeliveriesConfirm: boolean
): boolean {
  if (guarantee.status !== "pending_review") return false;
  if (!orgId || guarantee.contractorOrgId !== orgId) return false;
  return hasDeliveriesConfirm;
}
