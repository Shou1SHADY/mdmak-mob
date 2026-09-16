// The books, computed by the phone's copy of the engine.
//
// The website's suite already proves the statements are right; what this file
// proves is that the MIRROR gives the same answers under React Native's module
// graph, that a fiscal year which does not start in January still cuts the
// quarters where the org says, that drafts never reach a statement, and that
// the module's chrome exists in both languages.
//
// A small ledger, posted by hand: one contract invoiced and partly collected,
// materials bought on credit, and a draft nobody has posted.

import { ACC } from "@/lib/accounting/accounts";
import { COST_CENTERS } from "@/lib/accounting/posting-rules";
import { aggregate, periodWindows, trialBalance, integrityChecks } from "@/lib/accounting/balances";
import { balanceSheet, incomeStatement, netProfit } from "@/lib/accounting/statements";
import { incomeStatementTree, balanceSheetTree, defaultExpandedIds } from "@/lib/accounting/statement-tree";
import { liquidity } from "@/lib/accounting/analytics";
import { formatMoney, formatMoneyCompact, MONEY_SCALES } from "@/lib/accounting/display";
import { fiscalPeriodOptions, fiscalYearOf, resolvePeriod, normalizeStartMonth } from "@/lib/accounting/periods";
import { normalizeAccountingSettings } from "@/lib/accounting/settings";
import type { JournalEntry, JournalLine } from "@/lib/accounting/journal";
import { en, ar } from "@/i18n/modules/accounting";
import { componentsForRole } from "@/lib/portal-components";

// Every line carries a cost centre, because the engine's integrity checks
// require one — an unclassified line is a real finding, exercised below.
const line = (account: string, debit: number, credit: number, over: Partial<JournalLine> = {}): JournalLine => ({
  account,
  debit,
  credit,
  costCenter: COST_CENTERS.execution,
  ...over,
});

let n = 0;
const entry = (date: string, lines: JournalLine[], over: Partial<JournalEntry> = {}): JournalEntry => {
  n += 1;
  return {
    id: `e${n}`,
    organizationId: "org",
    entryNumber: n,
    date,
    period: date.slice(0, 7),
    kind: "auto",
    sourceType: "ipc_claim",
    sourceId: `s${n}`,
    description: `Entry ${n}`,
    lines,
    totalDebit: lines.reduce((t, l) => t + l.debit, 0),
    totalCredit: lines.reduce((t, l) => t + l.credit, 0),
    status: "posted",
    createdByUserId: "u1",
    createdByUserName: "Marco",
    ...over,
  };
};

const LEDGER: JournalEntry[] = [
  // Opening capital in the bank.
  entry("2026-01-05", [line(ACC.bankMain, 500_000, 0), line(ACC.paidInCapital, 0, 500_000)], { kind: "opening" }),
  // A certified claim: revenue earned, client owes it.
  entry("2026-02-10", [line(ACC.clientsReceivable, 300_000, 0), line(ACC.contractRevenue, 0, 300_000)]),
  // Materials bought on credit, and consumed into cost.
  entry("2026-02-20", [line(ACC.costMaterials, 120_000, 0), line(ACC.suppliersPayable, 0, 120_000)]),
  // Half the claim collected.
  entry("2026-03-15", [line(ACC.bankMain, 150_000, 0), line(ACC.clientsReceivable, 0, 150_000)]),
  // Office rent — below the gross-profit line.
  entry("2026-03-20", [line(ACC.rentAndUtilities, 20_000, 0), line(ACC.bankMain, 0, 20_000)]),
  // A voucher nobody has posted: it must not reach a single statement.
  entry("2026-03-25", [line(ACC.marketing, 999_999, 0), line(ACC.bankMain, 0, 999_999)], { status: "draft" }),
];

const FY = { from: "2026-01-01", to: "2026-12-31" };
const windows = periodWindows(LEDGER, FY.from, FY.to);

