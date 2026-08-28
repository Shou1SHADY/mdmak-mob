#!/usr/bin/env node
/**
 * Verifies that every file this app mirrors from the website still matches it.
 *
 * Several modules are copied VERBATIM rather than reimplemented — the CRM
 * domain model, the permission catalog, the project status set, the warehouse
 * transfer/request transactions, invoice arithmetic. That is what makes the two
 * apps agree by construction instead of by discipline, and it only holds while
 * the copies are actually identical. A hand-edit here, or a change on the
 * website that nobody copied across, silently reintroduces exactly the kind of
 * drift this whole approach exists to prevent.
 *
 * Run it before shipping, and after any website change that touches these files:
 *
 *   npm run check:mirrors
 *
 * When it reports drift, RE-COPY the website's file whole and re-apply the
 * header comment. Do not hand-patch the difference.
 *
 * The website is expected at ../../../studio-monaqasati (the layout the
 * mdmak-mob.code-workspace file describes). Pass a different path as the first
 * argument if yours differs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MOB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WEB = path.resolve(process.argv[2] ?? path.join(MOB, "../../../studio-monaqasati"));

/** mobile path -> website path */
const MIRRORS = {
  "lib/crm.ts": "src/lib/crm.ts",
  "lib/permissions.ts": "src/lib/permissions.ts",
  "lib/project-status.ts": "src/lib/project-status.ts",
  "lib/project-sections.ts": "src/lib/project-sections.ts",
  "lib/inventory-units.ts": "src/lib/inventory-units.ts",
  "lib/waste-reasons.ts": "src/lib/waste-reasons.ts",
  "lib/invoice-utils.ts": "src/utils/invoice-utils.ts",
  "lib/finance-audit.ts": "src/lib/finance-audit.ts",
  "lib/warehouse-transfer.ts": "src/lib/warehouse-transfer.ts",
  "lib/warehouse-requests.ts": "src/lib/warehouse-requests.ts",
};

/**
 * The one documented exception. Its BODY is verbatim; two imports are rebased
 * because one helper lives in a web-only React file. Normalising that single
 * swap lets the rest still be compared byte-for-byte.
 */
const REBASED = {
  "lib/waste-writes.ts": {
    web: "src/lib/waste-writes.ts",
    from: "@/lib/waste-scope",
    to: "@/hooks/useProjectWasteStats",
  },
};

/** Drop the mobile copy's leading header comment and normalise line endings. */
function body(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length && (lines[i].startsWith("//") || lines[i].trim() === "")) i++;
  return lines.slice(i).join("\n").trim();
}

function read(root, rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    console.error(`  MISSING  ${p}`);
    return null;
  }
  return fs.readFileSync(p, "utf8");
}

if (!fs.existsSync(WEB)) {
  console.error(`Website repo not found at ${WEB}`);
  console.error("Pass its path as the first argument, e.g. npm run check:mirrors -- ../../site");
  process.exit(2);
}

let drift = 0;

console.log(`Comparing against ${WEB}\n`);
for (const [mobRel, webRel] of Object.entries(MIRRORS)) {
  const mobRaw = read(MOB, mobRel);
  const webRaw = read(WEB, webRel);
  if (mobRaw === null || webRaw === null) { drift++; continue; }

  const mob = body(mobRaw);
  const web = body(webRaw);
  if (mob === web) {
    console.log(`  ok       ${mobRel}`);
    continue;
  }

  drift++;
  const m = mob.split("\n");
  const w = web.split("\n");
  let at = -1;
  for (let i = 0; i < Math.max(m.length, w.length); i++) {
    if (m[i] !== w[i]) { at = i; break; }
  }
  console.log(`  DRIFT    ${mobRel}  (first difference at body line ${at + 1})`);
  console.log(`             website: ${(w[at] ?? "<end of file>").trim().slice(0, 76)}`);
  console.log(`             mobile:  ${(m[at] ?? "<end of file>").trim().slice(0, 76)}`);
}

for (const [mobRel, spec] of Object.entries(REBASED)) {
  const mobRaw = read(MOB, mobRel);
  const webRaw = read(WEB, spec.web);
  if (mobRaw === null || webRaw === null) { drift++; continue; }

  const mob = body(mobRaw).split(spec.from).join(spec.to);
  if (mob === body(webRaw)) {
    console.log(`  ok       ${mobRel}  (only the ${spec.from} import differs, as documented)`);
  } else {
    drift++;
    console.log(`  DRIFT    ${mobRel}  — differs beyond the permitted import swap`);
  }
}

if (drift === 0) {
  console.log("\nAll mirrors match the website.");
  process.exit(0);
}
console.log(`\n${drift} file(s) drifted. Re-copy them from the website rather than hand-patching.`);
process.exit(1);
