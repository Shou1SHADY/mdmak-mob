// Who may read the people list — mirrors firestore.rules `match /employees`:
// `allow list` for `hrOffice()` = employees.manage (HR manager) · hr.gov ·
// hr.payroll · hr.management, the owner included. A workplace supervisor
// (`hr.supervisor`) reads only his sites' people one query per site
// (the website's `hrPeopleScope`), which this phone screen does not do, so he
// is not offered it. Pay is NOT on `employees` (HR 1.0 moved it to
// `employeePay`, pay roles only) — the phone shows no pay at all.
// Pure — no Firebase.

import type { PermissionId } from "@/lib/permissions";

export const HR_PEOPLE_READERS: readonly PermissionId[] = ["employees.manage", "hr.gov", "hr.payroll", "hr.management"];

export function canReadHrPeople(can: (p: PermissionId) => boolean): boolean {
  return HR_PEOPLE_READERS.some((p) => can(p));
}

/** The website's People tab, for adding, editing and anything about pay. */
export function hrPeopleWebPath(role: string | null | undefined): string {
  return role === "Supplier" ? "/supplier/hr/people" : "/contractor/hr/people";
}

/** The HR 1.0 permanent number as the website shows it (`empNo`, src/lib/hr/format.ts). */
export function empNo(no: number | null | undefined): string {
  return no == null ? "—" : String(no).padStart(4, "0");
}

/** The record's display name: HR 1.0 `names` by locale, else the legacy `name`. */
export function employeeName(
  e: { names?: { ar?: string | null; en?: string | null } | null; name?: string | null },
  isRTL: boolean
): string {
  const n = e.names;
  const fromNames = n ? (isRTL ? n.ar : n.en || n.ar) : null;
  return (fromNames || e.name || "").trim() || "—";
}
