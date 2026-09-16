// Accounting (المحاسبة) — the books, read-only.
//
// Almost nothing here names an account or a statement line: every row the
// engine produces already carries `labelAr` and `labelEn`, written once in the
// chart of accounts and rendered in whichever language the reader chose. What
// this module holds is the chrome around those rows — screen names, the KPI
// captions, and the sentences that explain why a screen is empty.

export const en = {
  acc: {
    title: "Accounting",
    books: "The books",
    income: "Income statement",
    balance: "Balance sheet",
    cashflow: "Cash flow",
    trial: "Trial balance",
    journal: "Journal",

    off: "Accounting is switched off",
    offHint: "An owner switches the module on in Accounting settings on the website.",
    noAccess: "The books are not part of your role",
    noAccessHint: "Ask your organization owner for accounting access.",
    empty: "Nothing posted in this period",
    emptyHint: "Entries appear as work is certified, invoiced and paid.",

    // The period bar
    period: "Period",
    fiscalYear: "Fiscal year",
    scale: "Figures in",
    scales: {
      units: "Riyals",
      thousands: "Thousands",
      millions: "Millions",
    } as Record<string, string>,
    range: "{from} → {to}",

    // KPI tiles
    revenue: "Revenue",
    grossProfit: "Gross profit",
    netProfit: "Net profit",
    cash: "Cash",
    receivables: "Receivables",
    payables: "Payables",
    workingCapital: "Working capital",
    margin: "{value} margin",
    overdue: "{value} over 60 days",
    ratio: "Current {ratio} · quick {quick}",
    cashHint: "Across every bank and till",
    ccc: "Cash cycle",
    cccHint: "{days} days from riyal spent to riyal back",
    expensesTitle: "Where the money went",
    recentTitle: "Latest entries",

    // Statements
    unbalanced: "The books do not balance",
    unbalancedHint: "Assets differ from liabilities and equity by {value}.",
    checksFailing: "Integrity checks failing",
    balanced: "Balanced",
    totalAssets: "Total assets",
    totalLiabEquity: "Liabilities and equity",
    openingCash: "Opening cash",
    closingCash: "Closing cash",
    netChange: "Net change",

    // Trial balance
    account: "Account",
    debit: "Debit",
    credit: "Credit",
    movement: "Movement",
    closing: "Closing",
    difference: "Difference {value}",

    // Journal
    entryNumber: "Entry {number}",
    lines: "{count} lines",
    kinds: {
      auto: "Automatic",
      manual: "Manual",
      opening: "Opening",
    } as Record<string, string>,
    statuses: {
      draft: "Draft",
      posted: "Posted",
      reversed: "Reversed",
    } as Record<string, string>,
    journalSearch: "Search entries…",
    postedOnly: "Drafts are excluded from every statement.",
    readOnly: "Read-only on the phone",
    readOnlyHint: "Posting a voucher, closing a period and editing settings stay on the website.",
  },
};

export const ar = {
  acc: {
    title: "المحاسبة",
    books: "الدفاتر",
    income: "قائمة الدخل",
    balance: "قائمة المركز المالي",
    cashflow: "التدفقات النقدية",
    trial: "ميزان المراجعة",
    journal: "دفتر اليومية",

    off: "المحاسبة غير مفعّلة",
    offHint: "يفعّل المالك الوحدة من إعدادات المحاسبة على الموقع.",
    noAccess: "الدفاتر ليست ضمن صلاحياتك",
    noAccessHint: "اطلب من مالك المنشأة صلاحية الاطلاع على المحاسبة.",
    empty: "لا قيود في هذه الفترة",
    emptyHint: "تظهر القيود مع اعتماد الأعمال وإصدار الفواتير وتحصيلها.",

    period: "الفترة",
    fiscalYear: "السنة المالية",
    scale: "الأرقام بـ",
    scales: {
      units: "ريال",
      thousands: "ألف",
      millions: "مليون",
    } as Record<string, string>,
    range: "{from} ← {to}",

    revenue: "الإيرادات",
    grossProfit: "مجمل الربح",
    netProfit: "صافي الربح",
    cash: "النقد",
    receivables: "الذمم المدينة",
    payables: "الذمم الدائنة",
    workingCapital: "رأس المال العامل",
    margin: "هامش {value}",
    overdue: "{value} تجاوزت ٦٠ يوماً",
    ratio: "التداول {ratio} · السريعة {quick}",
    cashHint: "في جميع البنوك والصناديق",
    ccc: "الدورة النقدية",
    cccHint: "{days} يوماً من صرف الريال حتى عودته",
    expensesTitle: "أين ذهب المال",
    recentTitle: "أحدث القيود",

    unbalanced: "الدفاتر غير متوازنة",
    unbalancedHint: "الأصول تختلف عن الخصوم وحقوق الملكية بمقدار {value}.",
    checksFailing: "فحوصات السلامة غير مجتازة",
    balanced: "متوازن",
    totalAssets: "إجمالي الأصول",
    totalLiabEquity: "الخصوم وحقوق الملكية",
    openingCash: "النقد الافتتاحي",
    closingCash: "النقد الختامي",
    netChange: "صافي التغير",

    account: "الحساب",
    debit: "مدين",
    credit: "دائن",
    movement: "الحركة",
    closing: "الرصيد الختامي",
    difference: "الفرق {value}",

    entryNumber: "قيد {number}",
    lines: "{count} سطور",
    kinds: {
      auto: "آلي",
      manual: "يدوي",
      opening: "افتتاحي",
    } as Record<string, string>,
    statuses: {
      draft: "مسودة",
      posted: "مرحّل",
      reversed: "معكوس",
    } as Record<string, string>,
    journalSearch: "ابحث في القيود…",
    postedOnly: "المسودات مستبعدة من جميع القوائم.",
    readOnly: "للاطلاع فقط على الجوال",
    readOnlyHint: "تسجيل القيود وإقفال الفترات وتعديل الإعدادات تبقى على الموقع.",
  },
};
