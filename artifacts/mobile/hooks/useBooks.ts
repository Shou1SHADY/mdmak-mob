import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useOrgCollection } from "@/hooks/useOrgCollection";
import { usePermissions } from "@/hooks/usePermissions";
import {
  ACCOUNTING_PERIODS,
  ACCOUNTING_SETTINGS,
  JOURNAL_ENTRIES,
  type AccountingPeriod,
  type JournalEntry,
} from "@/lib/accounting/journal";
import { periodWindows, type PeriodWindows } from "@/lib/accounting/balances";
import {
  fiscalPeriodOptions,
  fiscalYearChoices,
  fiscalYearOf,
  isoToday,
  resolvePeriod,
  type FiscalPeriod,
} from "@/lib/accounting/periods";
import {
  normalizeAccountingSettings,
  type AccountingSettings,
  type AccountingSettingsDoc,
} from "@/lib/accounting/settings";
import { formatMoney, formatMoneyCompact, type MoneyScale } from "@/lib/accounting/display";

/**
 * The books, read once and derived everywhere.
 *
 * The website's accounting module subscribes to the journal a single time and
 * computes every statement as a pure function over it; this is the same bargain
 * on a phone. An org's ledger is one entry per money event, not per row, so it
 * fits in memory, the period filter costs nothing, and two statements on screen
 * are guaranteed to be reading the same books at the same instant.
 *
 * Read-only by design. Posting a voucher, closing a period and editing the
 * module's settings stay at a desk — they are decisions with a paper trail, and
 * the rules require `accounting.post` / `accounting.close` which this release
 * never asks for.
 */

// The chosen period and money scale are shared by every accounting screen, the
// way they are on the website: picking Q2 on the income statement must still be
// Q2 when you open the balance sheet, or the two are quietly describing
// different months. A module-level store rather than Context because each
// screen mounts its own `useBooks()` and Context would need a provider wrapping
// a layout that some of these screens are not under.
interface Prefs {
  periodKey: string;
  fiscalYear: number | null;
  scale: MoneyScale | null;
}

let prefs: Prefs = { periodKey: "fy", fiscalYear: null, scale: null };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const snapshot = () => prefs;

function setPrefs(next: Partial<Prefs>) {
  prefs = { ...prefs, ...next };
  emit();
}

export interface Books {
  isLoading: boolean;
  /** The org has switched Accounting on. False shows the module-off card. */
  isEnabled: boolean;
  /** `accounting.view` — the module gate the website applies in the UI. */
  canView: boolean;
  entries: JournalEntry[];
  periods: AccountingPeriod[];
  settings: AccountingSettings;
  windows: PeriodWindows;
  period: FiscalPeriod;
  periodOptions: FiscalPeriod[];
  setPeriodKey: (key: string) => void;
  fiscalYear: number;
  fiscalYears: number[];
  setFiscalYear: (fiscalYear: number) => void;
  scale: MoneyScale;
  setScale: (scale: MoneyScale) => void;
  /** Figures on a statement line. */
  money: (value: number) => string;
  /** Figures on a KPI tile — whole riyals, or K / M when scaled. */
  compact: (value: number) => string;
}

export function useBooks(): Books {
  const { can, isLoading: permsLoading } = usePermissions();
  const { items: entries, isLoading: entriesLoading } = useOrgCollection<JournalEntry>(JOURNAL_ENTRIES);
  const { items: periods } = useOrgCollection<AccountingPeriod>(ACCOUNTING_PERIODS);
  const { items: settingsDocs } = useOrgCollection<AccountingSettingsDoc>(ACCOUNTING_SETTINGS);

  const live = useSyncExternalStore(subscribe, snapshot, snapshot);

  const settings = useMemo(
    // An org may carry more than one settings doc (a legacy auto-id one beside
    // the org-id one); the enabled one is the one that counts.
    () => normalizeAccountingSettings(settingsDocs.find((d) => d.enabled === true) ?? settingsDocs[0] ?? null),
    [settingsDocs]
  );
  const scale = live.scale ?? settings.displayScale;

  const startMonth = settings.fiscalYearStartMonth;
  const today = isoToday();
  const fiscalYear = live.fiscalYear ?? fiscalYearOf(today, startMonth);

  const fiscalYears = useMemo(() => {
    const years = fiscalYearChoices(
      entries.map((e) => e.date),
      startMonth,
      today
    );
    return years.includes(fiscalYear) ? years : [...years, fiscalYear].sort((a, b) => b - a);
  }, [entries, startMonth, today, fiscalYear]);

  const periodOptions = useMemo(
    () => fiscalPeriodOptions({ fiscalYear, startMonth, today }),
    [fiscalYear, startMonth, today]
  );

  const period = useMemo(
    () => resolvePeriod({ key: live.periodKey, fiscalYear, customFrom: "", customTo: "" }, startMonth, today),
    [live.periodKey, fiscalYear, startMonth, today]
  );

  const windows = useMemo(() => periodWindows(entries, period.from, period.to), [entries, period.from, period.to]);

  const money = useCallback((value: number) => formatMoney(value, scale), [scale]);
  const compact = useCallback((value: number) => formatMoneyCompact(value, scale), [scale]);

  return {
    isLoading: entriesLoading || permsLoading,
    isEnabled: settings.enabled,
    canView: can("accounting.view"),
    entries,
    periods,
    settings,
    windows,
    period,
    periodOptions,
    setPeriodKey: (periodKey) => setPrefs({ periodKey }),
    fiscalYear,
    fiscalYears,
    setFiscalYear: (year) => setPrefs({ fiscalYear: year }),
    scale,
    setScale: (s) => setPrefs({ scale: s }),
    money,
    compact,
  };
}

/** Test seam: the shared period/scale choice, reset between cases. */
export function __resetBooksPrefs() {
  prefs = { periodKey: "fy", fiscalYear: null, scale: null };
  emit();
}
