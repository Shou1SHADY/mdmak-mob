// The mirrored permission catalog — the same resolution the website and
// firestore.rules run. If this drifts, check:mirrors fails first; these tests
// pin the behaviours mobile screens actually lean on.

import { PERMISSION_IDS, can, type TeamGroup } from "@/lib/permissions";

const groups: TeamGroup[] = [
  { id: "g-super", name: "مشرف عام", key: "super_admin", permissions: ["*"], organizationId: "o" } as TeamGroup,
  { id: "g-crm", name: "علاقات", permissions: ["crm.manage"], organizationId: "o" } as TeamGroup,
  { id: "g-view", name: "مشاهد", permissions: [], organizationId: "o" } as TeamGroup,
];

describe("can()", () => {
  it("an owner passes every check", () => {
    for (const p of PERMISSION_IDS) {
      expect(can(p, { organizationRole: "owner", defaultGroupId: null, groups: [] })).toBe(true);
    }
  });

  it("a member gets exactly their group's permissions plus the implicit read", () => {
    const ctx = { organizationRole: "member" as const, defaultGroupId: "g-crm", groups };
    expect(can("crm.manage", ctx)).toBe(true);
    expect(can("invoices.manage", ctx)).toBe(false);
    expect(can("projects.view", ctx)).toBe(true); // implicit
  });

  it("the wildcard group grants everything", () => {
    const ctx = { organizationRole: "member" as const, defaultGroupId: "g-super", groups };
    expect(can("accounting.close", ctx)).toBe(true);
    expect(can("manufacturing.qc", ctx)).toBe(true);
  });

  it("a project seat fully replaces the default group — in both directions", () => {
    const broad = { organizationRole: "member" as const, defaultGroupId: "g-crm", groups, projectGroupId: "g-view" };
    expect(can("crm.manage", broad)).toBe(false);
    const narrow = { organizationRole: "member" as const, defaultGroupId: "g-view", groups, projectGroupId: "g-crm" };
    expect(can("crm.manage", narrow)).toBe(true);
  });

  it("a member with no group keeps only the implicit read", () => {
    const ctx = { organizationRole: "member" as const, defaultGroupId: null, groups };
    expect(can("projects.view", ctx)).toBe(true);
    expect(can("rfq.create", ctx)).toBe(false);
  });
});

describe("the catalog the phone gates on", () => {
  it("carries the manufacturing five, sales pair and accounting trio the web added", () => {
    for (const id of [
      "manufacturing.manage",
      "manufacturing.work",
      "manufacturing.qc",
      "manufacturing.cost",
      "manufacturing.view",
      "sales.manage",
      "sales.approve",
      "accounting.view",
      "accounting.post",
      "accounting.close",
      "team.manage",
      "deliveries.confirm",
      "warehouses.manage",
      "invoices.manage",
      "crm.manage",
      "offers.accept",
      "rfq.create",
      "projects.edit",
    ]) {
      expect(PERMISSION_IDS).toContain(id);
    }
  });
});
