import type { useColors } from "@/hooks/useColors";
import type { ProjectStatus } from "@/lib/project-status";

// The website carries project status colours as Tailwind class strings
// (PROJECT_STATUS_BADGE_CLASSES in src/lib/project-status.ts). There is no
// Tailwind here, so this maps the same semantic buckets onto the theme tokens in
// constants/colors.ts — token for token, so a project that reads amber on the
// website does not read green on a phone.
//
// Kept out of lib/project-status.ts on purpose: that file is a verbatim copy of
// the website's and must stay byte-identical.

type Colors = ReturnType<typeof useColors>;

export function projectStatusColor(status: ProjectStatus, c: Colors): string {
  switch (status) {
    case "todo":
      return c.mutedForeground;
    case "waiting_approval":
    case "remaining_payment":
      return c.warning;
    case "pricing":
      return c.cta;
    case "approved_waiting_start":
      return c.success;
    case "working":
      return c.accent;
    case "hold":
      return c.secondary;
    case "canceled":
      return c.destructive;
    default:
      return c.mutedForeground;
  }
}