describe("the statements, computed on the phone", () => {
  it("earns what it billed and spends what it booked", () => {
    const is = incomeStatement(windows.movement);
    expect(is.totals.revenue).toBe(300_000);
    expect(is.totals.grossProfit).toBe(300_000 - 120_000);
    expect(netProfit(windows.movement)).toBe(300_000 - 120_000 - 20_000);
  });

  it("balances: assets equal liabilities plus equity", () => {
    const bs = balanceSheet(windows.closing);
    expect(bs.difference).toBe(0);
    // 500,000 capital in + 150,000 collected − 20,000 rent = 630,000 at bank;
    // 150,000 still owed by the client.
    expect(bs.totalAssets).toBe(630_000 + 150_000);
  });

  it("the trial balance proves it — debits equal credits", () => {
    const tb = trialBalance(windows);
    expect(tb.difference).toBe(0);
    expect(tb.totals.movementDebit).toBe(tb.totals.movementCredit);
  });

  it("every integrity check passes on honest books", () => {
    expect(integrityChecks(LEDGER, windows).filter((c) => !c.ok)).toEqual([]);
  });

  it("and an unclassified line is caught, not waved through", () => {
    const sloppy = [
      ...LEDGER,
      entry("2026-04-01", [
        line(ACC.marketing, 5_000, 0, { costCenter: null }),
        line(ACC.bankMain, 0, 5_000, { costCenter: null }),
      ]),
    ];
    const failed = integrityChecks(sloppy, periodWindows(sloppy, FY.from, FY.to)).filter((c) => !c.ok);
    expect(failed.map((c) => c.id)).toContain("cost_centers");
  });

  it("a draft voucher reaches no statement", () => {
    // The draft is a 999,999 marketing spend. If drafts leaked in, net profit
    // would be deeply negative and the marketing account would carry a balance.
    expect(windows.movement[ACC.marketing]).toBeUndefined();
    expect(netProfit(windows.movement)).toBeGreaterThan(0);
  });

  it("liquidity reads the closing balances, not the movement", () => {
    const liq = liquidity(windows.closing);
    expect(liq.cash).toBe(630_000);
    expect(liq.currentLiabilities).toBe(120_000);
    expect(liq.workingCapital).toBe(630_000 + 150_000 - 120_000);
  });
});

describe("the same numbers through the tree the screens render", () => {
  it("the income tree agrees with the income statement", () => {
    const tree = incomeStatementTree(windows.movement);
    expect(tree.statement.totals.netProfit).toBe(netProfit(windows.movement));
    expect(tree.nodes.length).toBeGreaterThan(0);
  });

  it("the balance tree agrees with the balance sheet, and opens somewhere", () => {
    const tree = balanceSheetTree(windows.closing);
    expect(tree.statement.difference).toBe(0);
    expect(defaultExpandedIds(tree.nodes).length).toBeGreaterThan(0);
  });
});

describe("a fiscal year that does not start in January", () => {
  // A Saudi org closing in March: FY2026 runs April 2026 → March 2027, and Q1
  // is April–June. Getting this wrong silently reports the wrong quarter.
  const startMonth = 4;

  it("places a date in the fiscal year the org actually keeps", () => {
    expect(fiscalYearOf("2026-03-31", startMonth)).toBe(2025);
    expect(fiscalYearOf("2026-04-01", startMonth)).toBe(2026);
  });

  it("cuts Q1 where the org cuts it", () => {
    const q1 = fiscalPeriodOptions({ fiscalYear: 2026, startMonth, today: "2026-06-15" }).find((p) => p.key === "Q1");
    expect(q1?.from).toBe("2026-04-01");
    expect(q1?.to).toBe("2026-06-30");
  });

  it("a stale or unknown period key still opens on a real range", () => {
    const p = resolvePeriod({ key: "NONSENSE", fiscalYear: 2026, customFrom: "", customTo: "" }, startMonth, "2026-06-15");
    expect(p.from <= p.to).toBe(true);
    expect(p.from).toBe("2026-04-01");
  });

  it("a settings doc with a broken start month falls back inside 1–12", () => {
    expect(normalizeStartMonth(0)).toBeGreaterThanOrEqual(1);
    expect(normalizeStartMonth(99)).toBeLessThanOrEqual(12);
    expect(normalizeStartMonth("April")).toBeGreaterThanOrEqual(1);
  });
});

