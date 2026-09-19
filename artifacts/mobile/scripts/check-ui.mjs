#!/usr/bin/env node
/**
 * Checks every screen and component against the design system (lib/design.ts)
 * and the app's accessibility and bilingual rules — the things check-contrast
 * cannot see because they are not colours:
 *
 *   type      fontSize outside the four sizes (12 · 14 · 17 · 24), fontWeight
 *             instead of the two font families
 *   colour    a hex/rgb literal in a screen instead of a palette token
 *   rtl       a margin / padding / left / right / textAlign fixed to one side
 *             and not chosen by isRTL (the app flips layout manually)
 *   a11y      a Touchable/Pressable with no accessibilityRole; an icon-only
 *             one (no <Text> inside) with no accessibilityLabel
 *   touch     a Touchable whose own style is smaller than MIN_TOUCH (44) with
 *             no hitSlop
 *   text      Arabic or English words written into JSX instead of t.*
 *   grid      a radius outside 4 · 8 · 12 · 16 (and full-round), a margin /
 *             padding / gap that is not on the 4pt grid — ADVISORY: listed,
 *             but it does not fail the run (a 6 or a 10 is not a defect a
 *             user sees; snap them when a screen is being reworked anyway)
 *
 *   node scripts/check-ui.mjs            → summary per rule, then findings
 *   node scripts/check-ui.mjs --rule a11y → one rule only
 *   node scripts/check-ui.mjs --json
 *
 * Exit code is non-zero when any finding other than an advisory one remains,
 * so it can gate a build.
 * A line may opt out with a trailing `// ui-ok: <reason>` — or, in JSX, a
 * block comment starting "ui-ok:" on the line or the line above. The reason is
 * required, and is the review.
 */

import fs from "node:fs"
import path from "node:path"

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..")
const DIRS = ["app", "components"]
const onlyRule = process.argv.includes("--rule") ? process.argv[process.argv.indexOf("--rule") + 1] : null
const asJson = process.argv.includes("--json")

const TYPE_SIZES = new Set([12, 14, 17, 24])
const RADII = new Set([0, 4, 8, 12, 16, 999, 9999])
const ADVISORY = new Set(["grid"])

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === "__tests__") continue
      walk(full, out)
    } else if (/\.tsx?$/.test(e.name)) out.push(full)
  }
  return out
}

const files = DIRS.flatMap((d) => walk(path.join(ROOT, d)))
// The design-preview screen renders deliberately arbitrary samples.
const SKIP = new Set(["app/design-preview.tsx"])

const findings = []
const add = (rule, file, line, text, detail) => findings.push({ rule, file, line, text: text.trim().slice(0, 160), detail })

