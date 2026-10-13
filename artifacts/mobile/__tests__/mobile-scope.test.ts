// Who sees and writes what on the phone: the Sales rep scope (the website's
// inSalesScope), the company identity the phone must never write (DEV-60), and
// who may read the HR people list (firestore.rules hrOffice()).

import { inSalesScope, salesScopeFilter, salesSeesAll } from "@/lib/sales-scope";
import {
  SENSITIVE_IDENTITY_KEYS,
  profileWebPath,
  resolveIdentity,
  withoutSensitiveIdentity,
} from "@/lib/company-identity";
import { canReadHrPeople, empNo, employeeName, hrPeopleWebPath } from "@/lib/hr-people";
import type { PermissionId } from "@/lib/permissions";

describe("Sales scope (inSalesScope)", () => {
  const rep = { userId: "rep1", seesAll: false };
  const contacts = [
    { id: "c-mine", ownerId: "rep1" },
    { id: "c-other", ownerId: "rep2" },
    { id: "c-free", ownerId: null },
  ];

  it("the owner and sales.approve see all; a rep is limited; Finance without sales.manage is not a rep", () => {
    expect(salesSeesAll({ owner: true, approve: false, manage: true })).toBe(true);
    expect(salesSeesAll({ owner: false, approve: true, manage: true })).toBe(true);
    expect(salesSeesAll({ owner: false, approve: false, manage: true })).toBe(false);
    expect(salesSeesAll({ owner: false, approve: false, manage: false })).toBe(true);
  });

  it("a rep sees his clients and unowned ones, never another rep's", () => {
    const mine = salesScopeFilter(rep, contacts);
    expect(mine({ contactId: "c-mine" })).toBe(true);
    expect(mine({ contactId: "c-free" })).toBe(true);
    expect(mine({ contactId: "c-other" })).toBe(false);
    expect(mine({ contactId: null })).toBe(true);
  });

  it("what a rep wrote himself is always his", () => {
    const mine = salesScopeFilter(rep, contacts);
    expect(mine({ contactId: "c-other", createdByUserId: "rep1" })).toBe(true);
    expect(inSalesScope(rep, { contactOwnerId: "rep2", createdByUserId: "rep1" })).toBe(true);
  });

  it("a viewer who sees all is never filtered", () => {
    const all = salesScopeFilter({ userId: "m", seesAll: true }, contacts);
    expect(all({ contactId: "c-other" })).toBe(true);
  });
});

describe("Company identity is never written from the phone", () => {
  it("strips every sensitive key from a profile write", () => {
    const out = withoutSensitiveIdentity({
      companyName: "x", phone: "1", crNumber: "10", taxNumber: "30", legalDocuments: {}, iban: "SA", bankName: "b",
    });
    for (const k of SENSITIVE_IDENTITY_KEYS) expect(k in out).toBe(false);
    expect(out).toEqual({ companyName: "x", phone: "1" });
  });

  it("resolves as the website does: the old profile fields win, the identity doc fills gaps", () => {
    const r = resolveIdentity({ crNumber: "STORED", taxNumber: "TAX" }, { crNumber: "LEGACY", taxNumber: "" });
    expect(r.crNumber).toBe("LEGACY");
    expect(r.taxNumber).toBe("TAX");
    expect(resolveIdentity(null, null)).toEqual({});
  });

  it("sends the owner to his portal's profile page", () => {
    expect(profileWebPath("Supplier")).toBe("/supplier/profile");
    expect(profileWebPath("Contractor")).toBe("/contractor/profile");
  });
});

describe("HR people list", () => {
  const holding = (...perms: PermissionId[]) => (p: PermissionId) => perms.includes(p);

  it("opens to the roles the employees list rule allows (hrOffice), not to a supervisor or Finance", () => {
    for (const p of ["employees.manage", "hr.gov", "hr.payroll", "hr.management"] as PermissionId[]) {
      expect(canReadHrPeople(holding(p))).toBe(true);
    }
    expect(canReadHrPeople(holding("hr.supervisor"))).toBe(false);
    expect(canReadHrPeople(holding("invoices.manage"))).toBe(false);
  });

  it("formats the number and name as the website does", () => {
    expect(empNo(7)).toBe("0007");
    expect(empNo(null)).toBe("—");
    expect(employeeName({ names: { ar: "أحمد", en: "Ahmed" } }, true)).toBe("أحمد");
    expect(employeeName({ names: { ar: "أحمد", en: null } }, false)).toBe("أحمد");
    expect(employeeName({ name: "Legacy" }, false)).toBe("Legacy");
    expect(hrPeopleWebPath("Supplier")).toBe("/supplier/hr/people");
  });
});
