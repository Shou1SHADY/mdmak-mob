import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";

// Accepting and declining a contractor's invitation, mirroring the website's
// src/app/[locale]/(supplier)/supplier/connections/page.tsx.
//
// Accepting is TWO writes that must both happen: create the link, then mark the
// invitation accepted. The website does them in that order and so does this —
// if the link write fails the invitation stays pending, which is recoverable;
// the reverse would leave an accepted invitation with no connection behind it
// and nothing in the UI to retry from.
//
// The already-linked case matters more than it looks: a contractor can invite a
// supplier they have already favourited (which auto-creates an active link), so
// accepting must NOT create a second link for the same pair.

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
  supplierOrgId: string;
  supplierName: string;
  supplierCategories: string[];
  /** Org ids this supplier is already linked to — checked to avoid a duplicate link. */
  alreadyLinkedOrgIds: Set<string>;
}

export async function acceptInvitation(input: AcceptInvitationInput): Promise<void> {
  const { firestore, invitation, supplierOrgId, supplierName, supplierCategories, alreadyLinkedOrgIds } =
    input;
  if (!invitation.contractorOrgId) throw new Error("missing_contractor_org");

  if (!alreadyLinkedOrgIds.has(invitation.contractorOrgId)) {
    await addDoc(collection(firestore, "contractorSupplierLinks"), {
      contractorOrgId: invitation.contractorOrgId,
      supplierOrgId,
      supplierName,
      supplierCategories,
      status: "active",
      // "contractor" — the contractor initiated this, and the supplier is
      // accepting. firestore.rules keys the create permission off this value.
      requestedBy: "contractor",
      requestedAt: serverTimestamp(),
      connectedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await updateDoc(doc(firestore, "invitations", invitation.id), {
    status: "accepted",
    acceptedAt: serverTimestamp(),
  });

  // Best-effort: the acceptance itself has already landed and must not be
  // reported as failed because a notification could not be written.
  try {
    if (invitation.invitedBy) {
      await addDoc(collection(firestore, "users", invitation.invitedBy, "notifications"), {
        title: "تم قبول دعوة المورد",
        message: `${supplierName} قبل دعوتك وانضم إلى دليل مورّديك.`,
        type: "supplier_invite_accepted",
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  } catch (err) {
    console.warn("[acceptInvitation] inviter notification failed:", err);
  }
}

export async function declineInvitation(firestore: Firestore, invitationId: string): Promise<void> {
  await updateDoc(doc(firestore, "invitations", invitationId), { status: "declined" });
}
