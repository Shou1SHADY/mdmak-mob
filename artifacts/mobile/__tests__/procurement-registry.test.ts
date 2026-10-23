// Procurement's PRD 3.0 screens on the phone's launcher.
//
// The website gates three of them on holding ANY of several permissions rather
// than one. A launcher that only understood a single permission would hide
// Today from a buyer who holds rfq.create alone, or show Purchase orders to a
// receiver who holds only deliveries.confirm.

import type { PermissionId } from "@/lib/permissions";
import { componentsForRole, visibleItems } from "@/lib/portal-components";

const procurementItems = () => componentsForRole("Contractor").flatMap((c) => c.items);
const holding = (...perms: PermissionId[]) => (p: PermissionId) => perms.includes(p);
const keysFor = (...perms: PermissionId[]) => visibleItems(procurementItems(), holding(...perms)).map((i) => i.titleKey);

describe("Procurement's new screens", () => {
  it("are listed, and open on the website until built here", () => {
    for (const key of ["proc_today", "purchase_orders", "proc_reports", "proc_settings"]) {
      const item = procurementItems().find((i) => i.titleKey === key);
      expect(item?.built).toBe(false);
      expect(item?.href.startsWith("/contractor/rfqs")).toBe(true);
    }
  });

  it("Today opens for anyone holding any one procurement permission", () => {
    expect(keysFor("rfq.create")).toContain("proc_today");
    expect(keysFor("deliveries.confirm")).toContain("proc_today");
    expect(keysFor("po.expedite")).toContain("proc_today");
    expect(keysFor("projects.view")).not.toContain("proc_today");
  });

  it("purchase orders are for whoever sees prices, plus the expediter", () => {
    expect(keysFor("po.expedite")).toContain("purchase_orders");
    expect(keysFor("offers.view")).toContain("purchase_orders");
    // A receiver counts goods; the order list is not theirs.
    expect(keysFor("deliveries.confirm")).not.toContain("purchase_orders");
  });

  it("settings belong to the approver alone", () => {
    expect(keysFor("po.approve")).toContain("proc_settings");
    expect(keysFor("offers.accept", "rfq.manage")).not.toContain("proc_settings");
  });

  it("a single-permission item still needs exactly that permission", () => {
    expect(keysFor("deliveries.confirm")).toContain("goods_received");
    expect(keysFor("offers.view")).not.toContain("goods_received");
  });
});

describe("Procurement 2.0's requester entry (website REQ-01, `requiredNone`)", () => {
  it("«طلباتي» is the requester's: shown to a member with no Procurement permission, hidden from every Procurement role", () => {
    expect(keysFor("projects.view")).toContain("proc_my_requests");
    for (const p of ["rfq.create", "rfq.manage", "offers.view", "offers.accept", "po.approve", "po.expedite", "suppliers.manage", "deliveries.confirm"] as PermissionId[]) {
      expect(keysFor(p)).not.toContain("proc_my_requests");
    }
    // The owner passes every check, so he never sees it.
    expect(visibleItems(procurementItems(), () => true).map((i) => i.titleKey)).not.toContain("proc_my_requests");
  });

  it("opens on the website, as the guide does for any Procurement role", () => {
    const mine = procurementItems().find((i) => i.titleKey === "proc_my_requests");
    expect(mine?.built).toBe(false);
    expect(mine?.href).toBe("/contractor/rfqs/my-requests");
    expect(keysFor("deliveries.confirm")).toContain("proc_guide");
    expect(keysFor("projects.view")).not.toContain("proc_guide");
  });
});
