#!/usr/bin/env node
/**
 * Measures every foreground/background pairing the UI actually renders, in both
 * palettes, against WCAG AA.
 *
 * This exists because a palette is edited one token at a time and judged by
 * eye, which does not catch what a token is paired WITH. A dark-mode pass here
 * left light mode with captions at 2.5:1 and amber-on-white at 2.2:1 for months,
 * and inverting `primary` for dark turned fourteen filled buttons into white on
 * near-white — all of it invisible to the person who made the change, because
 * each token looked fine on its own.
 *
 * Run: npm run check:contrast   (non-zero exit if any text pairing fails AA)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = fs.readFileSync(path.join(ROOT, "constants/colors.ts"), "utf8");

const palette = (name) => {
  const start = src.indexOf(`  ${name}: {`);
  if (start === -1) throw new Error(`palette "${name}" not found in constants/colors.ts`);
  const body = src.slice(start, src.indexOf("\n  },", start));
  const out = {};
  for (const m of body.matchAll(/^\s{4}(\w+): "(#[0-9A-Fa-f]{6})"/gm)) out[m[1]] = m[2];
  return out;
};

const luminance = (hex) => {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** [foreground, background, what it is, minimum]. 4.5 for text, 3 for UI. */
const PAIRS = [
  ["foreground", "background", "body text on the page", 4.5],
  ["cardForeground", "card", "body text on a card", 4.5],
  ["onSurfaceVariant", "card", "secondary text on a card", 4.5],
  ["mutedForeground", "card", "tertiary text on a card", 4.5],
  ["mutedForeground", "background", "tertiary text on the page", 4.5],
  ["outline", "background", "captions on the page", 4.5],
  ["outline", "surface", "inactive tab label on the bar", 4.5],
  ["primaryText", "background", "brand ink on the page", 4.5],
  ["primaryText", "card", "brand ink on a card", 4.5],
  ["primaryForeground", "primary", "label on a brand fill", 4.5],
  ["ctaForeground", "cta", "label on the CTA", 4.5],
  ["cta", "background", "CTA text / active tab label", 4.5],
  ["cta", "surface", "active tab label on the bar", 4.5],
  ["accentForeground", "accent", "label on the accent fill", 4.5],
  ["destructiveForeground", "destructive", "label on an error fill", 4.5],
  ["destructive", "card", "error text on a card", 4.5],
  ["successForeground", "success", "label on a success fill", 4.5],
  ["success", "card", "success text on a card", 4.5],
  ["warningForeground", "warning", "label on a warning fill", 4.5],
  ["warning", "card", "warning text on a card", 4.5],
];

/**
 * Advisory, not enforced: a card outline is decoration. The card is already
 * distinguishable by its fill and its shadow, so the border is not the only way
 * to perceive it and WCAG 1.4.11 does not apply. Reported so a change that
 * makes cards rely on the border alone is visible here.
 */
const ADVISORY = [["border", "card", "card border"]];

let failures = 0;
for (const theme of ["light", "dark"]) {
  const p = palette(theme);
  console.log(`\n${theme}`);
  for (const [fg, bg, what, min] of PAIRS) {
    if (!p[fg] || !p[bg]) {
      console.log(`  ????        ${what} — missing token "${p[fg] ? bg : fg}"`);
      failures++;
      continue;
    }
    const r = contrast(p[fg], p[bg]);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(
      `  ${ok ? "ok  " : "FAIL"} ${r.toFixed(2).padStart(6)}:1  ${what}  (${p[fg]} on ${p[bg]}, needs ${min})`
    );
  }
  for (const [fg, bg, what] of ADVISORY) {
    const r = contrast(p[fg], p[bg]);
    console.log(`  --   ${r.toFixed(2).padStart(6)}:1  ${what} (advisory)`);
  }
}

console.log(
  failures === 0
    ? "\nEvery text pairing meets WCAG AA in both palettes."
    : `\n${failures} pairing(s) below AA.`
);
process.exit(failures === 0 ? 0 : 1);
