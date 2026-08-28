/**
 * Design-preview mode.
 *
 * Renders the real module screens against fixture data with no sign-in, so the
 * UI can be reviewed — light and dark, Arabic and English, at a phone width —
 * without a live account or production records. Reached from `/design-preview`.
 *
 * How it stays out of the way of the real app:
 *
 *  - It is OFF unless something explicitly turns it on. The flag lives in
 *    sessionStorage, so it dies with the tab and can never be the state a real
 *    user lands in.
 *  - It is WEB ONLY. `isPreview()` returns false on a device, so a native build
 *    cannot enter it even by accident.
 *  - Every consumer is a single guarded early-return at the top of a hook. No
 *    production code path changes shape.
 *
 * The fixtures deliberately include the cases that break layouts rather than
 * tidy ones: long Arabic company names, eight-figure values, missing optional
 * fields, overdue dates, and empty collections.
 */
import { Platform } from "react-native";
import type { CrmActivity, CrmContact, CrmOpportunity } from "@/lib/crm";
import type { AppUser } from "@/context/AuthContext";

const KEY = "mdmak.designPreview";

export function isPreview(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    // Private mode / blocked storage — treat as off rather than throwing.
    return false;
  }
}

export function setPreview(on: boolean): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    if (on) window.sessionStorage.setItem(KEY, "1");
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** The signed-in user the preview pretends to be: an owner, so every module is visible. */
export const PREVIEW_USER: AppUser = {
  uid: "preview-user",
  email: "preview@mdmaktech.sa",
  displayName: "سعود العتيبي",
  role: "Contractor",
  organizationId: "preview-user",
  organizationRole: "owner",
  defaultGroupId: null,
  orgName: "شركة مدماك للمقاولات العامة المحدودة",
  phone: "0555000111",
  city: "الرياض",
  emailVerified: true,
  profileCompleted: true,
};

const iso = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86_400_000).toISOString().slice(0, 10);

export const PREVIEW_CONTACTS: CrmContact[] = [
  {
    id: "c1",
    // Long enough to force truncation on a 390px row.
    name: "شركة الراجحي للمقاولات والاستثمار العقاري",
    type: "client",
    company: "مجموعة الراجحي القابضة",
    phone: "0551234567",
    city: "الرياض",
    status: "qualified",
    source: "referral",
    tier: "A",
    roles: ["client"],
    organizationId: "preview-user",
  },
  {
    id: "c2",
    name: "Nesma Trading Co.",
    type: "client",
    company: "Nesma Holding",
    phone: "0509876543",
    city: "جدة",
    status: "proposal",
    source: "website",
    tier: "B",
    roles: ["client", "main_contractor"],
    organizationId: "preview-user",
  },
  {
    // Sparse on purpose: no company, no city, no tier, no phone.
    id: "c3",
    name: "مؤسسة البناء الحديث",
    type: "supplier",
    status: "new",
    organizationId: "preview-user",
  },
  {
    id: "c4",
    name: "Al Fanar Construction",
    type: "partner",
    company: "Al Fanar Group",
    city: "الدمام",
    phone: "0533221100",
    status: "won",
    tier: "A",
    organizationId: "preview-user",
  },
];

export const PREVIEW_OPPORTUNITIES: CrmOpportunity[] = [
  {
    id: "o1",
    contactId: "c1",
    contactName: "شركة الراجحي للمقاولات والاستثمار العقاري",
    title: "توريد وتركيب حديد التسليح — مشروع أبراج الياسمين السكنية",
    stage: "proposal",
    state: "open",
    track: "tender",
    // Eight figures: the widest a value line ever gets.
    value: 12_450_000,
    probability: 60,
    expectedCloseDate: iso(12),
    completedGates: [],
    stageHistory: [
      { event: "new", at: new Date(Date.now() - 30 * 86400000).toISOString(), byName: "سعود" },
      { event: "qualified", at: new Date(Date.now() - 12 * 86400000).toISOString(), byName: "سعود" },
    ],
    organizationId: "preview-user",
  },
  {
    id: "o2",
    contactId: "c2",
    contactName: "Nesma Trading Co.",
    title: "Ready-mix concrete supply agreement",
    stage: "negotiation",
    state: "open",
    track: "quotation",
    value: 860_000,
    probability: 75,
    // Already past: exercises the overdue treatment.
    expectedCloseDate: iso(-4),
    completedGates: [],
    organizationId: "preview-user",
  },
  {
    id: "o3",
    contactId: "c3",
    contactName: "مؤسسة البناء الحديث",
    title: "عقد صيانة سنوي",
    stage: "new",
    state: "open",
    track: "renewal",
    value: 0,
    organizationId: "preview-user",
  },
  {
    id: "o4",
    contactId: "c4",
    contactName: "Al Fanar Construction",
    title: "MEP subcontract — Phase 2",
    stage: "won",
    state: "won",
    track: "tender",
    value: 3_200_000,
    organizationId: "preview-user",
  },
];

