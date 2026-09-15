// The marble line through the phone's copy of the engine.
//
// The website already tests `computeOrder` and `candidates` exhaustively; what
// this file pins is that the MIRROR — the same bytes, running under React
// Native's module graph — derives the same answers, that ownership routes each
// act to the role the PRD gives it, and that every vocabulary the engine can
// hand the UI has a word in both languages. A candidate key with no label
// renders as a raw id on a station lead's phone.

import {
  DEFAULT_MFG_SETTINGS,
  candidates,
  computeOrder,
  emptyProgress,
  ownsCandidate,
  releaseBlocks,
  stationBlocks,
  DEFECT_KINDS,
  type Actor,
  type BlockKey,
  type Candidate,
  type CandidateContext,
  type CandidateKey,
  type DefectKind,
  type DeptCapacityFields,
  type MfgOrderSlice,
  type MfgProduct,
  type Persona,
  type Stage,
  type WorkOrderMaterial,
} from "@/lib/manufacturing-engine";
import { STOP_KINDS, type StopKind } from "@/lib/manufacturing-writes";
import type { OrderView } from "@/lib/manufacturing-view";
import { actionForCandidate, severityTone } from "@/components/mfg/MfgBits";
import { en, ar } from "@/i18n/modules/manufacturing";
import { componentsForRole } from "@/lib/portal-components";

const S = DEFAULT_MFG_SETTINGS;
const TODAY = "2026-09-13";
const NOW = new Date("2026-09-13T09:00:00Z").getTime();
const CTX: CandidateContext = { settings: S, alloc: null, today: TODAY, nowMs: NOW };

const DEPTS: DeptCapacityFields[] = [
  { id: "s1", name: "Design & nesting", workers: 2, hoursPerDay: 8, hourlyRate: 85, gate: "drawing" },
  { id: "s6", name: "Slab sign-off", workers: 1, hoursPerDay: 8, hourlyRate: 65, gate: "slab" },
  { id: "s7", name: "Bridge-saw cutting", workers: 2, hoursPerDay: 8, hourlyRate: 70, gate: null, leadUserId: "sami" },
  { id: "s8", name: "Profiling & edges", workers: 3, hoursPerDay: 8, hourlyRate: 60, gate: null },
  { id: "s5", name: "QC & packing", workers: 2, hoursPerDay: 8, hourlyRate: 45, gate: null, qcStation: true },
];

const COUNTER: MfgProduct = {
  id: "pr11",
  organizationId: "org",
  name: "Kitchen counter — Crema Marfil",
  unit: "m²",
  family: "stone",
  requiresMeasurement: true,
  requiresDrawingApproval: true,
  requiresSlabApproval: true,
  wastePercent: 32,
  referenceBuyPrice: 780,
  route: [
    { departmentId: "s1", departmentName: "Design", hoursPerUnit: 0.09 },
    { departmentId: "s6", departmentName: "Slab", hoursPerUnit: 0.07 },
    { departmentId: "s7", departmentName: "Cutting", hoursPerUnit: 0.36 },
    { departmentId: "s8", departmentName: "Profiling", hoursPerUnit: 0.42 },
    { departmentId: "s5", departmentName: "QC", hoursPerUnit: 0.09 },
  ],
  bom: [
    { itemName: "Crema Marfil slab", unit: "m²", qtyPerUnit: 1, departmentId: "s7", withWaste: true, unitCost: 320, lotted: true },
  ],
};

const slab = (quantity: number): WorkOrderMaterial => ({
  id: `slab_${quantity}`,
  requestNumber: "WR-2026/001",
  itemName: "Crema Marfil slab",
  unit: "m²",
  quantity,
  departmentId: "s7",
  lot: "BLK-4471",
  state: "received",
  unitCost: 320,
  warehouseId: "w1",
  requestedByUserId: "sami",
  requestedByName: "Abu Sami",
  requestedAt: "2026-09-05T08:00:00Z",
});

function order(over: Partial<MfgOrderSlice> = {}): MfgOrderSlice {
  return {
    id: "o1",
    number: 42,
    productId: COUNTER.id,
    quantity: 20,
    neededBy: "2026-09-30",
    createdAt2: "2026-09-01T08:00:00Z",
    releasedAt: null,
    source: "client",
    downPayment: { required: false, confirmed: true, percent: null },
    survey: null,
    drawing: null,
    slabApproval: null,
    rush: null,
    progress: emptyProgress(COUNTER.route),
    materials: [],
    scrap: [],
    rejects: [],
    qcReleases: [],
    closures: [],
    frozenCost: null,
    remade: 0,
    shortfall: 0,
    brokenResolved: 0,
    remnants: [],
    purchaseRequests: [],
    overrides: {},
    changeRequest: null,
    cancellation: null,
    varianceReviews: {},
    status: "open",
    ...over,
  };
}

