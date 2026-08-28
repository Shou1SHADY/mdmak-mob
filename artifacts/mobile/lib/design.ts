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