export const PREVIEW_ACTIVITIES: CrmActivity[] = [
  {
    id: "a1",
    type: "call",
    title: "متابعة عرض السعر مع المهندس خالد",
    contactId: "c1",
    contactName: "شركة الراجحي للمقاولات والاستثمار العقاري",
    opportunityId: "o1",
    opportunityTitle: "توريد وتركيب حديد التسليح",
    dueDate: iso(-3),
    done: false,
    organizationId: "preview-user",
  },
  {
    id: "a2",
    type: "site_visit",
    title: "Site inspection — Jeddah warehouse",
    contactId: "c2",
    contactName: "Nesma Trading Co.",
    dueDate: iso(0),
    done: false,
    organizationId: "preview-user",
  },
  {
    id: "a3",
    type: "meeting",
    title: "Contract review",
    contactId: "c2",
    contactName: "Nesma Trading Co.",
    dueDate: iso(5),
    done: false,
    organizationId: "preview-user",
  },
  {
    id: "a4",
    type: "task",
    title: "إرسال الملف الفني",
    contactId: "c3",
    contactName: "مؤسسة البناء الحديث",
    // No due date: exercises the "no date" bucket.
    done: true,
    organizationId: "preview-user",
  },
];

export const PREVIEW_PROJECTS = [
  {
    id: "p1",
    organizationId: "preview-user",
    name: "أبراج الياسمين السكنية — المرحلة الثانية",
    clientName: "شركة الراجحي للمقاولات",
    location: "الرياض",
    budget: 48_000_000,
    status: "working",
    rfqIds: ["r1", "r2", "r3"],
    description: "تنفيذ الأعمال الإنشائية والتشطيبات لثلاثة أبراج سكنية.",
  },
  {
    id: "p2",
    organizationId: "preview-user",
    name: "Jeddah Logistics Hub",
    clientName: "Nesma Holding",
    location: "جدة",
    budget: 15_500_000,
    status: "pricing",
    rfqIds: [],
  },
  {
    id: "p3",
    organizationId: "preview-user",
    name: "مستودع الدمام",
    status: "hold",
    rfqIds: [],
    handover: { status: "pending", pmId: "x", pmName: "أحمد" },
  },
];

export const PREVIEW_BOQ = [
  { id: "b1", itemNo: "1.1", descriptionAr: "حديد تسليح قطر 16مم", descriptionEn: "Rebar 16mm", unit: "طن", quantity: 120, unitPrice: 2800, isEditable: false, drawnQuantity: 120 },
  { id: "b2", itemNo: "1.2", descriptionAr: "خرسانة جاهزة", descriptionEn: "Ready-mix concrete", unit: "م³", quantity: 850, unitPrice: 240, isEditable: true },
  { id: "b3", itemNo: "2.1", descriptionAr: "بلوك أسمنتي", descriptionEn: "Concrete block", unit: "م²", quantity: 3400, unitPrice: 38, isEditable: true },
];

export const PREVIEW_WAREHOUSES = [
  { id: "w1", name: "المستودع المركزي", location: "الرياض", organizationId: "preview-user", isCentral: true },
  { id: "w2", name: "مستودع مشروع الياسمين", location: "الرياض", organizationId: "preview-user", projectId: "p1", projectName: "أبراج الياسمين" },
];

export const PREVIEW_INVENTORY = [
  { id: "i1", name: "حديد تسليح 16مم", unit: "طن", quantity: 42, minQuantity: 50, organizationId: "preview-user" },
  { id: "i2", name: "أسمنت بورتلاندي", unit: "كيس", quantity: 1200, organizationId: "preview-user" },
  { id: "i3", name: "بلاط رخام — قطع مرقمة", unit: "قطعة", quantity: 88, trackingMode: "unit" as const, organizationId: "preview-user" },
];

