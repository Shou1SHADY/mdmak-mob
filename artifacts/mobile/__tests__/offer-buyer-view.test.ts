// The buyer's decisions on an offer, read the way the website reads them (Procurement 2.0, G-15): the private
// offerDecisions record first, a legacy «مرفوض» / «مطلوب تخفيض» status second — through the mirrored
// offer-decisions.ts, never re-derived here.

import { decisionMapOf, inTheRunning, isWithdrawn, offerMarks } from "@/lib/offer-buyer-view";
import type { OfferBafo } from "@/lib/procurement/offer-decisions";

const mark = { at: "2026-10-22T09:00:00.000Z", byId: "buyer", byName: "Buyer" };
const bafo = (over: Partial<OfferBafo> = {}): OfferBafo => ({ ...mark, replyBy: "2026-10-25", note: "Match 1,200", round: 1, answered: null, ...over });

describe("offerMarks", () => {
  it("reads the exclusion and the shortlist from the decision record", () => {
    const m = offerMarks({ status: "قيد المراجعة" }, { shortlist: mark, exclusion: { ...mark, code: "warranty", text: null } });
    expect(m.exclusion?.code).toBe("warranty");
    expect(m.shortlisted).toBe(true);
  });

  it("keeps an offer excluded the old way readable until the migration", () => {
    const m = offerMarks({ status: "مرفوض", exclusion: { code: "price" } }, undefined);
    expect(m.exclusion?.code).toBe("other");
    expect(m.exclusion?.text).toBe("السعر أعلى من المقبول");
    expect(m.shortlisted).toBe(false);
  });

  it("reads a new better-price request from `bafo`, with its reply-by day and note", () => {
    const m = offerMarks({ status: "قيد المراجعة", bafo: bafo() }, null);
    expect(m.bafo.open).toBe(true);
    expect(m.bafo.note).toBe("Match 1,200");
    expect(m.bafoReplyBy).toBe("2026-10-25");
  });

  it("reads an old «مطلوب تخفيض» offer as an open request too", () => {
    const m = offerMarks({ status: "مطلوب تخفيض", reductionNote: "old note", reductionAt: "2026-10-01T08:00:00.000Z" }, null);
    expect(m.bafo.open).toBe(true);
    expect(m.bafo.note).toBe("old note");
    expect(m.bafoReplyBy).toBe("2026-10-04");
  });

  it("says how a better-price request was answered", () => {
    const m = offerMarks({ status: "قيد المراجعة", bafo: bafo({ answered: { at: mark.at, n: 2, kind: "lowered" } }) }, null);
    expect(m.bafo.open).toBe(false);
    expect(m.bafo.answered?.kind).toBe("lowered");
  });

  it("reads a price confirmation asked and answered", () => {
    expect(offerMarks({ reval: { ...mark, note: null, answered: null } }, null).revalOpen).toBe(true);
    const answered = offerMarks({ reval: { ...mark, note: null, answered: { at: mark.at, n: 3 } } }, null);
    expect(answered.revalOpen).toBe(false);
    expect(answered.revalAnswered).toBe(true);
  });
});

describe("decisionMapOf", () => {
  it("keys the records by offer id, as the website's useOfferDecisions", () => {
    const map = decisionMapOf([{ id: "o1", shortlist: mark, exclusion: null }, { id: "o2" }]);
    expect(map.o1?.shortlist).toEqual(mark);
    expect(map.o2).toEqual({ shortlist: null, exclusion: null });
  });
});

describe("inTheRunning — who may be «best»", () => {
  it("leaves out an excluded offer, either way, and a withdrawn one", () => {
    expect(inTheRunning({ status: "قيد المراجعة" }, null)).toBe(true);
    expect(inTheRunning({ status: "مرفوض" }, null)).toBe(false);
    expect(inTheRunning({ status: "قيد المراجعة" }, { exclusion: { ...mark, code: "spec", text: null } })).toBe(false);
    expect(inTheRunning({ status: "مسحوب" }, null)).toBe(false);
    expect(isWithdrawn({ status: "قيد المراجعة", withdrawnAt: "2026-10-20" })).toBe(true);
  });
});

// The app has no Node typings; jest runs on Node, so read through `require`.
declare const require: (m: string) => unknown;
declare const __dirname: string;

describe("the buyer screens read the decisions and never write them", () => {
  const fs = require("fs") as { readFileSync: (p: string, enc: string) => string };
  const src = (rel: string) => fs.readFileSync(`${__dirname}/../${rel}`, "utf8");

  it.each(["app/(contractor)/rfqs/[id].tsx", "app/(contractor)/compare.tsx"])("%s queries offerDecisions by its own organisation and RFQ", (rel) => {
    const s = src(rel);
    expect(s).toMatch(/collection\(db, OFFER_DECISIONS\), where\("organizationId", "==", orgId\), where\("rfqId", "==", /);
    expect(s).toMatch(/offerMarks\(/);
    expect(s).not.toMatch(/\b(updateDoc|setDoc|addDoc|writeBatch|runTransaction)\b/);
  });

  it("the supplier's card reads a 2.0 better-price request through bafoOf, falling back to the old fields", () => {
    const s = src("components/OfferCard.tsx");
    expect(s).toMatch(/bafoOf\(offer\)/);
    expect(s).toMatch(/offer\.targetPrice/);
    expect(s).toMatch(/offer\.reductionNote/);
  });
});
