# Mdmak Tech Mobile

Expo/React Native companion app for the Mdmak Tech B2B procurement platform
(mdmaktech.sa) — contractors publish RFQs, suppliers submit offers, both chat and
track orders. Shares the website's Firebase backend; there is no separate mobile API.

## Run & Operate

- `cd artifacts/mobile && pnpm run dev` — Expo dev server (QR / web preview)
- `pnpm run typecheck` — full typecheck across all packages (must pass before builds)
- `cd artifacts/mobile && npm run check:mirrors` — verifies every file copied
  VERBATIM from the website still matches it. Run after any website change that
  touches them. On drift, RE-COPY the whole file; never hand-patch the diff.
- `cd artifacts/mobile && pnpm run build:web` — static web export to `dist/`
- `cd artifacts/mobile && pnpm run eas:preview` / `eas:prod` — EAS native builds
- See `artifacts/mobile/DEPLOYMENT.md` for the full deployment checklist

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- App: Expo SDK 54, React Native 0.81, expo-router 6 (file-based, typed routes)
- Backend: Firebase JS SDK (Auth, Firestore, Storage) — same project as the website
  (`studio-2889504658-6ee2a`); config + fallbacks in `artifacts/mobile/lib/firebase.ts`
- The template's Express/Postgres packages (`artifacts/api-server`, `lib/db`,
  `lib/api-*`) are UNUSED scaffolding — the app talks only to Firebase

## Where things live

- `artifacts/mobile/app/` — screens; role route groups `(contractor)`, `(supplier)`,
  `(admin)` mirror the website's portals
- `artifacts/mobile/constants/data.ts` — categories/cities/districts/status enums
  mirrored from the website's `src/lib/constants.ts`; Arabic strings are the
  canonical Firestore values. Keep in sync when the website list changes.
