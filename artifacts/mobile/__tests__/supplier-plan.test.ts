// The supplier's plan (website Supplier 1.0): a supplier company with no
// companyPlans document is on the FREE journey — Sales (quote requests, my
// quotes), Order Management (home, orders, invoices, contractors) and the
// company account — and every other module is locked. "full" is the registry
// untouched. The phone shapes its launcher from the same rule.

import type { PermissionId } from "@/lib/permissions";
import { applySupplierPlan, planOf, supplierRegistry } from "@/lib/company-modules";
import { SUPPLIER_COMPONENTS, visibleComponents } from "@/lib/portal-components";

const nobody = (_p: PermissionId) => false;
const everyone = (_p: PermissionId) => true;

describe("planOf", () => {
  it("is free unless the document says full", () => {
    expect(planOf(null)).toBe("free");
    expect(planOf({})).toBe("free");
    expect(planOf({ supplierPlan: "free" })).toBe("free");
    expect(planOf({ supplierPlan: "full" })).toBe("full");
  });
});

describe("supplierRegistry", () => {
  it("full is the registry untouched", () => {
    expect(supplierRegistry("full")).toBe(SUPPLIER_COMPONENTS);
    expect(applySupplierPlan(SUPPLIER_COMPONENTS, "full")).toBe(SUPPLIER_COMPONENTS);
  });

  it("free shows Sales, Order Management and Governance — even to an account the permission check knows nothing of", () => {
    const ids = visibleComponents(supplierRegistry("free"), nobody).map((c) => c.id);
    expect(ids).toEqual(["project-management", "procurement", "users"]);
  });

  it("free locks every other module, whatever the permissions", () => {
    const ids = visibleComponents(supplierRegistry("free"), everyone).map((c) => c.id);
    expect(ids).not.toContain("crm");
    expect(ids).not.toContain("warehouses");
    expect(ids).not.toContain("payments");
    expect(supplierRegistry("free").find((c) => c.id === "crm")?.planLocked).toBe(true);
  });

  it("free keeps the journey's pages, the invoices on the website", () => {
    const hrefs = (id: string) => supplierRegistry("free").find((c) => c.id === id)?.items.map((i) => i.href);
    expect(hrefs("procurement")).toEqual(["/(supplier)/rfqs", "/(supplier)/offers"]);
    expect(hrefs("project-management")).toEqual(["/(supplier)/dashboard", "/(supplier)/orders", "/supplier/invoices", "/(connections)"]);
    expect(hrefs("users")).toEqual(["/(supplier)/profile"]);
    const invoices = supplierRegistry("free").flatMap((c) => c.items).find((i) => i.href === "/supplier/invoices");
    expect(invoices?.built).toBe(false);
  });
});
