// The team room, and the two decisions that were waiting on a desk.
//
// One channel per organization: not a thread, not a DM, the place where the
// whole company talks. The vocabulary stays plain because the room is for
// everybody in the org, not only the people who know the system's words.

export const en = {
  room: {
    title: "Team room",
    subtitle: "Everyone at {org}",
    placeholder: "Message your team…",
    send: "Send",
    empty: "Nothing said yet",
    emptyHint: "This is the whole organization's room. Say hello.",
    today: "Today",
    yesterday: "Yesterday",
    you: "You",
    failed: "That did not send. Try again.",
    sending: "Sending…",
    /** A message is written once and stays written. */
    permanent: "Messages cannot be edited or deleted.",
    unread: "{count} new",
  },

  guarantee: {
    review: "Review",
    accept: "Accept",
    reject: "Reject",
    accepted: "Accepted",
    rejected: "Rejected",
    pending: "Awaiting your review",
    none: "No guarantee",
    expired: "Expired",
    expiringSoon: "Expires in {days} days",
    openFile: "Open the guarantee",
    noFile: "No file attached",
    confirmAccept: "Accept this guarantee?",
    confirmReject: "Reject this guarantee?",
    reviewDone: "Recorded",
    reviewFailed: "That did not save. Try again.",
    cannotReview: "Reviewing guarantees is not part of your role",
    onceAccepted: "An accepted guarantee is final — the supplier can no longer change it.",
    item: "For {item}",
  },
};

export const ar = {
  room: {
    title: "غرفة الفريق",
    subtitle: "جميع من في {org}",
    placeholder: "اكتب رسالة لفريقك…",
    send: "إرسال",
    empty: "لا رسائل بعد",
    emptyHint: "هذه غرفة المنشأة كاملة. ابدأ بالتحية.",
    today: "اليوم",
    yesterday: "أمس",
    you: "أنت",
    failed: "لم تُرسل. حاول مرة أخرى.",
    sending: "جارٍ الإرسال…",
    permanent: "لا يمكن تعديل الرسائل أو حذفها.",
    unread: "{count} جديدة",
  },

  guarantee: {
    review: "مراجعة",
    accept: "قبول",
    reject: "رفض",
    accepted: "مقبول",
    rejected: "مرفوض",
    pending: "بانتظار مراجعتك",
    none: "لا ضمان",
    expired: "منتهٍ",
    expiringSoon: "ينتهي خلال {days} أيام",
    openFile: "فتح الضمان",
    noFile: "لا ملف مرفق",
    confirmAccept: "قبول هذا الضمان؟",
    confirmReject: "رفض هذا الضمان؟",
    reviewDone: "سُجّل",
    reviewFailed: "لم يُحفظ. حاول مرة أخرى.",
    cannotReview: "مراجعة الضمانات ليست ضمن صلاحياتك",
    onceAccepted: "الضمان المقبول نهائي — لم يعد بإمكان المورّد تغييره.",
    item: "عن {item}",
  },
};
