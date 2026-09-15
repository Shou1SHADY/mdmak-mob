// The mirrored Sales layer, exercised through the mobile copy — the same
// derivations the website's 1,300-test suite covers, pinned here so the
// mirror itself is what runs on the phone.

import { INSTALLMENT_DEPOSIT_ID } from "@/lib/crm";
import { installmentStates } from "@/lib/sales-installments";
import { orderGross, type SalesOrder } from "@/lib/sales-orders";
import {
  QUOTE_DECLINE_REASONS,
  installmentNoticeState,
  reportableInstallments,
  shouldReleaseOrder,
  validateTransferReport,
  type TransferNotice,
} from "@/lib/sales-transfers";
import { componentsForRole } from "@/lib/portal-components";

const quotation = {
  amount: 12000,
  installments: [
    { id: INSTALLMENT_DEPOSIT_ID, label: "دفعة مقدمة", percent: 30 },
    { id: "balance", label: "الباقي", percent: 70 },
  ],
  payments: null,
};

const notice = (over: Partial<TransferNotice>): TransferNotice =>
  ({
    id: "n1",
    organizationId: "o",
    noticeNumber: "TN-AAAAAA",
    quotationId: "q1",
    quotationNumber: "QT-1",
    installmentId: INSTALLMENT_DEPOSIT_ID,
    installmentLabel: "دفعة مقدمة",
    contactId: "c1",
    amountStated: 3600,
    transferDate: "2026-09-15",
    status: "reported",
    reportedAt: "2026-09-15T10:00:00.000Z",
    createdByUserId: "u1",
    createdByUserName: "ريم",
    ...over,
  }) as TransferNotice;

describe("the notice ladder on the phone", () => {
  const states = installmentStates(quotation);

  it("walks not_reported → awaiting_finance → not_found → reportable again", () => {
    expect(installmentNoticeState(states[0], [])).toBe("not_reported");
    expect(installmentNoticeState(states[0], [notice({})])).toBe("awaiting_finance");
    expect(installmentNoticeState(states[0], [notice({ status: "not_found" })])).toBe("not_found");
    expect(reportableInstallments(states, [notice({ status: "not_found" })]).map((s) => s.id)).toEqual([
      INSTALLMENT_DEPOSIT_ID,
    ]);
  });

  it("only the next unreported instalment carries the button", () => {
    expect(reportableInstallments(states, []).map((s) => s.id)).toEqual([INSTALLMENT_DEPOSIT_ID]);
    expect(reportableInstallments(states, [notice({})])).toEqual([]);
  });

  it("refuses bad amounts and future dates before anything is written", () => {
    const today = "2026-09-15";
    expect(validateTransferReport({ amount: 0, transferDate: today, today })).toBe("bad_amount");
    expect(validateTransferReport({ amount: 100, transferDate: "2030-01-01", today })).toBe("future_date");
    expect(validateTransferReport({ amount: 100, transferDate: today, today })).toBeNull();
  });

  it("releases only a deposit-gated order, only on its deposit", () => {
    const order = {
      status: "awaiting_deposit",
      payment: { kind: "deposit", depositPercent: 30, depositPaid: false },
    } as SalesOrder;
    expect(shouldReleaseOrder(order, INSTALLMENT_DEPOSIT_ID)).toBe(true);
    expect(shouldReleaseOrder(order, "balance")).toBe(false);
    expect(shouldReleaseOrder({ ...order, status: "running" } as SalesOrder, INSTALLMENT_DEPOSIT_ID)).toBe(false);
  });
});

describe("order money through the mirror", () => {
  it("gross = net + VAT, the website's rounding", () => {
    const order = {
      type: "standard",
      vatPercent: 15,
      lines: [{ name: "درابزين", unit: "متر", quantity: 40, unitPrice: 300, unitCost: null }],
    } as SalesOrder;
    expect(orderGross(order)).toBe(12000 + 1800);
  });
});

describe("the module registry", () => {
  it("Sales is on the phone for both roles: quotations, orders, payments", () => {
    for (const role of ["Contractor", "Supplier"]) {
      const components = componentsForRole(role);
      const items = components.flatMap((c) => c.items);
      for (const key of ["sales_quotations", "sales_orders", "sales_payments"]) {
        const item = items.find((i) => i.titleKey === key);
        expect(item?.built).toBe(true);
        expect(item?.href.startsWith("/(sales)/")).toBe(true);
      }
      // The composer stays a desk job.
      expect(items.find((i) => i.titleKey === "sales_fulfillment")?.built).toBe(false);
    }
  });

  it("declining offers exactly the five factual reasons", () => {
    expect(QUOTE_DECLINE_REASONS).toEqual(["not_in_line", "capacity", "spec", "bought_in", "closed_in_crm"]);
  });
});