describe("the module gate", () => {
  it("is off unless the org said true, explicitly", () => {
    expect(normalizeAccountingSettings(null).enabled).toBe(false);
    expect(normalizeAccountingSettings({}).enabled).toBe(false);
    expect(normalizeAccountingSettings({ enabled: true }).enabled).toBe(true);
  });

  it("defaults the display scale to riyals when the doc says something odd", () => {
    expect(normalizeAccountingSettings({ displayScale: "furlongs" as never }).displayScale).toBe("units");
    expect(normalizeAccountingSettings({ displayScale: "millions" }).displayScale).toBe("millions");
  });
});

describe("money as it is printed", () => {
  it("scales at the last moment and never prints a negative zero", () => {
    expect(formatMoney(1_234_567, "units")).toBe("1,234,567.00");
    expect(formatMoney(1_234_567, "thousands")).toBe("1,234.6");
    expect(formatMoney(1_234_567, "millions")).toBe("1.23");
    // A figure too small to show at this scale is zero on the page, not "-0.0".
    expect(formatMoney(-0.4, "thousands")).toBe("0.0");
  });

  it("KPI tiles carry their unit", () => {
    expect(formatMoneyCompact(1_234_567, "units")).toBe("1,234,567");
    expect(formatMoneyCompact(1_234_567, "thousands")).toBe("1,234.6K");
    expect(formatMoneyCompact(1_234_567, "millions")).toBe("1.23M");
  });

  it("every scale has a word in both languages", () => {
    for (const s of MONEY_SCALES) {
      expect(en.acc.scales[s]).toBeTruthy();
      expect(ar.acc.scales[s]).toBeTruthy();
    }
  });
});

describe("the chrome exists in both languages", () => {
  it("the two modules carry the same set of keys throughout", () => {
    const walk = (a: Record<string, unknown>, b: Record<string, unknown>, path: string) => {
      expect([path, Object.keys(a).sort()]).toEqual([path, Object.keys(b).sort()]);
      for (const k of Object.keys(a)) {
        if (a[k] && typeof a[k] === "object") {
          walk(a[k] as Record<string, unknown>, b[k] as Record<string, unknown>, `${path}.${k}`);
        }
      }
    };
    walk(en.acc, ar.acc, "acc");
  });

  it("entry kinds and statuses are named, not shown raw", () => {
    for (const k of ["auto", "manual", "opening"]) expect(ar.acc.kinds[k]).toBeTruthy();
    for (const s of ["draft", "posted", "reversed"]) expect(ar.acc.statuses[s]).toBeTruthy();
  });
});

describe("the module registry", () => {
  it("the six built screens point into the accounting group, for both roles", () => {
    const built: Record<string, string> = {
      acc_dashboard: "/(accounting)/books",
      acc_income: "/(accounting)/income",
      acc_balance: "/(accounting)/balance",
      acc_cashflow: "/(accounting)/cashflow",
      acc_trial_balance: "/(accounting)/trial-balance",
      acc_journal: "/(accounting)/journal",
    };
    for (const role of ["Contractor", "Supplier"]) {
      const items = componentsForRole(role).flatMap((c) => c.items);
      for (const [key, href] of Object.entries(built)) {
        const item = items.find((i) => i.titleKey === key);
        expect(item?.built).toBe(true);
        expect(item?.href).toBe(href);
        expect(item?.requiredPermission).toBe("accounting.view");
      }
    }
  });

  it("what the phone cannot do is still marked unbuilt", () => {
    const items = componentsForRole("Contractor").flatMap((c) => c.items);
    // Closing a period writes, and needs `accounting.close` — a desk act.
    expect(items.find((i) => i.titleKey === "acc_periods")?.built).toBe(false);
    expect(items.find((i) => i.titleKey === "acc_ledger")?.built).toBe(false);
  });
});

describe("the period filter is a filter, not a different ledger", () => {
  it("one month sees only its own entries", () => {
    const feb = aggregate(LEDGER, "2026-02-01", "2026-02-28");
    expect(feb[ACC.contractRevenue]?.credit).toBe(300_000);
    expect(feb[ACC.bankMain]).toBeUndefined();
  });

  it("opening + movement = closing, for every account", () => {
    const w = periodWindows(LEDGER, "2026-03-01", "2026-03-31");
    for (const code of Object.keys(w.closing)) {
      const opening = w.opening[code]?.balance || 0;
      const movement = w.movement[code]?.balance || 0;
      expect(Math.round((opening + movement) * 100) / 100).toBe(w.closing[code].balance);
    }
  });
});
