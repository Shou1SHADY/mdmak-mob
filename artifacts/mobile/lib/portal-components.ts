// The module registry — mobile mirror of the website's src/lib/portal-components.ts.
//
// The website splits each portal into standalone modules (Gmail-style app
// switcher). This file keeps the SAME module ids, the same accent per module
// and the same permission on every nav item, so a module means the same thing
// and is visible to the same people in both apps.
//
// Three deliberate differences from the website's copy:
//
//  1. Icons are Feather names, not lucide components — that is the icon set this
//     app already ships.
//  2. Accents are colour-token KEYS resolved against constants/colors.ts at
//     render time, because there is no Tailwind here to resolve class strings.
//  3. Every item carries `built`. The website's registry can assume each href
//     exists; this app ports the MOBILE-APPROPRIATE subset, so an item with no
//     screen here carries the WEBSITE's path instead and the launcher opens it
//     there in one tap. Flip `built` to true in the same commit that adds the
//     screen — never before.
//
// Sales, Manufacturing and Accounting are desktop work (quotation templates,
// work-order routing, ledgers and statements) and stay web-only by design, not
// by omission: the launcher lists them under "More on the web app" so a member
// knows the company has them, gated by the same permissions as on the website.
//
// Routes here are expo-router paths for built items, website paths otherwise.
// CRM is one shared route group used by both roles, exactly as the website
// serves the same CRM pages to both portals over the same org-scoped
// collections.
//
// This is UI gating only. Real enforcement stays in firestore.rules.

import type { Feather } from "@expo/vector-icons";
import type { PermissionId } from "@/lib/permissions";

export type FeatherIcon = keyof typeof Feather.glyphMap;

export type PortalComponentId =
  | "project-management"
  | "procurement"
  | "warehouses"
  | "payments"
  | "hr"
  | "crm"
  | "sales"
  | "manufacturing"
  | "accounting"
  | "users";

/** Keys into the palette in constants/colors.ts, resolved by useColors(). */
export type AccentToken = "primary" | "secondary" | "accent" | "success" | "cta" | "warning" | "destructive";

export interface NavItem {
  /** Key into the `modules.items` i18n namespace. */
  titleKey: string;
  /** expo-router path when `built`; the website's path (opened in the browser) otherwise. */
  href: string;
  icon: FeatherIcon;
  requiredPermission?: PermissionId;
  /** False until the screen exists in this app. */
  built: boolean;
}

export interface PortalComponentDef {
  id: PortalComponentId;
  /** Keys into the `modules.labels` / `modules.descriptions` i18n namespaces. */
  labelKey: string;
  descKey: string;
  /** expo-router path of the module's home when any screen is built; the website's path otherwise. */
  homeHref: string;
  icon: FeatherIcon;
  accentToken: AccentToken;
  displayOrder: number;
  items: NavItem[];
}

// Reachable from every module, never permission-gated — everyone in an org can
// be talked to. Mirrors the website's CONTRACTOR/SUPPLIER_COMMUNICATION_SECTION.
export const CONTRACTOR_COMMUNICATION: NavItem[] = [
  { titleKey: "chats", href: "/(contractor)/chats", icon: "message-circle", built: true },
  { titleKey: "notifications", href: "/(contractor)/notifications", icon: "bell", built: true },
];

export const SUPPLIER_COMMUNICATION: NavItem[] = [
  { titleKey: "chats", href: "/(supplier)/chats", icon: "message-circle", built: true },
  { titleKey: "notifications", href: "/(supplier)/notifications", icon: "bell", built: true },
];

// The website's Sales module items, shared by the contractor's Sales module
// and the supplier's RFQ-facing Sales tile (where the website folds them in).
function salesItems(prefix: "/contractor" | "/supplier"): NavItem[] {
  return [
    { titleKey: "sales_dashboard", href: `${prefix}/sales`, icon: "grid", requiredPermission: "sales.manage", built: false },
    { titleKey: "sales_quotations", href: `${prefix}/sales/quotations`, icon: "file-text", requiredPermission: "sales.manage", built: false },
    { titleKey: "sales_orders", href: `${prefix}/sales/orders`, icon: "clipboard", requiredPermission: "sales.manage", built: false },
    { titleKey: "sales_fulfillment", href: `${prefix}/sales/fulfillment`, icon: "truck", requiredPermission: "sales.manage", built: false },
    { titleKey: "sales_payments", href: `${prefix}/sales/payments`, icon: "credit-card", requiredPermission: "sales.manage", built: false },
    { titleKey: "sales_price_list", href: `${prefix}/sales/price-list`, icon: "tag", requiredPermission: "sales.manage", built: false },
  ];
}

