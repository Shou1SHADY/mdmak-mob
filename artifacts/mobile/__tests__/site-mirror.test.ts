// The site half of a project, computed by the phone's copy of the engine.
//
// The measurement ledger is append-only: a mistake is corrected with a negative
// entry, never an edit, and a claim consumes every unclaimed entry exactly
// once. That is the part worth pinning here — the arithmetic is the website's,
// but the consequences of getting it wrong land on a contractor's invoice.

import {
  DEFAULT_IPC_TERMS,
  buildClaimLines,
  computeClaimTotals,
  computeProgress,
  nextClaimNumber,
  previouslyClaimedByItem,
  type ClaimLine,
  type MeasurableBoqItem,
  type MeasurementEntry,
} from "@/lib/ipc";
import { en, ar } from "@/i18n/modules/site";

const BOQ: MeasurableBoqItem[] = [
  { id: "b1", itemNo: "1", descriptionAr: "حفر", descriptionEn: "Excavation", unit: "m³", quantity: 100, unitPrice: 50 },
  { id: "b2", itemNo: "2", descriptionAr: "خرسانة", descriptionEn: "Concrete", unit: "m³", quantity: 40, unitPrice: 300 },
  { id: "b3", itemNo: "10", descriptionAr: "دهان", descriptionEn: "Painting", unit: "m²", quantity: 500, unitPrice: 12 },
];

let n = 0;
const measured = (boqItemId: string, quantity: number, claimId: string | null = null): MeasurementEntry => {
  n += 1;
  return { id: `m${n}`, boqItemId, quantity, measuredAt: "2026-09-10", claimId };
};

describe("progress, weighted by value", () => {
  it("counts money built, not lines touched", () => {
    // b1 half done (2,500 of 5,000), b2 untouched (0 of 12,000), b3 untouched.
    const p = computeProgress([
      { ...BOQ[0], executedQuantity: 50 },
      { ...BOQ[1], executedQuantity: 0 },
      { ...BOQ[2], executedQuantity: 0 },
    ]);
    expect(p.contractValue).toBe(5_000 + 12_000 + 6_000);
    expect(p.executedValue).toBe(2_500);
    expect(p.percent).toBeCloseTo((2_500 / 23_000) * 100, 2);
  });

  it("an overrun does not push progress past complete", () => {
    // 150 built against 100 contracted is a real overrun, but a job is not
    // 150% done — the claim shows the overrun, the progress bar does not lie.
    const p = computeProgress([{ ...BOQ[0], executedQuantity: 150 }]);
    expect(p.executedValue).toBe(5_000);
    expect(p.percent).toBe(100);
  });

  it("a bill with no prices reports zero rather than dividing by it", () => {
    expect(computeProgress([{ id: "x", quantity: 10, unitPrice: 0, executedQuantity: 5 }]).percent).toBe(0);
  });
});

