#!/usr/bin/env node
/**
 * Web export with an explicit environment.
 *
 * Expo only auto-loads .env / .env.local / .env.development / .env.production,
 * so `.env.uat` would be silently ignored — and a build that silently ignores
 * its backend config is the worst possible failure here: it looks fine and
 * talks to PRODUCTION, because that is what lib/firebase.ts falls back to.
 *
 * This loads the named file into the environment first, prints the project it
 * resolved so the target is visible in the build output, then runs the export
 * and the PWA post-step.
 *
 *   node scripts/build-web.mjs .env.uat
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = process.argv[2];

if (envFile) {
  const p = path.join(ROOT, envFile);
  if (!fs.existsSync(p)) {
    console.error(`Env file not found: ${p}`);
    process.exit(1);
  }
  for (const raw of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  console.log(`Loaded ${envFile}`);
}

const project = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
// Say it out loud. Shipping a public test link at the live project is the
// mistake this whole file exists to make hard to commit by accident.
console.log(
  project
    ? `Firebase project: ${project}`
    : "Firebase project: (none set — the build will FALL BACK TO PRODUCTION)"
);
console.log("");

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", shell: true, env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

// --clear is NOT optional here. EXPO_PUBLIC_* values are inlined into the
// bundle at transform time, but Metro keys its cache on file contents, not on
// the environment — so switching env files reuses the previous bundle and
// silently ships the OLD project. That failure is invisible: the build logs the
// right project while the bundle contains the wrong one.
run("npx", ["expo", "export", "--platform", "web", "--clear"]);
// Must run BEFORE the PWA step and before any deploy: Firebase Hosting cannot
// serve a path containing "+", and the SPA rewrite turns that miss into a
// silent 200-with-HTML rather than a 404.
run("node", ["scripts/sanitize-asset-paths.mjs"]);
run("node", ["scripts/pwa-postexport.mjs"]);

console.log(`\nBuilt dist/ against ${project ?? "PRODUCTION (fallback)"}.`);