export const PREVIEW_REQUESTS = [
  { id: "q1", requestNumber: "WR-K7M2PX", organizationId: "preview-user", itemId: "i1", itemName: "حديد تسليح 16مم", unit: "طن", quantity: 12, fromWarehouseId: "w1", toWarehouseId: "w2", toProjectName: "أبراج الياسمين", status: "pending" as const, requestedByUserId: "u", requestedByName: "م. خالد" },
  { id: "q2", requestNumber: "WR-B3N8QT", organizationId: "preview-user", itemId: "i2", itemName: "أسمنت بورتلاندي", unit: "كيس", quantity: 300, releasedQuantity: 280, fromWarehouseId: "w1", toWarehouseId: "w2", status: "released" as const, requestedByUserId: "u", requestedByName: "م. سارة" },
  { id: "q3", requestNumber: "WR-R9L4WD", organizationId: "preview-user", itemId: "i3", itemName: "بلاط رخام", unit: "قطعة", quantity: 20, fromWarehouseId: "w1", toWarehouseId: "w2", status: "received" as const, requestedByUserId: "u", requestedByName: "م. خالد" },
];

export const PREVIEW_INVOICES = [
  { id: "n1", invoiceNumber: "INV-2026-0041", status: "overdue", clientName: "شركة الراجحي للمقاولات", issueDate: iso(-60), dueDate: iso(-10), vatPercent: 15, items: [{ description: "دفعة أولى", quantity: 1, unitPrice: 1_250_000 }], organizationId: "preview-user" },
  { id: "n2", invoiceNumber: "INV-2026-0042", status: "sent", clientName: "Nesma Trading Co.", issueDate: iso(-14), dueDate: iso(16), vatPercent: 15, items: [{ description: "Concrete supply", quantity: 1, unitPrice: 340_000 }], organizationId: "preview-user" },
  { id: "n3", invoiceNumber: "INV-2026-0043", status: "paid", clientName: "Al Fanar Construction", issueDate: iso(-90), dueDate: iso(-60), vatPercent: 15, items: [{ description: "MEP phase 1", quantity: 1, unitPrice: 780_000 }], organizationId: "preview-user" },
];

export const PREVIEW_GUARANTEES = [
  { id: "g1", status: "pending_review", hasGuarantee: true, expirationDate: iso(18), rfqTitle: "توريد حديد التسليح — أبراج الياسمين", supplierName: "مصنع الحديد السعودي", contractorOrgId: "preview-user" },
  { id: "g2", status: "accepted", hasGuarantee: true, expirationDate: iso(210), rfqTitle: "Ready-mix concrete supply", supplierName: "Saudi Readymix", contractorOrgId: "preview-user" },
];

export const PREVIEW_EMPLOYEES = [
  { id: "e1", name: "م. خالد بن عبدالعزيز الشمري", role: "مدير مشاريع", salary: 28_000, organizationId: "preview-user" },
  { id: "e2", name: "Sarah Al-Otaibi", role: "Procurement Lead", salary: 19_500, organizationId: "preview-user" },
  { id: "e3", name: "م. فهد القحطاني", role: "مهندس موقع", salary: 14_000, organizationId: "preview-user" },
];

export const PREVIEW_DELIVERIES = [
  { id: "d1", contractorOrgId: "preview-user", supplierName: "مصنع الحديد السعودي", rfqTitle: "توريد حديد التسليح — أبراج الياسمين السكنية المرحلة الثانية", status: "pending", items: [{ name: "حديد تسليح 16مم", quantity: 40, unitOfMeasure: "طن" }, { name: "حديد تسليح 12مم", quantity: 25, unitOfMeasure: "طن" }] },
  { id: "d2", contractorOrgId: "preview-user", supplierName: "Saudi Readymix", rfqTitle: "Ready-mix concrete", status: "confirmed", items: [{ name: "Concrete C35", quantity: 300, unitOfMeasure: "m3" }] },
];

export const PREVIEW_LINKS = [
  { id: "l1", contractorOrgId: "org-a", supplierOrgId: "preview-user", contractorName: "شركة الراجحي للمقاولات", status: "active" },
];
