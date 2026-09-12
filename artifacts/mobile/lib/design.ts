import { TextStyle } from "react-native";

/**
 * The design scale for the module screens.
 *
 * These screens accumulated eleven font sizes, three weights, eleven corner
 * radii and six off-grid spacing values. Individually each choice looked
 * reasonable; together they read as unfinished, because nothing lines up and
 * nothing repeats. A bounded scale is what makes a dense B2B app feel
 * deliberate rather than assembled.
 *
 * Four type sizes, two weights, spacing on the 4pt grid, four radii.
 *
 * Hierarchy comes from SIZE and COLOUR, not from adding weights: a caption is
 * small and muted, a title is large and full-contrast. That is why a third
 * weight is not needed — it was doing a job that colour already does better,
 * and it made every screen slightly different from its neighbour.
 */

// --- type ------------------------------------------------------------------
//
// Every line height is >= 1.6x its size. Arabic is the default locale and its
// ascenders, descenders and diacritics need the room; at the ~1.2x a platform
// would otherwise pick, the script crowds the line below it.

export const FONT_REGULAR = "Inter_400Regular";
export const FONT_SEMIBOLD = "Inter_600SemiBold";

export const type = {
  /** Badges, metadata, timestamps, field labels. Always paired with a muted colour. */
  caption: { fontSize: 12, lineHeight: 20, fontFamily: FONT_REGULAR } as TextStyle,
  captionStrong: { fontSize: 12, lineHeight: 20, fontFamily: FONT_SEMIBOLD } as TextStyle,

  /** Default reading size: list rows, body copy, button labels. */
  body: { fontSize: 14, lineHeight: 24, fontFamily: FONT_REGULAR } as TextStyle,
  bodyStrong: { fontSize: 14, lineHeight: 24, fontFamily: FONT_SEMIBOLD } as TextStyle,

  /** Screen and card headings, and the primary line of a list row. */
  title: { fontSize: 17, lineHeight: 28, fontFamily: FONT_SEMIBOLD } as TextStyle,

  /** One per screen at most: the number the screen exists to show. */
  display: { fontSize: 24, lineHeight: 40, fontFamily: FONT_SEMIBOLD } as TextStyle,
} as const;

// --- spacing ---------------------------------------------------------------
//
// 4pt grid. Related things sit at `sm`, groups separate at `lg` or more — the
// gap between groups should read as roughly double the gap within one.

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// --- radii -----------------------------------------------------------------

export const radius = {
  /** Progress bars, tiny indicators. */
  hairline: 4,
  /** Badges and pills. */
  pill: 8,
  /** Controls: buttons, inputs, chips. */
  control: 12,
  /** Cards, panels, sheets. */
  card: 16,
} as const;

/** Card and panel interior. Dense list rows use `lg`; standalone panels `xl`. */
export const cardPadding = {
  row: space.lg,
  panel: space.lg,
} as const;

// --- tones -----------------------------------------------------------------
//
// A badge, chip or callout is coloured by MEANING, never by a hex picked on the
// screen: the tone resolves to a text colour and a soft ground from the palette,
// so it reads the same on a card, on the page, and in both themes.

export type Tone = "neutral" | "primary" | "cta" | "accent" | "success" | "warning" | "destructive" | "purple";

type Palette = {
  muted: string; mutedForeground: string; border: string;
  primaryText: string; accentBlueSoft: string;
  cta: string; ctaSoft: string;
  accent: string; accentSoft: string; accentForeground: string;
  success: string; successSoft: string;
  warning: string; warningSoft: string;
  destructive: string; destructiveSoft: string;
  purple: string; purpleSoft: string;
};

export function toneColors(colors: Palette, tone: Tone): { fg: string; bg: string; border: string } {
  switch (tone) {
    case "primary": return { fg: colors.primaryText, bg: colors.accentBlueSoft, border: colors.accentBlueSoft };
    case "cta": return { fg: colors.cta, bg: colors.ctaSoft, border: colors.ctaSoft };
    case "accent": return { fg: colors.accentForeground, bg: colors.accentSoft, border: colors.accentSoft };
    case "success": return { fg: colors.success, bg: colors.successSoft, border: colors.successSoft };
    case "warning": return { fg: colors.warning, bg: colors.warningSoft, border: colors.warningSoft };
    case "destructive": return { fg: colors.destructive, bg: colors.destructiveSoft, border: colors.destructiveSoft };
    case "purple": return { fg: colors.purple, bg: colors.purpleSoft, border: colors.purpleSoft };
    default: return { fg: colors.mutedForeground, bg: colors.muted, border: colors.border };
  }
}

/** The solid colour of a tone — for icons, stripes and progress bars. */
export function toneColor(colors: Palette, tone: Tone): string {
  return toneColors(colors, tone).fg;
}

// --- touch -----------------------------------------------------------------

/** Minimum touch target on a phone. */
export const MIN_TOUCH = 44;
/** Extends a small control (a 24px icon button) to the minimum target. */
export const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 } as const;
