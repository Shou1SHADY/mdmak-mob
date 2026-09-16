// The project, as the site sees it — the BOQ you measure against, the claims
// the measurements become, the requests waiting on a decision, and who is
// seated on the job.
//
// This is the vocabulary of a person standing on the work, not reading about
// it: "executed" is what has actually been built, "this claim" is what is being
// asked for now, and a rejected request says so plainly.

export const en = {
  site: {
    boq: "Bill of quantities",
    claims: "Payment claims",
    requests: "Purchase requests",
    team: "On this project",

    // BOQ and measurement
    boqSearch: "Search items…",
    contracted: "Contracted",
    executed: "Executed",
    remaining: "Remaining",
    progress: "{value} complete",
    locked: "In a tender",
    lockedHint: "Drawn into a tender — the line is fixed, but work on site still counts.",
    noBoq: "No items in the bill",
    noBoqHint: "The bill is built on the website, then measured here.",

    measure: "Record measurement",
    measureFor: "Measured on {item}",
    quantityDone: "Quantity completed",
    measuredAt: "Measured on",
    note: "Note",
    noteHint: "What was measured, and where.",
    measureSave: "Record",
    measureDone: "Measurement recorded",
    overrun: "This takes the executed quantity past the contracted {contracted} {unit}.",
    overrunHint: "Recorded anyway — an overrun is a fact, and the claim will show it.",
    correction: "A correction is a negative quantity.",
    history: "{count} measurements",
    unclaimed: "{value} not yet claimed",

    // Claims
    claimNumber: "Claim {number}",
    gross: "Gross",
    retention: "Retention",
    advance: "Advance recovery",
    vat: "VAT",
    net: "Net payable",
    markCollected: "Mark collected",
    collected: "Collected",
    submitted: "Submitted",
    collectedDone: "Claim marked collected",
    noClaims: "No claims yet",
    noClaimsHint: "A claim is raised from unclaimed measurements on the website.",
    claimImmutable: "A submitted claim cannot be edited — only collected.",

    // Purchase requests
    approve: "Approve",
    reject: "Reject",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    decidedBy: "By {name}",
    decided: "Decision recorded",
    noRequests: "No purchase requests",
    noRequestsHint: "Anyone on the project can raise one; the warehouse decides.",
    routedToPlant: "Routed to manufacturing",

    // Team
    noMembers: "No one is seated on this project",
    noMembersHint: "Members get their default permissions until they are seated here.",
    seatedAs: "Seated as {group}",
    defaultGroup: "Their usual group",
    viaHandover: "Seated by the deal handover",

    // Shared
    cannotAct: "Your role on this project does not include this",
    saving: "Saving…",
    failed: "That did not save. Try again.",
  },
};

export const ar = {
  site: {
    boq: "جدول الكميات",
    claims: "المستخلصات",
    requests: "طلبات الشراء",
    team: "فريق المشروع",

    boqSearch: "ابحث في البنود…",
    contracted: "المتعاقد عليه",
    executed: "المنفَّذ",
    remaining: "المتبقي",
    progress: "أُنجز {value}",
    locked: "ضمن منافسة",
    lockedHint: "مسحوب إلى منافسة — البند ثابت، لكن العمل في الموقع ما زال يُحتسب.",
    noBoq: "لا بنود في الجدول",
    noBoqHint: "يُبنى الجدول على الموقع، ثم يُقاس من هنا.",

    measure: "تسجيل قياس",
    measureFor: "قياس على {item}",
    quantityDone: "الكمية المنفَّذة",
    measuredAt: "تاريخ القياس",
    note: "ملاحظة",
    noteHint: "ما الذي قيس، وأين.",
    measureSave: "تسجيل",
    measureDone: "سُجّل القياس",
    overrun: "هذا يتجاوز الكمية المتعاقد عليها {contracted} {unit}.",
    overrunHint: "سُجّل على أي حال — التجاوز واقعة، وسيظهر في المستخلص.",
    correction: "التصحيح يكون بكمية سالبة.",
    history: "{count} قياسات",
    unclaimed: "{value} لم تُستخلص بعد",

    claimNumber: "مستخلص {number}",
    gross: "الإجمالي",
    retention: "المحتجز",
    advance: "استرداد الدفعة المقدمة",
    vat: "ضريبة القيمة المضافة",
    net: "الصافي المستحق",
    markCollected: "تحديد كمحصَّل",
    collected: "محصَّل",
    submitted: "مقدَّم",
    collectedDone: "حُدّد المستخلص كمحصَّل",
    noClaims: "لا مستخلصات بعد",
    noClaimsHint: "يُرفع المستخلص من القياسات غير المستخلصة على الموقع.",
    claimImmutable: "المستخلص المقدَّم لا يُعدّل — يُحصَّل فقط.",

    approve: "اعتماد",
    reject: "رفض",
    pending: "قيد الانتظار",
    approved: "معتمد",
    rejected: "مرفوض",
    decidedBy: "بواسطة {name}",
    decided: "سُجّل القرار",
    noRequests: "لا طلبات شراء",
    noRequestsHint: "يرفع الطلب أي فرد في المشروع، ويقرّر المستودع.",
    routedToPlant: "أُحيل إلى التصنيع",

    noMembers: "لا أحد معيَّن على هذا المشروع",
    noMembersHint: "يعمل الأعضاء بصلاحياتهم الافتراضية حتى يُعيَّنوا هنا.",
    seatedAs: "معيَّن بصفة {group}",
    defaultGroup: "مجموعته المعتادة",
    viaHandover: "عُيّن عبر تسليم الصفقة",

    cannotAct: "دورك في هذا المشروع لا يشمل ذلك",
    saving: "جارٍ الحفظ…",
    failed: "لم يُحفظ. حاول مرة أخرى.",
  },
};
