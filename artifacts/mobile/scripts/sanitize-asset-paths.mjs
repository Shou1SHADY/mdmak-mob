#!/usr/bin/env node
/**
 * Removes "+" from exported asset paths.
 *
 * Under pnpm, Expo's web export copies package assets to paths that mirror the
 * pnpm store layout:
 *
 *   assets/__node_modules/.pnpm/@expo-google-fonts+inter@0.4.2/node_modules/...
 *                                                  ^
 *
 * Firebase Hosting decodes "+" in a request path as a SPACE before matching it
 * against stored files, so the browser's request for that exact URL never finds
 * the file. Requesting it with %2B works; the browser has no reason to do that.
 *
 * On its own that would be a 404. Combined with the SPA rewrite it is far worse:
 * the miss falls through to "**" -> /index.html, so the font request returns
 * 200 with a body of HTML. Nothing errors. `useFonts` simply never resolves,
 * the root layout returns null forever, and the app is a blank white page with
 * a clean console.
 *
 * The fix is to not ship "+" in a path at all: rename the files, then rewrite
 * the references inside the JS bundle to match.
 *
 * Runs as part of `npm run build:web`. Idempotent — a second run finds nothing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");

if (!fs.existsSync(DIST)) {
  console.error(`No dist/ at ${DIST}`);
  process.exit(1);
}

/** Every file under a directory, as paths relative to dist, POSIX separators. */
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(path.relative(DIST, p).split(path.sep).join("/"));
  }
  return acc;
}

const files = walk(DIST);
const moves = [];
for (const rel of files) {
  if (!rel.includes("+")) continue;
  moves.push([rel, rel.replaceAll("+", "-")]);
}

if (moves.length === 0) {
  console.log("Asset paths: nothing to sanitize.");
} else {
  for (const [from, to] of moves) {
    const src = path.join(DIST, from);
    const dst = path.join(DIST, to);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.renameSync(src, dst);
  }

  // Prune directories left empty by the moves, deepest first.
  const dirs = new Set();
  for (const [from] of moves) {
    let d = path.dirname(path.join(DIST, from));
    while (d.startsWith(DIST) && d !== DIST) {
      dirs.add(d);
      d = path.dirname(d);
    }
  }
  for (const d of [...dirs].sort((a, b) => b.length - a.length)) {
    try {
      if (fs.existsSync(d) && fs.readdirSync(d).length === 0) fs.rmdirSync(d);
    } catch {
      /* a non-empty parent is fine to leave */
    }
  }

  // Rewrite references. Only "+" INSIDE an asset path is touched — the pattern
  // is anchored on the asset directory so nothing else in the bundle (operators,
  // base64, query strings) can be caught by accident.
  const ASSET_REF = /assets\/__node_modules\/[^"'`\s\\)]*/g;
  let rewritten = 0;
  for (const rel of walk(DIST)) {
    if (!/\.(js|html|json|map)$/.test(rel)) continue;
    const p = path.join(DIST, rel);
    const before = fs.readFileSync(p, "utf8");
    const after = before.replace(ASSET_REF, (m) => m.replaceAll("+", "-"));
    if (after !== before) {
      fs.writeFileSync(p, after, "utf8");
      rewritten++;
    }
  }

  console.log(`Asset paths: renamed ${moves.length} file(s), rewrote refs in ${rewritten} file(s).`);
}

// Guard: nothing may ship with a "+" in its path.
const remaining = walk(DIST).filter((f) => f.includes("+"));
if (remaining.length > 0) {
  console.error(`\nStill ${remaining.length} path(s) containing "+":`);
  remaining.slice(0, 5).forEach((f) => console.error("   " + f));
  process.exit(1);
}

// --- keep the bundle filename honest --------------------------------------
//
// Rewriting references above changes the bundle's CONTENT while Expo's
// content-hash is already baked into its FILENAME. That combination is
// poisonous next to the `immutable` cache header on /_expo/static/**: a browser
// that fetched the pre-fix bundle keeps serving it from cache forever, so the
// deploy looks broken for exactly the people who tried it first.
//
// So: re-hash any bundle whose content no longer matches its name, rename it,
// and repoint index.html. The hash is then true again and `immutable` is safe.
import crypto from "node:crypto";

const JS_DIR = path.join(DIST, "_expo/static/js/web");
if (fs.existsSync(JS_DIR)) {
  const indexPath = path.join(DIST, "index.html");
  let indexHtml = fs.readFileSync(indexPath, "utf8");
  let renamed = 0;

  for (const name of fs.readdirSync(JS_DIR)) {
    const m = name.match(/^(.*?)-([0-9a-f]{32})\.js$/);
    if (!m) continue;
    const [, stem, oldHash] = m;
    const full = path.join(JS_DIR, name);
    const content = fs.readFileSync(full);
    const newHash = crypto.createHash("md5").update(content).digest("hex");
    if (newHash === oldHash) continue;

    const newName = `${stem}-${newHash}.js`;
    fs.renameSync(full, path.join(JS_DIR, newName));
    indexHtml = indexHtml.split(name).join(newName);
    renamed++;
    console.log(`Bundle re-hashed: ${name} -> ${newName}`);
  }

  if (renamed > 0) fs.writeFileSync(indexPath, indexHtml, "utf8");
}
