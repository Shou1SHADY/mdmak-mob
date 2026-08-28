#!/usr/bin/env node
/**
 * Makes the web export installable on a phone home screen.
 *
 * `expo export --platform web` (SDK 54) emits index.html with a theme-color and
 * a favicon and nothing else — no web app manifest, and none of the apple-*
 * meta tags iOS actually reads. Installed from that, Safari's "Add to Home
 * Screen" produces a BOOKMARK: a screenshot thumbnail for an icon, and tapping
 * it opens Safari with its address bar rather than the app.
 *
 * This adds the three things that change that:
 *
 *   1. manifest.json         — name, icons, standalone display, colours.
 *   2. apple-touch-icon      — iOS ignores the manifest icons for the home
 *                              screen and uses this instead.
 *   3. apple-mobile-web-app-capable — the switch that makes iOS launch the app
 *                              chromeless, with its own history stack.
 *
 * Run automatically by `npm run build:web`. Re-running is safe: it detects tags
 * it has already inserted and rewrites rather than duplicating them.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const APP = JSON.parse(fs.readFileSync(path.join(ROOT, "app.json"), "utf8")).expo;
const web = APP.web ?? {};

if (!fs.existsSync(DIST)) {
  console.error(`No dist/ at ${DIST} — run "expo export --platform web" first.`);
  process.exit(1);
}

// --- icon ------------------------------------------------------------------
// One 1024x1024 source, declared at the sizes browsers look for. Both iOS and
// Android downscale it themselves; shipping one file keeps this script free of
// an image-processing dependency.
const iconSrc = path.join(ROOT, "assets/images/icon.png");
const ICON = "icon.png";
if (!fs.existsSync(iconSrc)) {
  console.error(`Icon not found at ${iconSrc}`);
  process.exit(1);
}
fs.copyFileSync(iconSrc, path.join(DIST, ICON));

// --- manifest --------------------------------------------------------------
const manifest = {
  name: web.name ?? APP.name,
  short_name: web.shortName ?? APP.name,
  description: web.description ?? "",
  lang: web.lang ?? "en",
  // The app is Arabic-first; the manifest says so, so an installed instance
  // opens right-to-left from the first frame instead of flipping after boot.
  dir: (web.lang ?? "en") === "ar" ? "rtl" : "ltr",
  start_url: web.startUrl ?? "/",
  scope: "/",
  display: web.display ?? "standalone",
  orientation: web.orientation ?? "portrait",
  theme_color: web.themeColor ?? "#000000",
  background_color: web.backgroundColor ?? "#ffffff",
  icons: [
    { src: `/${ICON}`, sizes: "192x192", type: "image/png", purpose: "any" },
    { src: `/${ICON}`, sizes: "512x512", type: "image/png", purpose: "any" },
    { src: `/${ICON}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};
fs.writeFileSync(path.join(DIST, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

// --- html head -------------------------------------------------------------
const indexPath = path.join(DIST, "index.html");
let html = fs.readFileSync(indexPath, "utf8");

const MARK_OPEN = "<!-- pwa:start -->";
const MARK_CLOSE = "<!-- pwa:end -->";

const tags = [
  MARK_OPEN,
  `    <link rel="manifest" href="/manifest.json" />`,
  `    <link rel="apple-touch-icon" href="/${ICON}" />`,
  // The two iOS needs to launch standalone. "apple-mobile-web-app-capable" is
  // deprecated in favour of the manifest on other platforms but is still what
  // iOS honours, so both are present on purpose.
  `    <meta name="apple-mobile-web-app-capable" content="yes" />`,
  `    <meta name="mobile-web-app-capable" content="yes" />`,
  `    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`,
  `    <meta name="apple-mobile-web-app-title" content="${manifest.short_name}" />`,
  // viewport-fit=cover lets the app paint under the notch and home indicator;
  // react-native-safe-area-context already insets the content correctly.
  `    <meta name="format-detection" content="telephone=no" />`,
  MARK_CLOSE,
].join("\n");

if (html.includes(MARK_OPEN)) {
  html = html.replace(new RegExp(`${MARK_OPEN}[\\s\\S]*?${MARK_CLOSE}`), tags);
} else {
  html = html.replace("</head>", `${tags}\n  </head>`);
}

// Let the app draw into the safe areas on a notched iPhone.
html = html.replace(
  /<meta name="viewport" content="[^"]*"\s*\/>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />'
);

fs.writeFileSync(indexPath, html, "utf8");

console.log("PWA ready:");
console.log(`  manifest.json      ${manifest.name} (${manifest.display}, ${manifest.dir})`);
console.log(`  ${ICON}           apple-touch-icon + manifest icons`);
console.log(`  index.html         apple-mobile-web-app tags injected`);
