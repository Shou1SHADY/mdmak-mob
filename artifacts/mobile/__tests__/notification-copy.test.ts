// A notification reads in the READER's language: the website writes keys
// (`i18n: { title, message, params }`) next to text in the sender's language,
// and the app renders the keys from its generated copy of the website's
// messages. These pin the ICU subset the formatter handles (arguments, select,
// plural with `=n` and `#`, Arabic plural categories) and the fallbacks.

import { formatMessage, notificationText, pluralCategory } from "@/lib/notification-copy";

describe("pluralCategory", () => {
  it("follows CLDR for Arabic", () => {
    expect([0, 1, 2, 3, 10, 11, 99, 100, 102, 103, 111].map((n) => pluralCategory(n, "ar"))).toEqual([
      "zero", "one", "two", "few", "few", "many", "many", "other", "other", "few", "many",
    ]);
  });
  it("has two forms in English", () => {
    expect([0, 1, 2].map((n) => pluralCategory(n, "en"))).toEqual(["other", "one", "other"]);
  });
});

describe("formatMessage", () => {
  const plural = "{count, plural, =0 {no order slips} one {# order now late} other {# orders now late}}";
  it("fills arguments and leaves an absent one empty", () => {
    expect(formatMessage("Request {number}: {reason}", { number: "QR-7", reason: null }, "en")).toBe("Request QR-7: ");
  });
  it("prefers an exact =n branch, then the category, and replaces #", () => {
    expect(formatMessage(plural, { count: 0 }, "en")).toBe("no order slips");
    expect(formatMessage(plural, { count: 1 }, "en")).toBe("1 order now late");
    expect(formatMessage(plural, { count: 4 }, "en")).toBe("4 orders now late");
  });
  it("picks a select branch, falls back to other, and formats nested arguments", () => {
    const p = "{kind, select, cancel {cancel the order} other {change the quantity to {qty} {unit}}}";
    expect(formatMessage(p, { kind: "cancel" }, "en")).toBe("cancel the order");
    expect(formatMessage(p, { kind: "quantity", qty: 12, unit: "m²" }, "en")).toBe("change the quantity to 12 m²");
  });
});

describe("notificationText", () => {
  const declined = {
    title: "تعذّر تسعير طلبك", // written by an Arabic-speaking seller
    message: "أعادت المبيعات الطلب QR-7: الطاقة لا تكفي",
    i18n: {
      title: "sales_rq_notif_declined_title",
      message: "sales_rq_notif_declined_msg",
      params: { number: "QR-7", reason: "@sales_rq_reason_capacity" },
    },
  };
  it("renders the keys in the reader's language, resolving an @key param", () => {
    expect(notificationText(declined, "en")).toEqual({
      title: "Your quote request could not be priced",
      message: "Sales returned request QR-7: Capacity cannot meet the quantity by the date",
    });
    expect(notificationText(declined, "ar").message).toBe("أعادت المبيعات الطلب QR-7: الطاقة لا تكفي الكمية قبل الموعد المطلوب");
  });
  it("falls back to the stored text when the keys are unknown here or absent", () => {
    expect(notificationText({ ...declined, i18n: { title: "no_such_key" } }, "en")).toEqual({ title: declined.title, message: declined.message });
    expect(notificationText({ title: "Hello", body: "From an older writer" }, "en")).toEqual({ title: "Hello", message: "From an older writer" });
  });
});
