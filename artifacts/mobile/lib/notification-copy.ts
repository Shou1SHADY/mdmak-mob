// A notification's text in the READER's language.
//
// Notifications written by the website (and by this app, for the same events)
// carry `i18n: { title, message, params }` — keys into the website's
// messages — next to text rendered in the sender's language. This renders the
// keys from NOTIFICATION_STRINGS (a generated copy of those messages) and
// falls back to the stored text when a key is unknown here.
//
// The messages are ICU: `{name}`, `{x, select, a {…} other {…}}` and
// `{n, plural, =0 {…} one {# …} other {# …}}` — this formatter covers exactly
// those. Plural categories follow CLDR for Arabic and English, written out
// rather than taken from Intl.PluralRules, which not every JS engine the app
// runs on provides.

import { NOTIFICATION_STRINGS } from "@/i18n/notifications.generated"

type Lang = "ar" | "en"
type Params = Record<string, string | number | null | undefined>

export interface NotificationLike {
  title?: string | null
  message?: string | null
  body?: string | null
  i18n?: { title?: string; message?: string; params?: Params } | null
}

export function pluralCategory(n: number, lang: Lang): string {
  if (lang === "en") return n === 1 ? "one" : "other"
  const m = n % 100
  if (n === 0) return "zero"
  if (n === 1) return "one"
  if (n === 2) return "two"
  if (m >= 3 && m <= 10) return "few"
  if (m >= 11 && m <= 99) return "many"
  return "other"
}

/** The block that starts at `open` ("{") — its end index, matching nested braces. */
function closeOf(s: string, open: number): number {
  let depth = 0
  for (let i = open; i < s.length; i++) {
    if (s[i] === "{") depth++
    else if (s[i] === "}" && --depth === 0) return i
  }
  return s.length - 1
}

/** Options of a select/plural: `key {text} key {text} …`. */
function optionsOf(s: string): Record<string, string> {
  const out: Record<string, string> = {}
  let i = 0
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i])) i++
    const start = i
    while (i < s.length && s[i] !== "{" && !/\s/.test(s[i])) i++
    const key = s.slice(start, i)
    while (i < s.length && s[i] !== "{") i++
    if (i >= s.length) break
    const end = closeOf(s, i)
    out[key] = s.slice(i + 1, end)
    i = end + 1
  }
  return out
}

export function formatMessage(pattern: string, params: Params, lang: Lang, hash?: string): string {
  let out = ""
  let i = 0
  while (i < pattern.length) {
    const c = pattern[i]
    if (c === "#" && hash !== undefined) {
      out += hash
      i++
      continue
    }
    if (c !== "{") {
      out += c
      i++
      continue
    }
    const end = closeOf(pattern, i)
    const inner = pattern.slice(i + 1, end)
    const comma = inner.indexOf(",")
    if (comma < 0) {
      const v = params[inner.trim()]
      out += v == null ? "" : String(v)
    } else {
      const name = inner.slice(0, comma).trim()
      const rest = inner.slice(comma + 1)
      const comma2 = rest.indexOf(",")
      const kind = rest.slice(0, comma2).trim()
      const opts = optionsOf(rest.slice(comma2 + 1))
      const v = params[name]
      if (kind === "plural") {
        const n = Number(v) || 0
        const chosen = opts[`=${n}`] ?? opts[pluralCategory(n, lang)] ?? opts.other ?? ""
        out += formatMessage(chosen, params, lang, String(n))
      } else {
        const chosen = opts[String(v)] ?? opts.other ?? ""
        out += formatMessage(chosen, params, lang, hash)
      }
    }
    i = end + 1
  }
  return out
}

/** Title and message for the reader; the stored text when the keys are unknown here. */
export function notificationText(n: NotificationLike, lang: Lang): { title: string; message: string } {
  const strings = NOTIFICATION_STRINGS[lang]
  const i = n.i18n
  if (i?.title && strings[i.title]) {
    // A param written "@key" is itself a message key (e.g. an optional clause).
    const params: Params = {}
    for (const [k, v] of Object.entries(i.params || {})) {
      params[k] = typeof v === "string" && v.startsWith("@") && strings[v.slice(1)] ? strings[v.slice(1)] : v
    }
    const title = formatMessage(strings[i.title], params, lang)
    const message = i.message && strings[i.message] ? formatMessage(strings[i.message], params, lang) : n.message ?? n.body ?? ""
    return { title, message }
  }
  return { title: n.title ?? "", message: n.message ?? n.body ?? "" }
}
