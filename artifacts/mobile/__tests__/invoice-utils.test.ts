// The mirrored invoice arithmetic — the numbers the finance tab shows must
// equal the website's to the halala.

import {
  calculateGrandTotal,
  calculateInvoiceTotal,
  calculateVat,
  isInvoiceOverdue,
  resolveInvoiceStatus,
} from "@/lib/invoice-utils";

const items = [
  { description: "باب", quantity: 4, unitPrice: 1180 },
  { description: "نقل", quantity: 1, unitPrice: 550 },
];
const net = 4 * 1180 + 550;

describe("invoice arithmetic", () => {
  it("sums line totals", () => {
    expect(calculateInvoiceTotal(items)).toBe(net);
  });

  it("rounds the 15% VAT line the way the website does", () => {
    expect(calculateVat(net)).toBe(Math.round(net * 0.15));
    expect(calculateGrandTotal(net)).toBe(net + Math.round(net * 0.15));
  });
});

describe("resolveInvoiceStatus", () => {
  it("promotes a past-due sent invoice to overdue at read time", () => {
    expect(resolveInvoiceStatus("2000-01-01", "sent")).toBe("overdue");
  });

  it("never promotes a paid or draft invoice", () => {
    expect(resolveInvoiceStatus("2000-01-01", "paid")).toBe("paid");
    expect(resolveInvoiceStatus("2000-01-01", "draft")).toBe("draft");
  });

  it("a future due date stays sent", () => {
    expect(resolveInvoiceStatus("2999-01-01", "sent")).toBe("sent");
    expect(isInvoiceOverdue("2999-01-01", "sent")).toBe(false);
  });
});
