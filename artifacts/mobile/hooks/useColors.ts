import designTokens from "@/constants/colors";

export function useColors() {
  return {
    ...designTokens.light,
    radius: designTokens.radius.card,
    radiusMd: designTokens.radius.medium,
    radiusSm: designTokens.radius.small,
    spacing: designTokens.spacing,
    shadow: designTokens.shadow,
    typography: designTokens.typography,
  };
}
