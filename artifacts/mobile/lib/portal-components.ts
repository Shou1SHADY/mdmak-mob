// The module registry — mobile mirror of the website's src/lib/portal-components.ts.
//
// The website splits each portal into standalone modules (Gmail-style app
// switcher). This file keeps the SAME seven module ids, the same accent per
// module and the same permission on every nav item, so a module means the same
// thing and is visible to the same people in both apps.
//
// Three deliberate differences from the website's copy:
//
//  1. Icons are Feather names, not lucide components — that is the icon set this
//     app already ships.
//  2. Accents are colour-token KEYS resolved against constants/colors.ts at
//     render time, because there is no Tailwind here to resolve class strings.
//  3. Every item carries `built`. The website's registry can assume each href
//     exists; this app is mid-port, so an item that has no screen yet renders
//     dimmed and non-interactive rather than pushing a dead route. Flip it to
//     true in the same commit that adds the screen — never before.
//
// Routes here are expo-router paths, not website URLs. CRM is one shared route
// group used by both roles, exactly as the website serves the same CRM pages to
// both portals over the same org-scoped collections.
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
  | "users";

/** Keys into the palette in constants/colors.ts, resolved by useColors(). */
export type AccentToken = "primary" | "secondary" | "accent" | "success" | "cta" | "warning" | "destructive";

export interface NavItem {
  /** Key into the `modules.items` i18n namespace. */
  titleKey: string;
  /** expo-router path. Ignored while `built` is false. */
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
      { titleKey: "browse_suppliers", href: "/(contractor)/suppliers", icon: "users", requiredPermission: "suppliers.manage", built: true },
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
];

// Same seven slots, same accents — Inventory/Finance/HR/CRM/Governance are
// identical concepts either way. Only the core-work and RFQ-facing modules
// differ by role, matching the website's split.
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
    labelKey: "sales",
    descKey: "sales",
    homeHref: "/(supplier)/rfqs",
    icon: "shopping-bag",
    accentToken: "cta",
    displayOrder: 3,
    items: [
      { titleKey: "browse_rfqs", href: "/(supplier)/rfqs", icon: "search", requiredPermission: "offers.view", built: true },
      { titleKey: "my_offers", href: "/(supplier)/offers", icon: "file-text", requiredPermission: "offers.view", built: true },
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

/** Items the caller may see. Unbuilt items are KEPT — they render dimmed, which
 * is how the app says "this lives on the website for now" rather than pretending
 * the feature does not exist. */
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
