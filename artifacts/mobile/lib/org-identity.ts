import { doc, type DocumentReference } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Mirrors the website's src/lib/org-identity.ts. An account's `organizationId`
// can point at three different docs, and company-identity fields (companyName,
// phone, city, CR/tax numbers, documents, specializations, ...) must be read
// from — and written to — the same one, or they bleed between an owner's
// companies:
//
//   - its own uid            -> the primary/solo company; identity is on users/{uid}
//   - a generated org doc id -> a secondary company added on the website's
//                               company switcher; identity is on organizations/{id}
//   - the OWNER's uid        -> a team member; identity belongs to the owner and
//                               the member must not write it at all
//
// This app only ever creates the first kind (see AuthContext), but it has to
// read and edit the other two correctly for accounts made on the website.

/** True only for a secondary company added via the website's company switcher. */
export function isSecondaryOrg(
  organizationId: string | null | undefined,
  uid: string | null | undefined,
  organizationRole?: string | null
): boolean {
  return !!organizationId && !!uid && organizationId !== uid && organizationRole !== "member";
}

/**
 * The document holding this account's company-identity fields — the one a
 * profile edit must write to. Writing to users/{uid} unconditionally would save
 * a secondary company's details onto the primary company instead, where the
 * website would never show them.
 */
export function identityDocRef(
  uid: string,
  organizationId: string | null | undefined,
  organizationRole?: string | null
): DocumentReference {
  return isSecondaryOrg(organizationId, uid, organizationRole)
    ? doc(db, "organizations", organizationId as string)
    : doc(db, "users", uid);
}