for (const file of files) {
  const rel = path.relative(ROOT, file)
  if (SKIP.has(rel)) continue
  const src = fs.readFileSync(file, "utf8")
  const lines = src.split("\n")
  let inBlockComment = false

  lines.forEach((raw, i) => {
    const n = i + 1
    let line = raw
    if (inBlockComment) {
      if (line.includes("*/")) inBlockComment = false
      return
    }
    if (/^\s*\/\*/.test(line) && !line.includes("*/")) {
      inBlockComment = true
      return
    }
    if (/^\s*(\/\/|\*)/.test(line)) return
    if (/(\/\/|\/\*)\s*ui-ok:\s*\S/.test(line)) return
    // JSX text cannot carry a // comment: a {/* ui-ok: … */} on the line above covers it.
    if (i > 0 && /\{\/\*\s*ui-ok:\s*\S/.test(lines[i - 1])) return
    line = line.replace(/\/\/.*$/, "")

    // type
    for (const m of line.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)/g)) {
      const v = Number(m[1])
      if (!TYPE_SIZES.has(v)) add("type", rel, n, raw, `fontSize ${v} is off the scale (12 · 14 · 17 · 24)`)
    }
    if (/fontWeight:\s*["'`]?\w/.test(line)) add("type", rel, n, raw, "fontWeight — use FONT_REGULAR / FONT_SEMIBOLD via type.*")

    // colour
    // Not a colour decision: a shadow, a neutral white/black tint (reads the
    // same over whatever is behind it — the always-dark heroes use these), or
    // artwork (a flag). Everything else is a colour that should be a token,
    // or it will not follow the theme.
    const neutral = (v) => /^rgba?\(\s*(255\s*,\s*255\s*,\s*255|0\s*,\s*0\s*,\s*0)\b/.test(v)
    if (!/(constants\/colors|lib\/design|components\/ui\/FlagIcon)/.test(rel) && !/shadowColor/.test(line)) {
      for (const m of line.matchAll(/["'`](#[0-9a-fA-F]{3,8})["'`]|(rgba?\([^)]*\))/g)) {
        const v = m[1] || m[2]
        if (neutral(v)) continue
        add("colour", rel, n, raw, `literal ${v} — use a palette token`)
      }
    }

    // rtl — this app flips layout MANUALLY (LanguageContext forces native RTL
    // off, and every row is `isRTL ? "row-reverse" : "row"`), so marginStart
    // is just marginLeft here. The fault is a FIXED side that isRTL does not
    // decide: inside a flipping row it lands on the wrong side in one language.
    // Prefer `gap` in rows; where a side is needed, choose it with isRTL.
    // hitSlop is symmetric by nature; a left/right pair with the same value
    // (stretch, or equal insets) has no side to get wrong.
    const pairOf = (side, v) => [lines[i - 1] || "", lines[i + 1] || "", line].some((l) => new RegExp(`\\b${side}\\s*:\\s*${v}\\b`).test(l))
    if (!/isRTL|isAr\b|rtl|align\b|row\b|hitSlop/.test(line)) {
      for (const m of line.matchAll(/\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeftWidth|borderRightWidth)\s*:\s*-?\d/g)) {
        add("rtl", rel, n, raw, `${m[1]} fixed to one side — use gap, or pick the side with isRTL`)
      }
      for (const m of line.matchAll(/(?<![\w.])(left|right)\s*:\s*(-?\d+)/g)) {
        if (pairOf(m[1] === "left" ? "right" : "left", m[2])) continue
        add("rtl", rel, n, raw, `${m[1]}: fixed to one side — pick it with isRTL`)
      }
      for (const m of line.matchAll(/textAlign:\s*["'](left|right)["']/g)) add("rtl", rel, n, raw, `textAlign "${m[1]}" — derive it from isRTL`)
    }

    // text — Arabic in JSX / string props outside i18n
    if (/[؀-ۿ]/.test(line) && !/(i18n|t\.|console\.|__DEV__)/.test(line)) add("text", rel, n, raw, "Arabic text written into the screen — move it to i18n")
    // English words directly between JSX tags: >Some words<
    for (const m of line.matchAll(/(?<![=-])>\s*([A-Za-z][A-Za-z'’ ,.!?-]{3,})\s*</g)) {
      if (/^(true|false|null|undefined)$/.test(m[1].trim())) continue
      add("text", rel, n, raw, `"${m[1].trim()}" written into the screen — move it to i18n`)
    }

    // grid
    for (const m of line.matchAll(/borderRadius:\s*(\d+)/g)) {
      const v = Number(m[1])
      if (!RADII.has(v)) add("grid", rel, n, raw, `borderRadius ${v} — use radius.* (4 · 8 · 12 · 16)`)
    }
    for (const m of line.matchAll(/\b(margin|padding)(Top|Bottom|Horizontal|Vertical|Start|End)?\s*:\s*(\d+)\b|\bgap:\s*(\d+)\b/g)) {
      const v = Number(m[3] ?? m[4])
      if (v % 4 !== 0 && v !== 2 && v !== 1) add("grid", rel, n, raw, `${m[0].split(":")[0]} ${v} is off the 4pt grid — use space.*`)
    }
  })

  // a11y + touch: look at each Touchable/Pressable opening tag and its body
  const openRe = /<(TouchableOpacity|Pressable|TouchableHighlight|TouchableWithoutFeedback)\b/g
  for (const m of src.matchAll(openRe)) {
    const start = m.index
    // the opening tag ends at the first ">" not inside {…}
    let depth = 0
    let end = start
    for (let k = start; k < src.length; k++) {
      const c = src[k]
      if (c === "{") depth++
      else if (c === "}") depth--
      else if (c === ">" && depth === 0) {
        end = k
        break
      }
    }
    const tag = src.slice(start, end + 1)
    const line = src.slice(0, start).split("\n").length
    const lineText = src.split("\n")[line - 1]
    if (/(\/\/|\/\*)\s*ui-ok:\s*\S/.test(lineText)) continue
    const selfClosing = tag.endsWith("/>")
    const closeIdx = selfClosing ? end : src.indexOf(`</${m[1]}>`, end)
    const body = selfClosing ? "" : src.slice(end + 1, closeIdx)
    const disabledA11y = /accessible=\{false\}|accessibilityElementsHidden|importantForAccessibility=["']no/.test(tag)
    if (!disabledA11y && !/accessibilityRole=/.test(tag) && !/\{\.\.\.[a-zA-Z]/.test(tag)) add("a11y", path.relative(ROOT, file), line, lineText, `${m[1]} without accessibilityRole`)
    const hasText = /<Text\b|\{t\.|\{label|\{title|\{children\}/.test(body)
    if (!disabledA11y && !hasText && !/accessibilityLabel=/.test(tag) && !/\{\.\.\.[a-zA-Z]/.test(tag)) add("a11y", path.relative(ROOT, file), line, lineText, `icon-only ${m[1]} without accessibilityLabel`)
    // touch: a literal width/height under 44 on the touchable itself, and no hitSlop
    const dims = [...tag.matchAll(/\b(width|height):\s*(\d+)/g)].map((d) => Number(d[2]))
    if (dims.length && Math.min(...dims) < 44 && !/hitSlop/.test(tag)) add("touch", path.relative(ROOT, file), line, lineText, `touch target ${Math.min(...dims)}px < 44 with no hitSlop`)
  }
}

const shown = onlyRule ? findings.filter((f) => f.rule === onlyRule) : findings
if (asJson) {
  console.log(JSON.stringify(shown, null, 2))
} else {
  const by = {}
  for (const f of findings) by[f.rule] = (by[f.rule] || 0) + 1
  console.log("findings by rule:", Object.entries(by).map(([k, v]) => `${k} ${v}${ADVISORY.has(k) ? " (advisory)" : ""}`).join(" · ") || "none")
  // Advisory findings are listed only when asked for by --rule.
  for (const f of shown) if (onlyRule || !ADVISORY.has(f.rule)) console.log(`  [${f.rule}] ${f.file}:${f.line}  ${f.detail}`)
}
process.exit(shown.some((f) => !ADVISORY.has(f.rule)) ? 1 : 0)
