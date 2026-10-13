// The phone's RFQ screens: when an offer's price may be shown (the website's
// sealed round, src/lib/procurement/award.ts `offersSealed`, and its use in
// RfqOffersView.tsx — `showPrices = seesPrices && !sealed`), and where the
// decisions the phone no longer makes are sent.

import {
  SUPPLIER_OFFERS_PATH,
  deadlineLabel,
  offersPagePath,
  offersSealed,
  priceHiddenReason,
  pricesVisible,
  sealPolicyOf,
  seesOfferPrices,
} from "@/lib/offer-sealing";

const ON = { sealOffersUntilDeadline: true };
const OFF = { sealOffersUntilDeadline: false };
// Local noon, so the viewer's calendar day is unambiguous in any timezone.
const at = (day: string) => new Date(`${day}T12:00:00`);

describe("sealPolicyOf — procurementSettings/{orgId}", () => {
  it("is sealed when the company has no settings (the PRD default)", () => {
    expect(sealPolicyOf(null)).toEqual(ON);
    expect(sealPolicyOf(undefined)).toEqual(ON);
    expect(sealPolicyOf({ managerApprovalLimit: 1 })).toEqual(ON);
  });

  it("takes a stored boolean, and only a boolean", () => {
    expect(sealPolicyOf({ sealOffersUntilDeadline: false })).toEqual(OFF);
    expect(sealPolicyOf({ sealOffersUntilDeadline: true })).toEqual(ON);
    expect(sealPolicyOf({ sealOffersUntilDeadline: "false" })).toEqual(ON);
    expect(sealPolicyOf({ sealOffersUntilDeadline: 0 })).toEqual(ON);
  });
});

describe("offersSealed — mirrors the website's award.ts:48", () => {
  const rfq = { deadline: "2026-10-20", status: "New" };

  it("is sealed before the deadline and ON the deadline day itself", () => {
    expect(offersSealed(rfq, ON, at("2026-10-13"))).toBe(true);
    expect(offersSealed(rfq, ON, at("2026-10-20"))).toBe(true);
  });

  it("opens the day after the deadline", () => {
    expect(offersSealed(rfq, ON, at("2026-10-21"))).toBe(false);
  });

  it("reads an ISO deadline by its day", () => {
    expect(offersSealed({ deadline: "2026-10-20T00:00:00.000Z", status: "New" }, ON, at("2026-10-20"))).toBe(true);
  });

  it("is never sealed when the company switched the policy off", () => {
    expect(offersSealed(rfq, OFF, at("2026-10-13"))).toBe(false);
  });

  it("is open without a deadline — there is no moment to open at", () => {
    expect(offersSealed({ status: "New" }, ON, at("2026-10-13"))).toBe(false);
    expect(offersSealed({ deadline: "", status: "New" }, ON, at("2026-10-13"))).toBe(false);
    expect(offersSealed({ deadline: null, status: "New" }, ON, at("2026-10-13"))).toBe(false);
  });

  it("is open once awarded or cancelled, and after a manager's early close", () => {
    expect(offersSealed({ ...rfq, status: "Awarded" }, ON, at("2026-10-13"))).toBe(false);
    expect(offersSealed({ ...rfq, status: "Cancelled" }, ON, at("2026-10-13"))).toBe(false);
    expect(offersSealed({ ...rfq, closedEarly: { at: "2026-10-12T09:00:00Z" } }, ON, at("2026-10-13"))).toBe(false);
  });

  it("stays sealed for a Closed RFQ before its date (only award/cancel/early close open it)", () => {
    expect(offersSealed({ ...rfq, status: "Closed" }, ON, at("2026-10-13"))).toBe(true);
  });

  it("treats a missing RFQ as open (nothing to hide)", () => {
    expect(offersSealed(null, ON, at("2026-10-13"))).toBe(false);
  });
});

