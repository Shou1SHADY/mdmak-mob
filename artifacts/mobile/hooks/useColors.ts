import designTokens from "@/constants/colors";

export function useColors() {
  return {
    ...designTokens.light,
    radius: designTokens.radius.xl,
    radiusMd: designTokens.radius.md,
    radiusSm: designTokens.radius.sm,
    radiusXs: designTokens.radius.xs,
    radiusLg: designTokens.radius.lg,
    radiusXl: designTokens.radius.xl,
    radius2xl: designTokens.radius["2xl"],
    radius3xl: designTokens.radius["3xl"],
    radiusFull: designTokens.radius.full,
    spacing: designTokens.spacing,
    shadow: designTokens.shadow,
    typography: designTokens.typography,
  };
}