// Workshop and Today stay ungated, as on the website: stage assignees are
// plain members and must reach their tasks.
function manufacturingItems(prefix: "/contractor" | "/supplier"): NavItem[] {
  return [
    { titleKey: "mfg_workshop", href: `${prefix}/manufacturing`, icon: "tool", built: false },
    { titleKey: "mfg_today", href: `${prefix}/manufacturing/today`, icon: "calendar", built: false },
    { titleKey: "mfg_requests", href: `${prefix}/manufacturing/requests`, icon: "inbox", built: false },
    { titleKey: "mfg_estimates", href: `${prefix}/manufacturing/estimates`, icon: "percent", built: false },
    { titleKey: "mfg_products", href: `${prefix}/manufacturing/products`, icon: "layers", built: false },
    { titleKey: "mfg_settings", href: `${prefix}/manufacturing/settings`, icon: "sliders", requiredPermission: "manufacturing.manage", built: false },
  ];
}

function accountingItems(prefix: "/contractor" | "/supplier"): NavItem[] {
  return [
    { titleKey: "acc_dashboard", href: `${prefix}/accounting`, icon: "grid", requiredPermission: "accounting.view", built: false },
    { titleKey: "acc_locked", href: `${prefix}/accounting/locked`, icon: "lock", requiredPermission: "accounting.view", built: false },
    { titleKey: "acc_income", href: `${prefix}/accounting/income-statement`, icon: "trending-up", requiredPermission: "accounting.view", built: false },
    { titleKey: "acc_balance", href: `${prefix}/accounting/balance-sheet`, icon: "bar-chart-2", requiredPermission: "accounting.view", built: false },
    { titleKey: "acc_cashflow", href: `${prefix}/accounting/cash-flow`, icon: "dollar-sign", requiredPermission: "accounting.view", built: false },
    { titleKey: "acc_equity", href: `${prefix}/accounting/equity`, icon: "pie-chart", requiredPermission: "accounting.view", built: false },
    { titleKey: "acc_coa", href: `${prefix}/accounting/chart-of-accounts`, icon: "list", requiredPermission: "accounting.view", built: false },
    { titleKey: "acc_trial_balance", href: `${prefix}/accounting/trial-balance`, icon: "bar-chart-2", requiredPermission: "accounting.view", built: false },
    { titleKey: "acc_journal", href: `${prefix}/accounting/journal`, icon: "book-open", requiredPermission: "accounting.view", built: false },
    { titleKey: "acc_ledger", href: `${prefix}/accounting/ledger`, icon: "file-text", requiredPermission: "accounting.view", built: false },
    { titleKey: "acc_checks", href: `${prefix}/accounting/checks`, icon: "shield", requiredPermission: "accounting.view", built: false },
    { titleKey: "acc_periods", href: `${prefix}/accounting/periods`, icon: "clock", requiredPermission: "accounting.close", built: false },
    { titleKey: "acc_vat", href: `${prefix}/accounting/vat`, icon: "percent", requiredPermission: "accounting.view", built: false },
  ];
}