describe("pricesVisible — showPrices = seesPrices && !sealed", () => {
  const sealed = { deadline: "2026-10-20", status: "New" };
  const open = { deadline: "2026-10-01", status: "New" };
  const now = at("2026-10-13");

  it("hides a sealed price even from someone who may see prices", () => {
    expect(pricesVisible(sealed, ON, now, true)).toBe(false);
    expect(priceHiddenReason(sealed, ON, now, true)).toBe("sealed");
  });

  it("names the seal before the role when both hide it", () => {
    expect(priceHiddenReason(sealed, ON, now, false)).toBe("sealed");
  });

  it("hides an open price from a role without price rights", () => {
    expect(pricesVisible(open, ON, now, false)).toBe(false);
    expect(priceHiddenReason(open, ON, now, false)).toBe("role");
  });

  it("shows an open price to someone who may see prices", () => {
    expect(pricesVisible(open, ON, now, true)).toBe(true);
    expect(priceHiddenReason(open, ON, now, true)).toBeNull();
  });
});

describe("seesOfferPrices — the website's useProcActor.ts:32", () => {
  const holding = (...ids: string[]) => (p: string) => ids.includes(p);
  it.each([["offers.view"], ["offers.accept"], ["po.approve"]])("%s sees prices", (id) => {
    expect(seesOfferPrices(holding(id))).toBe(true);
  });
  it("an expediter sees none", () => {
    expect(seesOfferPrices(holding("po.expedite", "deliveries.confirm"))).toBe(false);
  });
});

describe("deadlineLabel", () => {
  it("shows the stored day, Gregorian, Western digits in Arabic", () => {
    expect(deadlineLabel("2026-10-20", false)).toMatch(/Oct 20, 2026/);
    const ar = deadlineLabel("2026-10-20", true);
    expect(ar).toMatch(/20/);
    expect(ar).toMatch(/2026/);
    expect(ar).not.toMatch(/[٠-٩]/);
  });
  it("is empty without a usable date", () => {
    expect(deadlineLabel(null, false)).toBe("");
    expect(deadlineLabel("soon", false)).toBe("");
  });
});

describe("decisions handed to the website", () => {
  it("opens the RFQ's offers page", () => {
    expect(offersPagePath({ id: "r1" })).toBe("/contractor/rfqs/r1/offers");
    expect(offersPagePath({ id: "r1", projectId: null })).toBe("/contractor/rfqs/r1/offers");
  });
  it("opens a project tender's offers under its project (useWorkQueue.ts:305)", () => {
    expect(offersPagePath({ id: "r1", projectId: "p9" })).toBe("/contractor/projects/p9/tenders/r1/offers");
  });
  it("sends the supplier's price revision to his offers page", () => {
    expect(SUPPLIER_OFFERS_PATH).toBe("/supplier/offers");
  });
});

// The app has no Node typings; jest runs on Node, so read through `require`.
declare const require: (m: string) => unknown;
declare const __dirname: string;

describe("the phone no longer writes the acts the website replaced", () => {
  const fs = require("fs") as { readFileSync: (p: string, enc: string) => string };
  const src = (rel: string) => fs.readFileSync(`${__dirname}/../${rel}`, "utf8");

  it("the RFQ screen neither republishes, rejects nor asks one supplier for a lower price", () => {
    const s = src("app/(contractor)/rfqs/[id].tsx");
    expect(s).not.toMatch(/\bupdateDoc\b/);
    expect(s).not.toMatch(/\baddDoc\b/);
    expect(s).not.toMatch(/status:\s*"New"/);
    expect(s).toMatch(/offersPagePath\(/);
  });

  it("the supplier's offers screen does not write a revised price", () => {
    const s = src("app/(supplier)/offers.tsx");
    expect(s).not.toMatch(/updateDoc\(doc\(db, "offers"/);
    expect(s).toMatch(/SUPPLIER_OFFERS_PATH/);
  });

  it("both buyer screens decide price visibility through the shared rule", () => {
    expect(src("app/(contractor)/rfqs/[id].tsx")).toMatch(/priceHiddenReason\(/);
    expect(src("app/(contractor)/compare.tsx")).toMatch(/priceHiddenReason\(/);
  });
});
