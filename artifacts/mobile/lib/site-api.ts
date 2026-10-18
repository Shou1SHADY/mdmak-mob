// The website's HTTP API, for the few flows that MUST run server-side.
//
// Both apps share one Firebase project, and nearly everything the phone does is
// a direct Firestore read or write under the same security rules as the site.
// Two things cannot be: creating an account (firestore.rules reserves
// users/{uid} creation for the Admin SDK — public self-registration was removed
// from the website on 2026-08-04, accounts are created by invitation), and the
// "request access" form for a company that has no invitation yet. Those go
// through the website's API routes, exactly as the website's own register page
// does.
//
// EXPO_PUBLIC_SITE_URL points a UAT build at the UAT site. Without it, production.

// www, NOT the apex: the apex 307-redirects to www, and fetch drops the
// Authorization header on that cross-origin hop — every authenticated call
// (invitation accept, rag) would arrive logged-out and 401. Proven live
// against production on 2026-09-15.
const DEFAULT_SITE_URL = "https://www.mdmaktech.sa";

// EXPO_PUBLIC_API_URL is the name an earlier build used for the same thing;
// honoured so an EAS environment that already sets it keeps working.
export const SITE_URL = (
  process.env.EXPO_PUBLIC_SITE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  DEFAULT_SITE_URL
).replace(/\/+$/, "");

/** The landing page's demo / access-request form — the website sends visitors
 * without an invitation here too. */
export const REQUEST_ACCESS_URL = `${SITE_URL}/#demo`;

/** Absolute URL of a website path, for "open this on the web" affordances. */
export function siteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Invitation tokens are 32 random bytes as hex. Accepts the bare token or any
 * text containing it (a pasted link, an email body). */
export function extractInviteToken(text: string): string | null {
  const m = (text || "").match(/[a-f0-9]{64}/i);
  return m ? m[0].toLowerCase() : null;
}

export type InvitationInfo =
  | { type: "team_invite"; email: string; name: string | null; orgName: string; role: string }
  | { type: "supplier_invite"; email: string | null; companyName: string | null; contractorName: string };

export type ApiFailure = { ok: false; code: string; message?: string; status?: number };
export type ApiResult<T> = { ok: true; data: T } | ApiFailure;

async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** GET /api/invitations/lookup — public; resolves a token to who invited whom. */
export async function lookupInvitation(token: string): Promise<ApiResult<InvitationInfo>> {
  try {
    const res = await fetch(`${SITE_URL}/api/invitations/lookup?token=${encodeURIComponent(token)}`);
    const json = await readJson(res);
    if (!res.ok || !json?.success) {
      return { ok: false, code: json?.code || "LOOKUP_FAILED", message: json?.message, status: res.status };
    }
    return { ok: true, data: json.data as InvitationInfo };
  } catch {
    return { ok: false, code: "NETWORK" };
  }
}

/** POST /api/invitations/accept — creates the Firestore profile for a freshly
 * signed-up Auth user and links them to the inviting org. The invitation is
 * the authorization; the caller's ID token proves who is accepting. */
export async function acceptInvitation(params: {
  idToken: string;
  token: string;
  name?: string;
  phone?: string;
}): Promise<ApiResult<{ joined?: boolean; linked?: boolean; organizationId?: string }>> {
  try {
    const res = await fetch(`${SITE_URL}/api/invitations/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.idToken}`,
      },
      body: JSON.stringify({ token: params.token, name: params.name, phone: params.phone }),
    });
    const json = await readJson(res);
    if (!res.ok || !json?.success) {
      return { ok: false, code: json?.code || "ACCEPT_FAILED", message: json?.message, status: res.status };
    }
    return { ok: true, data: json.data ?? {} };
  } catch {
    return { ok: false, code: "NETWORK" };
  }
}

/** POST /api/rfq-published/notify-favorites — texts the contractor's favourite
 * suppliers about freshly published RFQs (the website calls this right after
 * publishing; without it a phone-published RFQ reaches them silently). Best
 * effort: the RFQ is already saved, so a failure here is not the user's problem. */