export const CONTRACTOR_COMPONENTS: PortalComponentDef[] = [
  {
    id: "crm",
    labelKey: "crm",
    descKey: "crm",
    homeHref: "/(crm)/dashboard",
    icon: "users",
    accentToken: "destructive",
    displayOrder: 1,
    items: [
      { titleKey: "crm_dashboard", href: "/(crm)/dashboard", icon: "pie-chart", requiredPermission: "crm.manage", built: true },
      { titleKey: "crm_leads", href: "/(crm)/leads", icon: "user-plus", requiredPermission: "crm.manage", built: true },
      { titleKey: "crm_opportunities", href: "/(crm)/opportunities", icon: "target", requiredPermission: "crm.manage", built: true },
      { titleKey: "crm_activities", href: "/(crm)/activities", icon: "clipboard", requiredPermission: "crm.manage", built: true },
    ],
  },
  {
    id: "project-management",
    labelKey: "project_management",
    descKey: "project_management",
    homeHref: "/(projects)",
    icon: "grid",
    accentToken: "primary",
    displayOrder: 2,
    items: [
      { titleKey: "dashboard", href: "/(contractor)/dashboard", icon: "grid", built: true },
      { titleKey: "projects", href: "/(projects)", icon: "folder", requiredPermission: "projects.view", built: true },
    ],
  },
  {
    id: "procurement",
    labelKey: "procurement",
    descKey: "procurement",
    homeHref: "/(contractor)/rfqs",
    icon: "shopping-bag",
    accentToken: "cta",
    displayOrder: 3,
    items: [
      { titleKey: "rfqs", href: "/(contractor)/rfqs", icon: "file-text", requiredPermission: "rfq.manage", built: true },
      { titleKey: "compare_offers", href: "/(contractor)/compare", icon: "bar-chart-2", requiredPermission: "offers.view", built: true },
      // The supplier directory (search, favourites, invitations) is a desktop
      // job; the phone's suppliers screen only ever redirected home.
      { titleKey: "browse_suppliers", href: "/contractor/suppliers", icon: "users", requiredPermission: "suppliers.manage", built: false },
      { titleKey: "goods_received", href: "/(goods)", icon: "package", requiredPermission: "deliveries.confirm", built: true },
    ],
  },
  {
    id: "warehouses",
    labelKey: "inventory",
    descKey: "inventory",
    homeHref: "/(inventory)",
    icon: "box",
    accentToken: "accent",
    displayOrder: 4,
    items: [
      { titleKey: "warehouses", href: "/(inventory)", icon: "home", requiredPermission: "warehouses.manage", built: true },
      { titleKey: "warehouse_requests", href: "/(inventory)/requests", icon: "clipboard", requiredPermission: "warehouses.manage", built: true },
      { titleKey: "waste", href: "/(inventory)/waste", icon: "trash-2", requiredPermission: "warehouses.manage", built: true },
    ],
  },
  {
    id: "payments",
    labelKey: "finance",
    descKey: "finance",
    homeHref: "/(finance)/invoices",
    icon: "credit-card",
    accentToken: "success",
    displayOrder: 5,
    items: [
      { titleKey: "invoices", href: "/(finance)/invoices", icon: "file", requiredPermission: "invoices.manage", built: true },
      { titleKey: "guarantees", href: "/(finance)/guarantees", icon: "shield", requiredPermission: "invoices.manage", built: true },
    ],
  },
  {
    id: "hr",
    labelKey: "hr",
    descKey: "hr",
    homeHref: "/(finance)/employees",
    icon: "briefcase",
    accentToken: "warning",
    displayOrder: 6,
    items: [
      { titleKey: "employees", href: "/(finance)/employees", icon: "briefcase", requiredPermission: "employees.manage", built: true },
    ],
  },
  {
    id: "users",
    labelKey: "governance",
    descKey: "governance",
    homeHref: "/(contractor)/profile",
    icon: "settings",
    accentToken: "secondary",
    displayOrder: 7,
    items: [
      { titleKey: "company_profile", href: "/(contractor)/profile", icon: "home", requiredPermission: "team.manage", built: true },
      { titleKey: "team", href: "/(contractor)/team", icon: "users", requiredPermission: "team.manage", built: true },
    ],
  },
  {
    id: "sales",
    labelKey: "sales",
    descKey: "sales",
    homeHref: "/contractor/sales",
    icon: "dollar-sign",
    accentToken: "cta",
    displayOrder: 8,
    items: salesItems("/contractor"),
  },
  {
    id: "manufacturing",
    labelKey: "manufacturing",
    descKey: "manufacturing",
    homeHref: "/contractor/manufacturing",
    icon: "tool",
    accentToken: "warning",
    displayOrder: 9,
    items: manufacturingItems("/contractor"),
  },
  {
    id: "accounting",
    labelKey: "accounting",
    descKey: "accounting",
    homeHref: "/contractor/accounting",
    icon: "book-open",
    accentToken: "primary",
    displayOrder: 10,
    items: accountingItems("/contractor"),
  },
];

