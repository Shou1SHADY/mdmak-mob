import colors from "@/constants/colors";

/**
 * Returns the Mdmak Tech design tokens.
 * Fixed light-only palette — no dark mode toggle.
 * radius = card radius (12px); radiusMd = 10px; radiusSm = 8px.
 */
export function useColors() {
  return {
    ...colors.light,
    radius: colors.radius.card,
    radiusMd: colors.radius.medium,
    radiusSm: colors.radius.small,
  };
}