export async function notifyFavoritesOfPublish(idToken: string, rfqIds: string[]): Promise<void> {
  if (rfqIds.length === 0) return;
  try {
    await fetch(`${SITE_URL}/api/rfq-published/notify-favorites`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ rfqIds }),
    });
  } catch {
    /* best effort */
  }
}

/** POST /api/invitations/send — the owner invites a teammate by email; the
 * website emails the link and creates the invitation record. */
export async function sendTeamInvitation(params: {
  idToken: string;
  email: string;
  name?: string;
  groupId?: string;
}): Promise<ApiResult<Record<string, unknown>>> {
  try {
    const res = await fetch(`${SITE_URL}/api/invitations/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${params.idToken}` },
      body: JSON.stringify({ email: params.email, type: "team_invite", name: params.name, groupId: params.groupId }),
    });
    const json = await readJson(res);
    if (!res.ok || !json?.success) {
      return { ok: false, code: json?.code || "SEND_FAILED", message: json?.message, status: res.status };
    }
    return { ok: true, data: json.data ?? {} };
  } catch {
    return { ok: false, code: "NETWORK" };
  }
}

/** POST /api/sms {kind: "new_offer"} — the website tells the contractor about a
 * new offer: the notification and the text, both written server-side because
 * only the server can read the contractor's sealing policy (a sealed round must
 * name no amount; the phone used to write "عرضاً بمبلغ …" itself). Returns
 * whether it was told, so the caller can fall back to an amount-free notice. */
export async function announceNewOffer(idToken: string, offerId: string): Promise<boolean> {
  try {
    const res = await fetch(`${SITE_URL}/api/sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ kind: "new_offer", offerId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** POST /api/supplier-free/invitations — the supplier answers a contractor's
 * connection invitation (website CON-02). The server checks the invitation is
 * addressed to him (e-mail or mobile), opens the connection with the Admin SDK
 * and tells the inviter: firestore.rules let a supplier create only a PENDING
 * link, so an accepted invitation can no longer be written from the phone. */
export async function answerSupplierInvitation(
  idToken: string,
  id: string,
  answer: "accepted" | "declined"
): Promise<ApiResult<{ answer: "accepted" | "declined" }>> {
  try {
    const res = await fetch(`${SITE_URL}/api/supplier-free/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ id, answer }),
    });
    const json = await readJson(res);
    if (!res.ok || !json?.success) {
      return { ok: false, code: json?.code || "ANSWER_FAILED", message: json?.message, status: res.status };
    }
    return { ok: true, data: json.data ?? { answer } };
  } catch {
    return { ok: false, code: "NETWORK" };
  }
}

/** POST /api/supplier-free/act — the supplier's acts on a document another
 * company owns run on the server (website NFR-08), which re-reads the RFQ and
 * tells whoever must hear. The phone uses `quote.ask` (a question on an RFQ). */
/** A supplier's quotation, written by the website after it checks the company's approval and the request (onboarding,
 * 18 Oct 2026 — the rules no longer take a supplier's quote from a device). Codes: not_approved · quota · rfq_closed ·
 * rfq_missing · too_large. */
export async function submitSupplierOffer(idToken: string, rfqId: string, offer: Record<string, unknown>): Promise<ApiResult<{ id: string }>> {
  try {
    const res = await fetch(`${SITE_URL}/api/supplier/offers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ rfqId, offer }),
    });
    const json = await readJson(res);
    if (!res.ok || !json?.success || !json?.data?.id) {
      return { ok: false, code: json?.code || "OFFER_FAILED", message: json?.message, status: res.status };
    }
    return { ok: true, data: { id: String(json.data.id) } };
  } catch {
    return { ok: false, code: "NETWORK" };
  }
}

export async function supplierAct<T = Record<string, unknown>>(
  idToken: string,
  body: { action: string } & Record<string, unknown>
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${SITE_URL}/api/supplier-free/act`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(body),
    });
    const json = await readJson(res);
    if (!res.ok || !json?.success) {
      return { ok: false, code: json?.code || "ACT_FAILED", message: json?.message, status: res.status };
    }
    return { ok: true, data: (json.data ?? {}) as T };
  } catch {
    return { ok: false, code: "NETWORK" };
  }
}
