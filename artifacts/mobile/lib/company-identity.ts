// A company's sensitive identity (DEV-60) — ported from the website's
// src/lib/company-identity.ts. CR and tax numbers, the legal certificates and
// bank details live in `companyIdentity/{orgId}`, which only the company's
// OWNER (and outside parties) may read and only the owner may write; the old
// copies on users/{uid} are readable by any signed-in user.
//
// The phone therefore never writes these fields. It shows them read-only and
// sends the owner to the website's profile page to change them. Pure — no
// Firebase; the screen does the one `get`.

export const COMPANY_IDENTITY = "companyIdentity";

export const SENSITIVE_IDENTITY_KEYS = ["crNumber", "taxNumber", "legalDocuments", "iban", "bankName"] as const;
export type SensitiveIdentityKey = (typeof SENSITIVE_IDENTITY_KEYS)[number];

export interface CompanyIdentity {
  crNumber?: string;
  taxNumber?: string;
  legalDocuments?: Record<string, { url?: string; expiryDate?: string; uploadedAt?: string }>;
  iban?: string;
  bankName?: string;
}

const present = (v: unknown): boolean => {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
};

/** The sensitive fields a document carries, empty ones left out (the website's `pickIdentity`). */
export function pickIdentity(source: Record<string, unknown> | null | undefined): CompanyIdentity {
  const out: Record<string, unknown> = {};
  if (!source) return out;
  for (const key of SENSITIVE_IDENTITY_KEYS) {
    if (present(source[key])) out[key] = typeof source[key] === "number" ? String(source[key]) : source[key];
  }
  return out as CompanyIdentity;
}

/** The website's `resolveIdentity`: while the old profile fields exist they win; the
 * identity document fills what they lack. */
export function resolveIdentity(
  stored: CompanyIdentity | null | undefined,
  legacy: Record<string, unknown> | null | undefined
): CompanyIdentity {
  return { ...pickIdentity(stored as Record<string, unknown> | null | undefined), ...pickIdentity(legacy) };
}

/** Drops every sensitive key from a profile write — the phone must never send one. */
export function withoutSensitiveIdentity<T extends Record<string, unknown>>(payload: T): Partial<T> {
  const clone: Record<string, unknown> = { ...payload };
  for (const key of SENSITIVE_IDENTITY_KEYS) delete clone[key];
  return clone as Partial<T>;
}

/** The website page where the owner edits the company's identity. */
export function profileWebPath(role: string | null | undefined): string {
  return role === "Supplier" ? "/supplier/profile" : "/contractor/profile";
}
