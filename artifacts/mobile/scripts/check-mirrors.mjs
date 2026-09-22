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
 * argument, or set MDMAK_WEB_DIR, if yours differs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MOB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Resolution order: CLI argument, MDMAK_WEB_DIR, then the sibling-checkout
// layout. A machine that keeps the two repos elsewhere sets the variable once.
// Flags are skipped: taking argv[2] whatever it was made the documented
// `npm run check:mirrors -- --update-lock` look for a website called
// "--update-lock", so the lock could not be refreshed the way this file says.
const WEB = path.resolve(
  process.argv.slice(2).find((a) => !a.startsWith("--")) ?? process.env.MDMAK_WEB_DIR ?? path.join(MOB, "../../../studio-monaqasati")
);

/** mobile path -> website path */
const MIRRORS = {
  "lib/crm.ts": "src/lib/crm.ts",
  "lib/permissions.ts": "src/lib/permissions.ts",
  "lib/project-status.ts": "src/lib/project-status.ts",
  "lib/project-sections.ts": "src/lib/project-sections.ts",
  "lib/ipc.ts": "src/lib/ipc.ts",
  "lib/inventory-units.ts": "src/lib/inventory-units.ts",
  "lib/waste-reasons.ts": "src/lib/waste-reasons.ts",
  "lib/invoice-utils.ts": "src/utils/invoice-utils.ts",
  "lib/finance-audit.ts": "src/lib/finance-audit.ts",
  "lib/warehouse-transfer.ts": "src/lib/warehouse-transfer.ts",
  "lib/warehouse-requests.ts": "src/lib/warehouse-requests.ts",
  "lib/sales-installments.ts": "src/lib/sales-installments.ts",
  "lib/sales-orders.ts": "src/lib/sales-orders.ts",
  "lib/sales-transfers.ts": "src/lib/sales-transfers.ts",
  "lib/accounting/accounts.ts": "src/lib/accounting/accounts.ts",
  "lib/accounting/journal.ts": "src/lib/accounting/journal.ts",
  "lib/accounting/posting-rules.ts": "src/lib/accounting/posting-rules.ts",
  "lib/accounting/post.ts": "src/lib/accounting/post.ts",
  "lib/accounting/hooks.ts": "src/lib/accounting/hooks.ts",
  "lib/accounting/balances.ts": "src/lib/accounting/balances.ts",
  "lib/accounting/display.ts": "src/lib/accounting/display.ts",
  "lib/accounting/periods.ts": "src/lib/accounting/periods.ts",
  "lib/accounting/statements.ts": "src/lib/accounting/statements.ts",
  "lib/accounting/statement-tree.ts": "src/lib/accounting/statement-tree.ts",
  "lib/accounting/analytics.ts": "src/lib/accounting/analytics.ts",
  "lib/accounting/settings.ts": "src/lib/accounting/settings.ts",
  "lib/manufacturing-engine.ts": "src/lib/manufacturing-engine.ts",
  "lib/manufacturing.ts": "src/lib/manufacturing.ts",
  "lib/delivery-notes.ts": "src/lib/delivery-notes.ts",
  "lib/manufacturing-writes.ts": "src/lib/manufacturing-writes.ts",
  "lib/manufacturing-view.ts": "src/lib/manufacturing-view.ts",
  "lib/manufacturing-requests.ts": "src/lib/manufacturing-requests.ts",
  "lib/mfg-events.ts": "src/lib/mfg-events.ts",
  "lib/mfg-outside.ts": "src/lib/mfg-outside.ts",
  "lib/search-text.ts": "src/lib/search-text.ts",
  "lib/procurement/types.ts": "src/lib/procurement/types.ts",
  "lib/procurement/po.ts": "src/lib/procurement/po.ts",
  "lib/procurement/receipts.ts": "src/lib/procurement/receipts.ts",
  "lib/procurement/supplier.ts": "src/lib/procurement/supplier.ts",
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

/**
 * Hand-ADAPTED files. These cannot be byte-compared — they reshape a website
 * source rather than copying it — so they were previously invisible to this
 * check, which made them the most likely drift sites. Instead, each records
 * the SHA-256 of its upstream website file(s) at the last review
 * (scripts/mirror-lock.json). When an upstream changes, the check fails and
 * names the adaptation to re-review; refresh the lock with:
 *
 *   npm run check:mirrors -- --update-lock
 *
 * only AFTER re-reading the adaptation against the changed upstream.
 */
const UPSTREAM_PINS = {
  "lib/contracts.ts": [
    "src/components/contractor/RfqForm.tsx",
    "src/components/supplier/SubmitOfferDialog.tsx",
  ],
  "lib/crm-writes.ts": [
    "src/lib/crm-writes.ts",
    "src/components/crm/CrmContactDialog.tsx",
    "src/components/crm/CrmOpportunityDialog.tsx",
    "src/components/crm/CrmActivityDialog.tsx",
  ],
  "lib/delivery-writes.ts": ["src/components/contractor/RfqOffersView.tsx"],
  "lib/connection-writes.ts": ["src/app/[locale]/(supplier)/supplier/connections/page.tsx"],
  "lib/portal-components.ts": ["src/lib/portal-components.ts"],
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
  console.error("Pass its path as the first argument (npm run check:mirrors -- ../../site) or set MDMAK_WEB_DIR.");
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

// --- Upstream pins for the hand-adapted files ---
const LOCK_PATH = path.join(MOB, "scripts", "mirror-lock.json");
const updateLock = process.argv.includes("--update-lock");
const lock = fs.existsSync(LOCK_PATH) ? JSON.parse(fs.readFileSync(LOCK_PATH, "utf8")) : {};
const nextLock = {};

const { createHash } = await import("node:crypto");
const sha = (text) => createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");

for (const [mobRel, upstreams] of Object.entries(UPSTREAM_PINS)) {
  nextLock[mobRel] = {};
  let changed = [];
  for (const webRel of upstreams) {
    const webRaw = read(WEB, webRel);
    if (webRaw === null) { drift++; continue; }
    const digest = sha(webRaw);
    nextLock[mobRel][webRel] = digest;
    if (lock[mobRel]?.[webRel] !== digest) changed.push(webRel);
  }
  if (updateLock) {
    console.log(`  pinned   ${mobRel}  (${upstreams.length} upstream file(s))`);
  } else if (changed.length === 0 && lock[mobRel]) {
    console.log(`  ok       ${mobRel}  (upstreams unchanged since last review)`);
  } else {
    drift++;
    console.log(`  REVIEW   ${mobRel}  — upstream changed since the adaptation was last reviewed:`);
    for (const c of changed) console.log(`             ${c}`);
  }
}

if (updateLock) {
  fs.writeFileSync(LOCK_PATH, JSON.stringify(nextLock, null, 2) + "\n");
  console.log(`\nLock refreshed at ${path.relative(MOB, LOCK_PATH)} — commit it with the review.`);
}

if (drift === 0) {
  console.log("\nAll mirrors match the website.");
  process.exit(0);
}
if (updateLock) process.exit(0);
console.log(`\n${drift} file(s) drifted. Re-copy verbatim mirrors from the website; re-review REVIEW items against their upstream, then run with --update-lock.`);
process.exit(1);