/** Released, surveyed, drawing A, slab signed, slab received — units at the saw. */
const atCutting = (over: Partial<MfgOrderSlice> = {}): MfgOrderSlice =>
  order({
    releasedAt: "2026-09-05T08:00:00Z",
    survey: { at: "2026-09-04", by: "Eng. Badr", sketchUrl: "x", sketchName: "sketch.pdf" },
    drawing: {
      revision: 1,
      approverOrg: "technical_office",
      submittedAt: "2026-09-05T09:00:00Z",
      submittedBy: "Badr",
      code: "A",
      recordedAt: "2026-09-06T09:00:00Z",
    },
    slabApproval: { at: "2026-09-07T09:00:00Z", by: "Eng. Lama", lot: "BLK-4471", quantity: 26.4 },
    materials: [slab(26.4)],
    progress: COUNTER.route.map((r, i) => ({
      departmentId: r.departmentId,
      done: i < 2 ? 20 : 0,
      rejected: 0,
      hours: 0,
      rework: 0,
      back: 0,
    })),
    ...over,
  });

const calc = (slice: MfgOrderSlice) => computeOrder(slice, COUNTER, DEPTS, []);
const keysOf = (cs: Candidate[]) => cs.map((c) => c.key);

const actor = (over: Partial<Actor> = {}): Actor => ({
  uid: "u1",
  manage: false,
  work: false,
  qc: false,
  cost: false,
  view: false,
  ...over,
});

describe("the engine, running on the phone", () => {
  it("an unconfirmed advance holds the order before release", () => {
    const c = calc(order({ downPayment: { required: true, confirmed: false, percent: 30 } }));
    expect(c.stage).toBe("pay");
    expect(releaseBlocks(c).map((b) => b.key)).toContain("down_payment");
    expect(keysOf(candidates(c, CTX))).toContain("down_payment");
  });

  it("a released order with no survey is still not releasable", () => {
    const c = calc(order({ downPayment: { required: false, confirmed: true, percent: null } }));
    expect(c.stage).toBe("wait");
    expect(releaseBlocks(c).map((b) => b.key)).toEqual(["survey"]);
  });

  it("an order at the saw is in production and offers its station's output", () => {
    const c = calc(atCutting());
    expect(c.stage).toBe("prod");
    expect(c.inAt[2]).toBe(20);
    expect(keysOf(candidates(c, CTX))).toContain("output");
  });

  it("the approvals gate the saw — no drawing, no cutting", () => {
    const c = calc(atCutting({ drawing: null }));
    expect(stationBlocks(c, 2).map((b) => b.key)).toContain("drawing");
  });

  it("rejected pieces raise a QC decision carrying the quantity", () => {
    const slice = atCutting();
    slice.progress[2] = { ...slice.progress[2], done: 14, rejected: 6, hours: 7 };
    const decision = candidates(calc(slice), CTX).find((x) => x.key === "qc_decision");
    expect(decision).toMatchObject({ key: "qc_decision", quantity: 6, departmentId: "s7", index: 2 });
  });
});

describe("who owns the act", () => {
  const at = (key: CandidateKey, over: Partial<Candidate> = {}): Candidate =>
    ({ key, severity: "b", ...over }) as Candidate;

  const stationAct = (departmentId: string) =>
    at("output", { owner: { kind: "station", departmentId }, departmentId });

  it("a station with a lead belongs to that lead alone", () => {
    const c = stationAct("s7");
    expect(ownsCandidate(c, actor({ work: true, uid: "sami" }), DEPTS, S, "lead")).toBe(true);
    expect(ownsCandidate(c, actor({ work: true, uid: "other" }), DEPTS, S, "lead")).toBe(false);
  });

  it("a station with no lead falls to the manager and to any pair of hands", () => {
    const c = stationAct("s8");
    expect(ownsCandidate(c, actor({ manage: true }), DEPTS, S, "manager")).toBe(true);
    expect(ownsCandidate(c, actor({ work: true, uid: "anyone" }), DEPTS, S, "lead")).toBe(true);
  });

  it("QC & packing is Quality's, never a lead's", () => {
    const c = stationAct("s5");
    expect(ownsCandidate(c, actor({ qc: true }), DEPTS, S, "qc")).toBe(true);
    expect(ownsCandidate(c, actor({ work: true, uid: "sami" }), DEPTS, S, "lead")).toBe(false);
  });

  it("scrap above Finance's limit is Cost's decision, not the manager's", () => {
    const small = at("scrap_review", { owner: { kind: "scrap", value: S.scrapApprovalLimit - 1 } });
    const big = at("scrap_review", { owner: { kind: "scrap", value: S.scrapApprovalLimit + 1 } });
    expect(ownsCandidate(small, actor({ manage: true }), DEPTS, S, "manager")).toBe(true);
    expect(ownsCandidate(big, actor({ manage: true }), DEPTS, S, "manager")).toBe(false);
    expect(ownsCandidate(big, actor({ cost: true }), DEPTS, S, "cost")).toBe(true);
  });

  it("management reads, and owns nothing", () => {
    const eyes = actor({ view: true });
    for (const c of [stationAct("s7"), stationAct("s5"), at("release", { owner: { kind: "manager" } })]) {
      expect(ownsCandidate(c, eyes, DEPTS, S, "management")).toBe(false);
    }
  });
});

