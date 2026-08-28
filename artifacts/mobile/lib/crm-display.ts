import type { useColors } from "@/hooks/useColors";
import type { Translations } from "@/i18n";
import type {
  ActivityType,
  ContactTier,
  LeadStatus,
  OpportunityStage,
  OpportunityTrack,
} from "@/lib/crm";

// The website carries its CRM colours as Tailwind class strings
// (STATUS_BADGE_CLASS and friends in src/lib/crm.ts). There is no Tailwind
// here, so this module maps the same semantic buckets onto the theme tokens in
// constants/colors.ts. The mapping is intentionally identical in meaning —
// cta/accent/warning/success/destructive land on the same statuses in both apps
// — so a lead that reads amber on the website does not read green on a phone.
//
// Kept out of lib/crm.ts on purpose: that file is a verbatim copy of the
// website's and must stay byte-identical.

type Colors = ReturnType<typeof useColors>;

export function leadStatusColor(status: LeadStatus | undefined, c: Colors): string {
  switch (status) {
    case "new":
      return c.cta;
    case "contacted":
      return c.accent;
    case "qualified":
    case "proposal":
      return c.warning;
    case "won":
      return c.success;
    case "lost":
      return c.destructive;
    default:
      return c.mutedForeground;
  }
}

export function stageColor(stage: OpportunityStage | undefined, c: Colors): string {
  switch (stage) {
    case "new":
      return c.cta;
    case "qualified":
      return c.accent;
    case "proposal":
    case "negotiation":
      return c.warning;
    case "won":
      return c.success;
    case "lost":
      return c.destructive;
    default:
      return c.mutedForeground;
  }
}

export function tierColor(tier: ContactTier | undefined, c: Colors): string {
  switch (tier) {
    case "A":
      return c.success;
    case "B":
      return c.cta;
    default:
      return c.mutedForeground;
  }
}

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  call: "phone",
  meeting: "users",
  site_visit: "map-pin",
  task: "check-square",
  email: "mail",
};

export function activityIcon(type: ActivityType): string {
  return ACTIVITY_ICONS[type] ?? "clipboard";
}

export function leadStatusLabel(status: LeadStatus | undefined, t: Translations): string {
  return status ? t.crm.leadStatuses[status] : t.crm.leadStatuses.new;
}

export function stageLabel(stage: OpportunityStage, t: Translations): string {
  return t.crm.stages[stage];
}

export function trackLabel(track: OpportunityTrack, t: Translations): string {
  return t.crm.tracks[track];
}

export function activityTypeLabel(type: ActivityType, t: Translations): string {
  return t.crm.activityTypes[type];
}

/**
 * Money renders LTR with grouped Western digits in both locales — the same rule
 * as the website's `formatSar`, and for the same reason: these figures are read
 * against invoices and bank statements that use them. Compacted past a million
 * because a deal value has to fit on a list row.
 */
export function formatSarCompact(value: number | null | undefined, isRTL: boolean): string {
  const n = Number.isFinite(value as number) ? (value as number) : 0;
  const unit = isRTL ? "ر.س" : "SAR";
  let body: string;
  if (Math.abs(n) >= 1_000_000) body = `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  else if (Math.abs(n) >= 1_000) body = `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  else body = n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return isRTL ? `${body} ${unit}` : `${unit} ${body}`;
}

export function formatSar(value: number | null | undefined, isRTL: boolean): string {
  const n = Number.isFinite(value as number) ? (value as number) : 0;
  const body = n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return isRTL ? `${body} ر.س` : `SAR ${body}`;
}

/** Whole days from today to an ISO date; negative once it is past. */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((then - today.getTime()) / 86_400_000);
}
