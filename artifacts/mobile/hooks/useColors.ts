import { useTheme } from "@/context/ThemeContext";

export function useColors() {
  const theme = useTheme();
  return {
    ...theme.tokens.colors,
    radius: theme.tokens.radius.xl,
    radiusMd: theme.tokens.radius.md,
    radiusSm: theme.tokens.radius.sm,
    radiusXs: theme.tokens.radius.xs,
    radiusLg: theme.tokens.radius.lg,
    radiusXl: theme.tokens.radius.xl,
    radius2xl: theme.tokens.radius["2xl"],
    radius3xl: theme.tokens.radius["3xl"],
    radiusFull: theme.tokens.radius.full,
    spacing: theme.tokens.spacing,
    shadow: theme.tokens.shadow,
    typography: theme.tokens.typography,
  } as const;
}
