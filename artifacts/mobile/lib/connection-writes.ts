import { getAuth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { answerSupplierInvitation } from "@/lib/site-api";

// Accepting and declining a contractor's invitation, mirroring the website's
// src/app/[locale]/(supplier)/supplier/connections/page.tsx and its
// answerInvitation (src/lib/supplier-free/connections.ts).
//
// Since Supplier 1.0 (15 Oct 2026) the answer is the SERVER's:
// /api/supplier-free/invitations checks the invitation is addressed to this
// supplier (by e-mail or mobile), opens the connection — reusing an existing
// link for the pair, so a contractor who had already favourited the supplier
// never gets a second one — marks the invitation, and tells the inviter in his
// own language. firestore.rules now refuse a supplier who writes a link with
// status "active", which is what this file used to do; the phone sends the
// same request the website does instead, with the caller's ID token.

export interface Invitation {
  id: string;
  email?: string;
  contractorOrgId?: string | null;
  invitedBy?: string | null;
  contractorName?: string | null;
  status?: string;
}

export interface AcceptInvitationInput {
  firestore: Firestore;
  invitation: Invitation;
  // The fields below are kept so callers keep compiling; the server now reads
  // the active company's name, field and existing links itself.
  supplierOrgId: string;
  supplierName: string;
  supplierCategories: string[];
  /** Org ids this supplier is already linked to — the server checks this now. */
  alreadyLinkedOrgIds: Set<string>;
}

async function answer(firestore: Firestore, invitationId: string, value: "accepted" | "declined"): Promise<void> {
  const idToken = await getAuth(firestore.app).currentUser?.getIdToken();
  if (!idToken) throw new Error("UNAUTHENTICATED");
  const result = await answerSupplierInvitation(idToken, invitationId, value);
  if (!result.ok) throw new Error(result.code);
}

export async function acceptInvitation(input: AcceptInvitationInput): Promise<void> {
  if (!input.invitation.contractorOrgId) throw new Error("missing_contractor_org");
  await answer(input.firestore, input.invitation.id, "accepted");
}

export async function declineInvitation(firestore: Firestore, invitationId: string): Promise<void> {
  await answer(firestore, invitationId, "declined");
}
