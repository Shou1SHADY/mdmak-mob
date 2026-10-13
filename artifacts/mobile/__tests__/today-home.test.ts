// The phone's home: what it asks each person to decide, and which modules it shows a company.
//
// The decision rules are the website's (useWorkQueue thresholds, supplier-home), so these tests pin the
// cases a person would notice on the phone: an RFQ closing tomorrow comes first, an approver never sees
// his own order to approve, a supplier's sales-only company sees no CRM, Inventory or Finance.

import { contractorDecisions, contractorTodayCounts, CLOSING_SOON_MS, NO_OFFERS_GRACE_MS } from "@/lib/contractor-today";
import { supplierDecisions } from "@/lib/supplier-home";
import { applyModuleSwitches, offSet, SALES_ONLY_OFF } from "@/lib/company-modules";
import { CONTRACTOR_COMPONENTS, SUPPLIER_COMPONENTS, visibleComponents } from "@/lib/portal-components";
import { DEFAULT_POLICIES, type ProcActor, type PurchaseOrder } from "@/lib/procurement/types";

const NOW = Date.parse("2026-10-13T09:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();

const approver: ProcActor = { uid: "u-approver", name: "Approver", isOwner: false, canApprove: true, canPrepare: false, canExpedite: true, canReceive: false, seesPrices: true };

const order = (over: Partial<PurchaseOrder>): PurchaseOrder =>
  ({ id: "po1", docNumber: "PO-2026/001", status: "awaiting_approval", supplierName: "Al Jawda", preparedById: "u-buyer", createdAt: iso(NOW - 3600_000), basis: "offer", lines: [], total: 1000, ...over }) as unknown as PurchaseOrder;

const base = {
  rfqs: [],
  offers: [],
  deliveries: [],
  orders: [],
  now: NOW,
  seesOffers: true,
  receives: true,
  actor: approver,
  policies: DEFAULT_POLICIES,
};

describe("contractor decisions", () => {
  it("puts an RFQ closing within 48 hours first, and leaves later ones out", () => {
    const out = contractorDecisions({
      ...base,
      rfqs: [
        { id: "late", title: "Steel", status: "New", deadline: iso(NOW + CLOSING_SOON_MS + 3600_000), createdAt: iso(NOW - 3600_000) },
        { id: "soon", title: "Cement", status: "New", deadline: iso(NOW + 5 * 3600_000), createdAt: iso(NOW - 3600_000) },
      ],
      offers: [{ id: "o1", rfqId: "late", status: "قيد المراجعة", createdAt: iso(NOW) }],
    });
    expect(out[0]).toMatchObject({ kind: "rfq_closing", rfqId: "soon", hoursLeft: 5, href: "/(contractor)/rfqs/soon" });
    expect(out.find((d) => d.kind === "rfq_closing" && d.rfqId === "late")).toBeUndefined();
    expect(out.find((d) => d.kind === "offers_to_review")).toMatchObject({ rfqId: "late", count: 1, title: "Steel" });
  });

  it("names an RFQ with no offer after three days, not before", () => {
    const out = contractorDecisions({
      ...base,
      rfqs: [
        { id: "old", title: "Paint", status: "New", createdAt: iso(NOW - NO_OFFERS_GRACE_MS - 1) },
        { id: "new", title: "Tiles", status: "New", createdAt: iso(NOW - 3600_000) },
      ],
    });
    expect(out.map((d) => d.id)).toEqual(["rfq_no_offers:old"]);
  });

  it("asks for an approval only from someone the website would let approve, and opens it on the web", () => {
    const own = order({ id: "mine", preparedById: approver.uid });
    const theirs = order({ id: "theirs" });
    const out = contractorDecisions({ ...base, orders: [own, theirs] });
    expect(out).toEqual([expect.objectContaining({ kind: "po_approve", poId: "theirs", web: true })]);
    expect(contractorDecisions({ ...base, orders: [theirs], actor: null })).toEqual([]);
  });

  it("shows deliveries only to whoever receives goods, and counts what the strip shows", () => {
    const deliveries = [{ id: "d1", rfqTitle: "Rebar", supplierName: "Riyadh Steel" }];
    expect(contractorDecisions({ ...base, deliveries }).map((d) => d.kind)).toEqual(["delivery_confirm"]);
    expect(contractorDecisions({ ...base, deliveries, receives: false })).toEqual([]);
    expect(contractorTodayCounts({ rfqs: [{ id: "a", status: "New" }, { id: "b", status: "Awarded" }], offers: [{ id: "o", status: "قيد المراجعة" }], deliveries })).toEqual({ openRfqs: 1, offersToReview: 1, deliveriesToConfirm: 1 });
  });
});

describe("supplier decisions (website supplier-home, mirrored)", () => {
  it("asks for an open RFQ the supplier has not answered, soonest first", () => {
    const out = supplierDecisions({
      rfqs: [
        { id: "r1", title: "Later", status: "New", deadline: "2026-10-30" },
        { id: "r2", title: "Sooner", status: "New", deadline: "2026-10-15" },
        { id: "r3", title: "Answered", status: "New", deadline: "2026-10-14" },
      ],
      offers: [{ id: "o", rfqId: "r3", status: "قيد المراجعة" }],
      orders: [],
      now: NOW,
      seesRfqs: true,
    });
    expect(out.map((d) => d.id)).toEqual(["rfq:r2", "rfq:r1"]);
  });
});

describe("company switches on the phone", () => {
  const all = () => true;
  const ids = (list: { id: string }[]) => list.map((c) => c.id);

  it("a sales-only supplier keeps Order Management, Sales, Governance, My to-dos and Documents", () => {
    const off = offSet({ off: [...SALES_ONLY_OFF] }, "supplier");
    const shown = ids(visibleComponents(applyModuleSwitches(SUPPLIER_COMPONENTS, off, "supplier"), all));
    expect(shown).not.toEqual(expect.arrayContaining(["crm"]));
    for (const gone of ["crm", "warehouses", "payments", "hr", "manufacturing"]) expect(shown).not.toContain(gone);
    for (const kept of ["project-management", "procurement", "users", "activities", "documents"]) expect(shown).toContain(kept);
  });

  it("keeps Connections for a supplier without CRM, under Order Management", () => {
    const om = SUPPLIER_COMPONENTS.find((c) => c.id === "project-management")!;
    expect(om.items.map((i) => i.titleKey)).toContain("connections");
    expect(SUPPLIER_COMPONENTS.find((c) => c.id === "crm")!.items.map((i) => i.titleKey)).not.toContain("connections");
  });

  it("switching Finance off takes HR with it, and a contractor cannot switch a supplier-only module", () => {
    expect([...offSet({ off: ["payments"] }, "supplier")].sort()).toEqual(["hr", "payments"]);
    expect([...offSet({ off: ["crm"] }, "contractor")]).toEqual([]);
  });

  it("a contractor with Project Management off keeps the dashboard but loses the tile", () => {
    const off = offSet({ off: ["project-management"] }, "contractor");
    const list = applyModuleSwitches(CONTRACTOR_COMPONENTS, off, "contractor");
    const pm = list.find((c) => c.id === "project-management")!;
    expect(pm.items.map((i) => i.titleKey)).toEqual(["dashboard"]);
    expect(ids(visibleComponents(list, all))).not.toContain("project-management");
  });

  it("a company with no switch document has everything on", () => {
    expect(offSet(null, "supplier").size).toBe(0);
    expect(applyModuleSwitches(SUPPLIER_COMPONENTS, offSet(undefined, "supplier"), "supplier")).toBe(SUPPLIER_COMPONENTS);
  });
});