- `artifacts/mobile/constants/colors.ts` — design tokens matching the website's
  Tailwind theme (primary #0F172A, accent #20CBD5, cta #0369A1, success #12A063)
- `artifacts/mobile/i18n/` — ar/en dictionaries; parity enforced by the
  `Translations` type (typecheck fails on missing keys)
- `artifacts/mobile/lib/contracts.ts` — **the shared Firestore document shapes.**
  `buildRfqDoc` / `buildOfferDoc` write every field the website queries on, and
  `readRfqLineItems` reads line items whichever app wrote them. Screens should
  go through these rather than assembling documents inline — that is how the
  two apps drifted apart before.
- `artifacts/mobile/lib/permissions.ts` — copied VERBATIM from the website's
  `src/lib/permissions.ts`; re-copy it whole when the website's changes.
  `hooks/usePermissions.ts` resolves it against `teamGroups` for team members.
- `artifacts/mobile/lib/portal-components.ts` — **the module registry.** Mirrors
  the website's `src/lib/portal-components.ts`: same seven module ids, same
  accent per module, same permission on every nav item. Each item also carries
  `built`, which is false until the screen exists here — flip it in the same
  commit that adds the screen. `app/apps.tsx` is the launcher that renders it.
- `artifacts/mobile/lib/crm.ts` — the CRM domain model, copied VERBATIM from the
  website (it has zero imports, which is what makes that safe). Stages, tracks,
  gates and the value ladder are identical by construction. Never hand-edit;
  re-copy when the website's changes.
- `artifacts/mobile/lib/crm-writes.ts` — the CRM writes this app performs, each
  payload mirroring the website dialog named in its comment.
- Every module in the registry is now BUILT — no `built: false` entries remain.
- `artifacts/mobile/app/(projects)/` — Project Management (contractor only).
  `app/(inventory)/` — warehouses, requests and waste. `app/(finance)/` — invoices,
  guarantees and employees (Finance + HR; read-only). `app/(goods)/` — delivery
  confirmation. `app/(connections)/` — the supplier's invitation inbox.
- Mirrored VERBATIM alongside crm.ts, same rule — never hand-edit, re-copy:
  `project-status.ts`, `project-sections.ts`, `inventory-units.ts`,
  `waste-reasons.ts`, `invoice-utils.ts`, `finance-audit.ts`,
  `warehouse-transfer.ts`, `warehouse-requests.ts`. The last two carry the
  release/confirm TRANSACTIONS — stock is money and the two apps must agree.
  `waste-writes.ts` is the one exception: its body is verbatim but two imports
  are rebased onto `waste-scope.ts` (see its header).
- `artifacts/mobile/app/(crm)/` — the CRM module, ONE route group serving both
  roles, exactly as the website serves the same CRM pages to both portals.
- `artifacts/mobile/lib/org-identity.ts` — mirrors the website's module of the
  same name: decides whether company details live on `users/{uid}` or on
  `organizations/{id}`. Profile edits must write through `identityDocRef`.
- Firestore security rules live in the parent website repo (`../firestore.rules`)
  and are deployed from there

## Architecture decisions

- Arabic-first (RTL) like the website; `context/LanguageContext.tsx` drives direction
- Firestore document shapes are byte-compatible with the website (verified for
  `users`, `rfqs`, `offers`, `chats/{id}/messages`, `users/{uid}/notifications`)
- An account's `organizationId` is its own uid for a solo company — the website
  reads any other value as a SECONDARY company and resolves that company's
  details from `organizations/{id}`. Never mint a fresh organization id.
- RFQs must carry `visibility` (`"public"`/`"private"`) and
  `allowedSupplierOrgIds`; the website's supplier feed queries on both, so an
  RFQ without them reaches no supplier. Offers must carry `contractorOrgId`, or
  they never appear in the contractor's notifications or work queue.
- Modules are the app's top-level structure, matching the website. The five role
  tabs stay the core work; everything else is reached from the launcher. A module
  the phone has not got yet still appears there, dimmed — hiding it would imply
  the company does not have the feature when it is one tab away on the web.
- `usePermissions` answers ORG-WIDE questions. Anything scoped to one project
  MUST use `useProjectPermissions`: firestore.rules resolves project actions with
  `hasProjectPermission`, where a seat on projects/{id}/members fully replaces the
  member's default group — in both directions.
- Ported modules take the MOBILE-APPROPRIATE subset: list, detail, and the two or
  three actions worth doing on the move. Heavy desktop paths stay on the website —
  for CRM that means the value ladder, price approval, won/lost reasons, handover
  and quotations. `crm-writes.ts` cannot reach a terminal stage by construction,
  which matches firestore.rules gating those writes behind `crm.close`.
- Line items are `products` on the website and `boqItems` here. Both are
  written; read them with `readRfqLineItems()`.
- Firebase config has hardcoded public fallbacks (same pattern as the website's
  `src/firebase/config.ts`) so builds work with zero env setup
- Push notifications use Expo's push gateway (`hooks/usePushToken.ts`); token is
  stored on the user doc as `expoPushToken`

## Gotchas

- **Never deploy `dist/` to Firebase Hosting without running
  `scripts/sanitize-asset-paths.mjs` first.** Under pnpm, Expo writes package
  assets to paths like `assets/__node_modules/.pnpm/@expo-google-fonts+inter@0.4.2/...`.
  Firebase Hosting decodes the `+` as a SPACE when matching stored files, so the
  browser's request never finds it — and the SPA rewrite then answers with
  `index.html` at status **200**. Nothing 404s, nothing throws: the font simply
  fails to parse, `useFonts` never resolves, the root layout returns `null`, and
  the app is a blank white page with a clean console. `npm run build:web` runs
  the sanitizer for you; a hand-rolled `expo export` does not.
- The sanitizer also RE-HASHES the JS bundle. Rewriting those asset references
  changes content whose hash Expo already baked into the filename, and
  `/_expo/static/**` is served `immutable` — so without the re-hash, every
  browser that loaded a broken build would keep serving it from cache forever.
- Pin pnpm to **v10** (`npx pnpm@10 ...`). A bare `npx pnpm` currently resolves to
  v11, which wants to purge and rebuild node_modules and then aborts with
  ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY in a non-interactive shell.

- `pnpm run typecheck` pipes through nothing — never trust `tsc | tail` exit codes
- `expo-doctor` warns about a duplicate `react` from the PARENT repo's
  node_modules (this workspace nests inside studio-monaqasati) — expected, ignore
- Run `npx expo install <pkg>` (not plain pnpm add) so versions match the SDK
- `extra.eas.projectId` in app.json is intentionally absent until `eas init` links
  the real EAS project (a fake ID breaks builds)