describe("turning measurements into a claim", () => {
  it("sums the unclaimed entries per line and prices them", () => {
    const lines = buildClaimLines([measured("b1", 30), measured("b1", 20), measured("b2", 5)], BOQ, new Map(), "en");
    expect(lines.map((l) => [l.boqItemId, l.currentQty, l.amount])).toEqual([
      ["b1", 50, 2_500],
      ["b2", 5, 1_500],
    ]);
  });

  it("an entry already on a claim is never claimed twice", () => {
    const lines = buildClaimLines([measured("b1", 30, "claim-1"), measured("b1", 20)], BOQ, new Map(), "en");
    expect(lines).toHaveLength(1);
    expect(lines[0].currentQty).toBe(20);
  });

  it("a correction is a negative entry, and it nets out", () => {
    // Over-measured 30, corrected by −30: the line has moved nowhere this
    // period, so it does not appear on the claim at all.
    const lines = buildClaimLines([measured("b1", 30), measured("b1", -30)], BOQ, new Map(), "en");
    expect(lines).toEqual([]);
  });

  it("a measurement against a line that no longer exists is dropped", () => {
    expect(buildClaimLines([measured("gone", 10)], BOQ, new Map(), "en")).toEqual([]);
  });

  it("carries what was claimed before, so cumulative is cumulative", () => {
    const prior = [{ lines: [{ boqItemId: "b1", currentQty: 40 } as ClaimLine] }];
    const previous = previouslyClaimedByItem(prior);
    expect(previous.get("b1")).toBe(40);

    const lines = buildClaimLines([measured("b1", 25)], BOQ, previous, "en");
    expect(lines[0]).toMatchObject({ previousQty: 40, currentQty: 25, cumulativeQty: 65 });
  });

  it("orders lines the way a bill is numbered, not the way strings sort", () => {
    // "10" comes after "2" on a bill; a plain string sort would put it second.
    const lines = buildClaimLines([measured("b3", 10), measured("b2", 1), measured("b1", 1)], BOQ, new Map(), "en");
    expect(lines.map((l) => l.itemNo)).toEqual(["1", "2", "10"]);
  });

  it("takes its description from the reader's language", () => {
    expect(buildClaimLines([measured("b1", 1)], BOQ, new Map(), "ar")[0].description).toBe("حفر");
    expect(buildClaimLines([measured("b1", 1)], BOQ, new Map(), "en")[0].description).toBe("Excavation");
  });
});

describe("what the client actually owes", () => {
  const lines = [{ amount: 100_000 } as ClaimLine];

  it("VAT is charged on the taxable remainder, not on the gross", () => {
    // 10% retention and 5% advance recovery come off first; VAT applies to
    // what is left. Taxing the gross would overstate the invoice by SAR 2,250.
    const totals = computeClaimTotals(lines, { retentionPercent: 10, advanceRecoveryPercent: 5, vatPercent: 15 });
    expect(totals.gross).toBe(100_000);
    expect(totals.retention).toBe(10_000);
    expect(totals.advanceRecovery).toBe(5_000);
    expect(totals.vat).toBe(12_750);
    expect(totals.net).toBe(85_000 + 12_750);
  });

  it("the default terms are 10% retention, no advance, 15% VAT", () => {
    expect(DEFAULT_IPC_TERMS).toEqual({ retentionPercent: 10, advanceRecoveryPercent: 0, vatPercent: 15 });
    const totals = computeClaimTotals(lines, DEFAULT_IPC_TERMS);
    expect(totals.net).toBe(90_000 + 13_500);
  });

  it("a claim with nothing on it owes nothing", () => {
    expect(computeClaimTotals([], DEFAULT_IPC_TERMS)).toEqual({
      gross: 0,
      retention: 0,
      advanceRecovery: 0,
      vat: 0,
      net: 0,
    });
  });
});

describe("claim numbering", () => {
  it("continues from the highest already issued", () => {
    expect(nextClaimNumber([])).toBe(1);
    expect(nextClaimNumber([{ claimNumber: 1 }, { claimNumber: 3 }, { claimNumber: 2 }])).toBe(4);
  });

  it("a legacy claim with no number does not reset the sequence", () => {
    expect(nextClaimNumber([{ claimNumber: 7 }, {}])).toBe(8);
  });
});

describe("the site vocabulary exists in both languages", () => {
  it("the two modules carry the same set of keys throughout", () => {
    const walk = (a: Record<string, unknown>, b: Record<string, unknown>, path: string) => {
      expect([path, Object.keys(a).sort()]).toEqual([path, Object.keys(b).sort()]);
      for (const k of Object.keys(a)) {
        if (a[k] && typeof a[k] === "object") {
          walk(a[k] as Record<string, unknown>, b[k] as Record<string, unknown>, `${path}.${k}`);
        }
      }
    };
    walk(en.site, ar.site, "site");
  });

  it("the placeholders survive translation", () => {
    for (const key of ["progress", "overrun", "history", "seatedAs", "decidedBy", "claimNumber", "measureFor"] as const) {
      const holders = (s: string) => (s.match(/\{[a-z]+\}/gi) ?? []).sort();
      expect([key, holders(ar.site[key])]).toEqual([key, holders(en.site[key])]);
    }
  });
});