// Same slots, same accents — Inventory/Finance/HR/CRM/Governance/Manufacturing/
// Accounting are identical concepts either way. Only the core-work and
// RFQ-facing modules differ by role, matching the website's split.
export const SUPPLIER_COMPONENTS: PortalComponentDef[] = [
  {
    id: "crm",
    labelKey: "crm",
    descKey: "crm_supplier",
    homeHref: "/(crm)/dashboard",
    icon: "users",
    accentToken: "destructive",
    displayOrder: 1,
    items: [
      { titleKey: "crm_dashboard", href: "/(crm)/dashboard", icon: "pie-chart", requiredPermission: "crm.manage", built: true },
      { titleKey: "crm_leads", href: "/(crm)/leads", icon: "user-plus", requiredPermission: "crm.manage", built: true },
      { titleKey: "crm_opportunities", href: "/(crm)/opportunities", icon: "target", requiredPermission: "crm.manage", built: true },
      { titleKey: "crm_activities", href: "/(crm)/activities", icon: "clipboard", requiredPermission: "crm.manage", built: true },
      { titleKey: "connections", href: "/(connections)", icon: "link", requiredPermission: "crm.manage", built: true },
    ],
  },
  {
    id: "project-management",
    labelKey: "order_management",
    descKey: "order_management",
    homeHref: "/(supplier)/dashboard",
    icon: "grid",
    accentToken: "primary",
    displayOrder: 2,
    items: [
      { titleKey: "dashboard", href: "/(supplier)/dashboard", icon: "grid", built: true },
      { titleKey: "orders", href: "/(supplier)/orders", icon: "clipboard", built: true },
    ],
  },
  {
    id: "procurement",
    labelKey: "supplier_sales",
    descKey: "supplier_sales",
    homeHref: "/(supplier)/rfqs",
    icon: "shopping-bag",
    accentToken: "cta",
    displayOrder: 3,
    items: [
      { titleKey: "browse_rfqs", href: "/(supplier)/rfqs", icon: "search", requiredPermission: "offers.view", built: true },
      { titleKey: "my_offers", href: "/(supplier)/offers", icon: "file-text", requiredPermission: "offers.view", built: true },
      // The supplier's own quotations and price list — the website folds the
      // Sales module into this tile rather than giving it a tile of its own.
      ...salesItems("/supplier"),
    ],
  },
  {
    id: "warehouses",
    labelKey: "inventory",
    descKey: "inventory",
    homeHref: "/(inventory)",
    icon: "box",
    accentToken: "accent",
    displayOrder: 4,
    items: [
      { titleKey: "warehouses", href: "/(inventory)", icon: "home", requiredPermission: "warehouses.manage", built: true },
      { titleKey: "waste", href: "/(inventory)/waste", icon: "trash-2", requiredPermission: "warehouses.manage", built: true },
    ],
  },
  {
    id: "payments",
    labelKey: "finance",
    descKey: "finance",
    homeHref: "/(finance)/invoices",
    icon: "credit-card",
    accentToken: "success",
    displayOrder: 5,
    items: [
      { titleKey: "invoices", href: "/(finance)/invoices", icon: "file", requiredPermission: "invoices.manage", built: true },
      { titleKey: "guarantees", href: "/(finance)/guarantees", icon: "shield", requiredPermission: "invoices.manage", built: true },
    ],
  },
  {
    id: "hr",
    labelKey: "hr",
    descKey: "hr",
    homeHref: "/(finance)/employees",
    icon: "briefcase",
    accentToken: "warning",
    displayOrder: 6,
    items: [
      { titleKey: "employees", href: "/(finance)/employees", icon: "briefcase", requiredPermission: "employees.manage", built: true },
    ],
  },
  {
    id: "users",
    labelKey: "governance",
    descKey: "governance",
    homeHref: "/(supplier)/profile",
    icon: "settings",
    accentToken: "secondary",
    displayOrder: 7,
    items: [
      { titleKey: "company_profile", href: "/(supplier)/profile", icon: "home", requiredPermission: "team.manage", built: true },
      { titleKey: "team", href: "/(supplier)/team", icon: "users", requiredPermission: "team.manage", built: true },
    ],
  },
  {
    id: "manufacturing",
    labelKey: "manufacturing",
    descKey: "manufacturing_supplier",
    homeHref: "/supplier/manufacturing",
    icon: "tool",
    accentToken: "warning",
    displayOrder: 8,
    items: manufacturingItems("/supplier"),
  },
  {
    id: "accounting",
    labelKey: "accounting",
    descKey: "accounting",
    homeHref: "/supplier/accounting",
    icon: "book-open",
    accentToken: "primary",
    displayOrder: 10,
    items: accountingItems("/supplier"),
  },
];

export function componentsForRole(role: string | undefined): PortalComponentDef[] {
  return role === "Supplier" ? SUPPLIER_COMPONENTS : CONTRACTOR_COMPONENTS;
}

export function communicationForRole(role: string | undefined): NavItem[] {
  return role === "Supplier" ? SUPPLIER_COMMUNICATION : CONTRACTOR_COMMUNICATION;
}

// ---------------------------------------------------------------------------
// Permission-aware views — same shape and same names as the website's, so the
// two registries stay comparable when either changes.
// ---------------------------------------------------------------------------

export type PermissionCheck = (permission: PermissionId) => boolean;

function itemIsVisible(item: NavItem, can: PermissionCheck): boolean {
  return !item.requiredPermission || can(item.requiredPermission);
}

/** Items the caller may see. Unbuilt items are KEPT — they open on the website,
 * which is how the app says "this lives on the web for now" rather than
 * pretending the feature does not exist. */
export function visibleItems(items: NavItem[], can: PermissionCheck): NavItem[] {
  return items.filter((item) => itemIsVisible(item, can));
}

/** A module is worth showing only if the member can open something inside it. */
export function isComponentVisible(component: PortalComponentDef, can: PermissionCheck): boolean {
  return visibleItems(component.items, can).length > 0;
}

/** The modules a member may see, in presentation order. */
export function visibleComponents(
  components: PortalComponentDef[],
  can: PermissionCheck
): PortalComponentDef[] {
  return components
    .filter((component) => isComponentVisible(component, can))
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/** True when a module has at least one screen that actually exists here. */
export function hasBuiltScreens(component: PortalComponentDef, can: PermissionCheck): boolean {
  return visibleItems(component.items, can).some((item) => item.built);
}