describe("what the phone can actually do", () => {
  const view = { id: "o1" } as OrderView;
  const target = (key: CandidateKey, over: Partial<Candidate> = {}) =>
    actionForCandidate({ key, severity: "b", index: 2, departmentId: "s7", ...over } as Candidate, view);

  it("the five field acts open a sheet", () => {
    expect(target("output")?.kind).toBe("output");
    expect(target("qc_release")?.kind).toBe("output");
    expect(target("qc_decision")?.kind).toBe("qc_decision");
    expect(target("request_materials")?.kind).toBe("request_materials");
    expect(target("confirm_receipt", { requestNumber: "WR-2026/001" })).toMatchObject({
      kind: "confirm_receipt",
      requestNumber: "WR-2026/001",
    });
  });

  it("the desk acts are shown but not performed here", () => {
    for (const key of ["release", "close", "deliver", "apply_change", "scrap_review", "submit_drawing"] as CandidateKey[]) {
      expect(target(key)).toBeNull();
    }
  });

  it("the engine's three severities keep their tones", () => {
    expect(severityTone("r")).toBe("destructive");
    expect(severityTone("a")).toBe("warning");
    expect(severityTone("b")).toBe("cta");
  });
});

describe("every word the engine can say has both languages", () => {
  // These maps are exhaustive by type: adding a key to the engine's unions
  // fails the typecheck here until the vocabulary below lists it, and the test
  // then proves the label exists in Arabic and English.
  const CANDIDATE_KEYS: Record<CandidateKey, true> = {
    qc_decision: true, scrap_review: true, scrap_clarify: true, remake_scrap: true,
    remake_breakage: true, apply_change: true, down_payment: true, survey: true,
    release: true, shortage: true, purchase_wait: true, submit_drawing: true,
    drawing_wait: true, slab: true, gate: true, issue_wait: true,
    confirm_receipt: true, request_materials: true, output: true, qc_release: true,
    close: true, deliver: true, receipt_wait: true, remnant_wait: true,
  };
  const STAGES: Record<Stage, true> = {
    cancel: true, pay: true, wait: true, prod: true, close: true, ready: true, transit: true, done: true,
  };
  const BLOCKS: Record<BlockKey, true> = {
    down_payment: true, survey: true, drawing: true, slab: true, materials: true,
  };
  const PERSONAS: Record<Persona, true> = {
    manager: true, lead: true, qc: true, cost: true, management: true,
  };

  const both = (map: "candidates" | "stages" | "blocks" | "personas" | "defects" | "stopKinds", keys: string[]) => {
    for (const key of keys) {
      expect(en.mfg[map][key]).toBeTruthy();
      expect(ar.mfg[map][key]).toBeTruthy();
    }
  };

  it("candidate keys", () => both("candidates", Object.keys(CANDIDATE_KEYS)));
  it("stages", () => both("stages", Object.keys(STAGES)));
  it("release and station blocks", () => both("blocks", Object.keys(BLOCKS)));
  it("personas", () => both("personas", Object.keys(PERSONAS)));
  it("defects", () => both("defects", DEFECT_KINDS as readonly DefectKind[] as string[]));
  it("stop kinds", () => both("stopKinds", STOP_KINDS as readonly StopKind[] as string[]));

  it("the two languages carry the same set of keys throughout", () => {
    const walk = (a: Record<string, unknown>, b: Record<string, unknown>, path: string) => {
      expect([path, Object.keys(a).sort()]).toEqual([path, Object.keys(b).sort()]);
      for (const k of Object.keys(a)) {
        if (a[k] && typeof a[k] === "object") {
          walk(a[k] as Record<string, unknown>, b[k] as Record<string, unknown>, `${path}.${k}`);
        }
      }
    };
    walk(en.mfg, ar.mfg, "mfg");
  });
});

describe("the module registry", () => {
  it("Today and the workshop are on the phone for both roles", () => {
    for (const role of ["Contractor", "Supplier"]) {
      const items = componentsForRole(role).flatMap((c) => c.items);
      for (const [key, href] of [
        ["mfg_today", "/(manufacturing)/today"],
        ["mfg_workshop", "/(manufacturing)/orders"],
      ]) {
        const item = items.find((i) => i.titleKey === key);
        expect(item?.built).toBe(true);
        expect(item?.href).toBe(href);
      }
    }
  });
});
