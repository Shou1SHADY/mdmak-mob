// i18n — home: the phone's start screen (Today) for both portals.
//
// Both languages live side by side so a string is never added to one without
// the other, and `ar` is typed from `en`: a key missing from either side, or
// present in only one, fails the typecheck. Add new strings for this module
// HERE, never in en.ts / ar.ts, which only assemble the modules.

export const en = {
  home: {
    morning: "Good morning",
    evening: "Good evening",
    needsYou: "Needs you",
    allClear: "All clear",
    allClearDesc: "Nothing is waiting on you right now.",
    showMore: "Show {n} more",
    showLess: "Show less",
    yourModules: "Your modules",
    moreOnWeb: "More on the web app",
    moreOnWebDesc: "Desk work opens in the browser",
    onWeb: "Opens on the web",
    loadFailed: "Couldn't load today's items",
    // contractor decisions
    rfqClosing: "«{title}» closes in {hours} h",
    rfqOverdue: "«{title}» has passed its deadline",
    deliveryConfirm: "Confirm delivery: {title}",
    deliveryFrom: "From {supplier}",
    offersToReview: "{count} offer(s) waiting on «{title}»",
    poApprove: "Approve purchase order {number}",
    poApproveFor: "Supplier: {supplier}",
    rfqNoOffers: "«{title}» has no offers after {days} days",
    // supplier decisions
    poToAccept: "Purchase order {number} is waiting for your acceptance",
    waitingDays: "Waiting {days} day(s)",
    rfqToAnswer: "«{title}» has no offer from you yet",
    closesToday: "Closes today",
    closesIn: "Closes in {days} day(s)",
    // KPIs
    kpiOpenRfqs: "Open RFQs",
    kpiOffersToReview: "Offers to decide",
    kpiDeliveries: "Deliveries to confirm",
    kpiUnanswered: "RFQs to answer",
    kpiOrdersToAccept: "Orders to accept",
    kpiPendingOffers: "Offers under review",
  },
};

export const ar: typeof en = {
  home: {
    morning: "صباح الخير",
    evening: "مساء الخير",
    needsYou: "بانتظارك",
    allClear: "لا شيء بانتظارك",
    allClearDesc: "لا توجد مهام تنتظر قرارك الآن.",
    showMore: "عرض {n} أخرى",
    showLess: "عرض أقل",
    yourModules: "وحداتك",
    moreOnWeb: "المزيد على نسخة الويب",
    moreOnWebDesc: "أعمال المكتب تُفتح في المتصفح",
    onWeb: "يُفتح على الويب",
    loadFailed: "تعذّر تحميل مهام اليوم",
    rfqClosing: "«{title}» يُغلق خلال {hours} ساعة",
    rfqOverdue: "«{title}» تجاوز موعده النهائي",
    deliveryConfirm: "أكّد الاستلام: {title}",
    deliveryFrom: "من {supplier}",
    offersToReview: "{count} عرض بانتظار قرارك على «{title}»",
    poApprove: "اعتمد أمر الشراء {number}",
    poApproveFor: "المورد: {supplier}",
    rfqNoOffers: "«{title}» بلا عروض منذ {days} يوم",
    poToAccept: "أمر الشراء {number} بانتظار قبولك",
    waitingDays: "بانتظارك منذ {days} يوم",
    rfqToAnswer: "«{title}» لم تقدّم عليه عرضاً بعد",
    closesToday: "يُغلق اليوم",
    closesIn: "يُغلق خلال {days} يوم",
    kpiOpenRfqs: "طلبات مفتوحة",
    kpiOffersToReview: "عروض للقرار",
    kpiDeliveries: "استلامات للتأكيد",
    kpiUnanswered: "طلبات لم تُجب",
    kpiOrdersToAccept: "أوامر للقبول",
    kpiPendingOffers: "عروض قيد المراجعة",
  },
};
