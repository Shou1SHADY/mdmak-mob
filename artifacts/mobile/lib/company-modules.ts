// Component switches — ADAPTED from the website's src/lib/company-modules.ts (pinned in
// scripts/check-mirrors.mjs UPSTREAM_PINS). The rules of the switches are the website's, copied
// as they are: which modules each portal may switch, what a module needs (HR goes with Finance or
// Inventory, Manufacturing with Inventory), and how the stored `companyModules/{orgId}` document
// is read. Only the last step differs: this app's registry is flat (`items`), so switching a module
// off removes its tile here instead of rewriting website menu sections.
//
// "Off" is a product switch, not a security boundary: the data rules still go by permission. A
// company with no switch document has everything on. Pure: no I/O.

import type { PortalComponentDef } from "@/lib/portal-components";

export const COMPANY_MODULES = "companyModules";

export const OPTIONAL_MODULES = ["project-management", "hr", "manufacturing", "crm", "warehouses", "payments"] as const;
export type OptionalModule = (typeof OPTIONAL_MODULES)[number];
export type ModulePortal = "contractor" | "supplier";

const CONTRACTOR_SWITCHES: readonly OptionalModule[] = ["project-management", "hr", "manufacturing"];
const SUPPLIER_SWITCHES: readonly OptionalModule[] = ["crm", "warehouses", "payments", "hr", "manufacturing"];

/** The switches a company of this portal has. */
export const optionalFor = (portal: ModulePortal): readonly OptionalModule[] =>
  portal === "supplier" ? SUPPLIER_SWITCHES : CONTRACTOR_SWITCHES;

/** A supplier that only sells: Order Management, Sales and Governance stay; everything else is off. */
export const SALES_ONLY_OFF: readonly OptionalModule[] = SUPPLIER_SWITCHES;

/** What a module cannot work without (website MODULE_NEEDS). */
export const MODULE_NEEDS: Partial<Record<OptionalModule, readonly OptionalModule[]>> = {
  hr: ["payments", "warehouses"],
  manufacturing: ["warehouses"],
};

/** The off list with every module that needs an off one added, within this portal's switches. */
export function withDependents(off: Iterable<OptionalModule>, portal: ModulePortal): Set<OptionalModule> {
  const allowed = optionalFor(portal);
  const out = new Set([...off].filter((id) => allowed.includes(id)));
  for (const id of allowed) {
    if ((MODULE_NEEDS[id] || []).some((need) => allowed.includes(need) && out.has(need))) out.add(id);
  }
  return out;
}

export const isOptionalModule = (id: unknown): id is OptionalModule =>
  typeof id === "string" && (OPTIONAL_MODULES as readonly string[]).includes(id);

/** What is switched off, from the stored document: only this portal's optional ids, whatever else is in the data. */
export function offSet(data: { off?: unknown } | null | undefined, portal: ModulePortal | null): ReadonlySet<OptionalModule> {
  if (!portal || !data || !Array.isArray(data.off)) return new Set();
  const allowed = optionalFor(portal);
  return withDependents(
    data.off.filter((id): id is OptionalModule => isOptionalModule(id) && allowed.includes(id)),
    portal
  );
}

/** The portal of an account role, as the website reads it from the address bar. */
export const portalOfRole = (role: string | undefined | null): ModulePortal | null =>
  role === "Supplier" ? "supplier" : role === "Contractor" ? "contractor" : null;

/**
 * The registry as this company sees it. A switched-off module leaves it — except the contractor's
 * Project Management, which keeps only its dashboard (the home) and stops being a tile, exactly as on
 * the website. On the supplier side "project-management" is Order Management and is never switchable.
 */
export function applyModuleSwitches(
  components: PortalComponentDef[],
  off: ReadonlySet<string>,
  portal: ModulePortal
): PortalComponentDef[] {
  if (off.size === 0) return components;
  const allowed = optionalFor(portal) as readonly string[];
  const out: PortalComponentDef[] = [];
  for (const c of components) {
    if (!off.has(c.id) || !allowed.includes(c.id)) {
      out.push(c);
    } else if (c.id === "project-management") {
      const home = c.items.filter((i) => i.titleKey === "dashboard");
      out.push({ ...c, launcher: false, items: home });
    }
  }
  return out;
}
