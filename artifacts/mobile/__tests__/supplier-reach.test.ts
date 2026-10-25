// Who an RFQ reaches on the phone: the website's rule (ED-21) — field AND delivery city, or invited by name — over the
// verbatim mirror lib/materials/reach.ts.

import { cityCovers } from "@/lib/materials/reach";
import { rfqReachesSupplier, supplierFieldOf } from "@/lib/supplier-reach";

const riyadhCement = { subIds: ["sub-cement"], specs: ["مواد البناء"], cities: ["الرياض"] };

describe("rfqReachesSupplier", () => {
  it("reaches a supplier in the RFQ's field and city", () => {
    expect(rfqReachesSupplier({ visibility: "public", subCategoryIds: ["sub-cement"], city: "الرياض" }, "s1", riyadhCement)).toBe(true);
  });

  it("does not reach him in another city", () => {
    expect(rfqReachesSupplier({ visibility: "public", subCategoryIds: ["sub-cement"], city: "جدة" }, "s1", riyadhCement)).toBe(false);
  });

  it("reaches him when either side names no city", () => {
    expect(rfqReachesSupplier({ visibility: "public", subCategoryIds: ["sub-cement"] }, "s1", riyadhCement)).toBe(true);
    expect(rfqReachesSupplier({ visibility: "public", subCategoryIds: ["sub-cement"], city: "جدة" }, "s1", { ...riyadhCement, cities: [] })).toBe(true);
  });

  it("reaches him on any of a multi-place RFQ's cities", () => {
    expect(rfqReachesSupplier({ visibility: "public", subCategoryIds: ["sub-cement"], cities: ["جدة", "الرياض"] }, "s1", riyadhCement)).toBe(true);
  });

  it("matches an RFQ written before the tree by its category name", () => {
    expect(rfqReachesSupplier({ visibility: "public", category: "مواد البناء", city: "الرياض" }, "s1", riyadhCement)).toBe(true);
    expect(rfqReachesSupplier({ visibility: "public", category: "كهرباء", city: "الرياض" }, "s1", riyadhCement)).toBe(false);
  });

  it("a private RFQ reaches only who it names — wherever he is", () => {
    expect(rfqReachesSupplier({ visibility: "private", subCategoryIds: ["sub-cement"], city: "الرياض" }, "s1", riyadhCement)).toBe(false);
    expect(rfqReachesSupplier({ visibility: "private", allowedSupplierOrgIds: ["s1"], city: "جدة" }, "s1", riyadhCement)).toBe(true);
  });

  it("a supplier who chose no field is reached by no public RFQ, as on the website", () => {
    expect(rfqReachesSupplier({ visibility: "public", category: "مواد البناء" }, "s1", { subIds: [], specs: [], cities: [] })).toBe(false);
  });
});

describe("supplierFieldOf", () => {
  it("reads the tree specialties, the category names and the coverage cities (else his own city)", () => {
    expect(supplierFieldOf({ specialtyIds: ["a"], specializations: ["x"], coverageCities: ["الرياض", "جدة"], city: "الدمام" })).toEqual({ subIds: ["a"], specs: ["x"], cities: ["الرياض", "جدة"] });
    expect(supplierFieldOf({ city: "الدمام" }).cities).toEqual(["الدمام"]);
    expect(supplierFieldOf(null)).toEqual({ subIds: [], specs: [], cities: [] });
  });

  it("folds the hamza and the taa marbuta, as the website compares cities", () => {
    expect(cityCovers(["الاحساء"], ["الأحساء"])).toBe(true);
  });
});

// The app has no Node typings; jest runs on Node, so read through `require`.
declare const require: (m: string) => unknown;
declare const __dirname: string;

describe("the phone counts a supplier's RFQ visit through the website (RFQ-02)", () => {
  const fs = require("fs") as { readFileSync: (p: string, enc: string) => string };
  const src = (rel: string) => fs.readFileSync(`${__dirname}/../${rel}`, "utf8");
  it("both supplier RFQ screens call it, and the call is the website's route", () => {
    expect(src("app/(supplier)/rfq/[id].tsx")).toMatch(/useCountRfqView\(id\)/);
    expect(src("app/(supplier)/submit-offer/[rfqId].tsx")).toMatch(/useCountRfqView\(rfqId\)/);
    expect(src("lib/site-api.ts")).toMatch(/\/api\/supplier\/rfq-view/);
  });
  it("the home and the assistant read the reaching RFQs through the one rule", () => {
    expect(src("hooks/useTodayHome.ts")).toMatch(/fetchReachingRfqs/);
    expect(src("hooks/useAIChat.ts")).toMatch(/fetchReachingRfqs/);
    expect(src("hooks/useAIChat.ts")).toMatch(/where\('contractorOrgId', '==', orgId\)/);
  });
});
