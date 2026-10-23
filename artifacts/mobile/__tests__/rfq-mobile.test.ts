// The phone's RFQ screens: when an offer's price may be shown (the website's
// `seesPrices`, src/hooks/useProcActor.ts — Procurement 2.0 removed the sealed
// round everywhere), and where the decisions the phone no longer makes are sent.

import {
  SUPPLIER_OFFERS_PATH,
  offersPagePath,
  priceHiddenReason,
  pricesVisible,
  seesOfferPrices,
} from "@/lib/offer-sealing";
import * as sealing from "@/lib/offer-sealing";

describe("no sealed round (website Procurement 2.0, 227e0eb)", () => {
  it("has no seal policy or seal check left to call", () => {
    expect((sealing as Record<string, unknown>).offersSealed).toBeUndefined();
    expect((sealing as Record<string, unknown>).sealPolicyOf).toBeUndefined();
  });
});

describe("pricesVisible — showPrices = seesPrices", () => {
  it("shows the price to someone who may see prices, whatever the deadline", () => {
    expect(pricesVisible(true)).toBe(true);
    expect(priceHiddenReason(true)).toBeNull();
  });

  it("hides the price from a role without price rights", () => {
    expect(pricesVisible(false)).toBe(false);
    expect(priceHiddenReason(false)).toBe("role");
  });
});

describe("seesOfferPrices — the website's useProcActor.ts:33", () => {
  const holding = (...ids: string[]) => (p: string) => ids.includes(p);
  it.each([["offers.view"], ["offers.accept"], ["po.approve"]])("%s sees prices", (id) => {
    expect(seesOfferPrices(holding(id))).toBe(true);
  });
  it("an expediter sees none", () => {
    expect(seesOfferPrices(holding("po.expedite", "deliveries.confirm"))).toBe(false);
  });
});

describe("decisions handed to the website", () => {
  it("opens the RFQ's offers page", () => {
    expect(offersPagePath({ id: "r1" })).toBe("/contractor/rfqs/r1/offers");
    expect(offersPagePath({ id: "r1", projectId: null })).toBe("/contractor/rfqs/r1/offers");
  });
  it("a project's tender opens on the same one RFQ page (website PUR-09 #5)", () => {
    expect(offersPagePath({ id: "r1", projectId: "p9" })).toBe("/contractor/rfqs/r1/offers");
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

  it("no screen reads the removed seal policy any more", () => {
    for (const f of ["app/(contractor)/rfqs/[id].tsx", "app/(contractor)/compare.tsx"]) {
      expect(src(f)).not.toMatch(/procurementSettings/);
      expect(src(f)).not.toMatch(/sealPolicyOf|"sealed"/);
    }
  });

  it("every buyer-side offer list names its side (website rules G-06: an rfqId filter alone is refused)", () => {
    for (const f of ["app/(contractor)/rfqs/[id].tsx", "app/(contractor)/compare.tsx", "app/(contractor)/profile.tsx"]) {
      const s = src(f);
      const lists = s.match(/collection\(db, "offers"\)[^;]*?\)\)/gs) || [];
      expect(lists.length).toBeGreaterThan(0);
      for (const q of lists) expect(q).toMatch(/contractorOrgId/);
    }
  });
});
