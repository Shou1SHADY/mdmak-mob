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
  The website is expected as a sibling checkout; pass its path as an argument
  or set `MDMAK_WEB_DIR` when it lives elsewhere.
- `cd artifacts/mobile && npm run check:ui` — design-system, RTL, a11y and
  hard-coded-text rules for every screen (a line opts out with `// ui-ok: <reason>`).
- `cd artifacts/mobile && npm run sync:notifications [-- --check]` — copies the
  website's notification messages into `i18n/notifications.generated.ts`, so a
  notification reads in the reader's language. Re-run when the website's change.
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
- `artifacts/mobile/i18n/modules/*.ts` — the dictionaries, one file per
  module (core, auth, profile, procurement, team, crm, projects, inventory,
  finance), each holding `en` and `ar` side by side with `ar` typed from
  `en`. `en.ts`/`ar.ts` only assemble them and `Translations` is
  `typeof en` — add strings in the module file, never in the assemblers.
- `artifacts/mobile/components/ui/DateField.tsx` — every date is picked, never
  typed: the system dialog on Android, a spinner sheet on iOS, the browser's
  input on the web build. It stores the string shape the record already uses
  (ISO day, or MM/YYYY for a document expiry via `granularity="month"`).
- `artifacts/mobile/lib/design.ts` — **the design system.** Four type sizes
  (`type.caption/body/title/display`, two Inter weights, 1.6x line heights),
  `space` on the 4pt grid, four `radius` values, and `toneColors()`: a badge,
  chip or callout is coloured by MEANING (neutral, primary, cta, accent,
  success, warning, destructive, purple) and resolves to a text colour and a
  solid soft ground from `constants/colors.ts` in either theme. RFQ/offer
  statuses carry a `tone` (`statusTone()` in constants/data.ts). No hex
  literals in screens; `npm run check:contrast` verifies every pairing,
  including each tone on its soft ground.
- `artifacts/mobile/lib/contracts.ts` — **the shared Firestore document shapes.**
  `buildRfqDoc` / `buildOfferDoc` write every field the website queries on, and
  `readRfqLineItems` reads line items whichever app wrote them. Screens should
  go through these rather than assembling documents inline — that is how the
  two apps drifted apart before.
- `artifacts/mobile/lib/permissions.ts` — copied VERBATIM from the website's
  `src/lib/permissions.ts`; re-copy it whole when the website's changes.
  `hooks/usePermissions.ts` resolves it against `teamGroups` for team members.
- `artifacts/mobile/lib/portal-components.ts` — **the module registry.** Mirrors
  the website's `src/lib/portal-components.ts`: same module ids, same accent
  per module, same permission on every nav item. Each item also carries
  `built`, which is false until the screen exists here — flip it in the same
  commit that adds the screen. An unbuilt item carries the WEBSITE's path and
  the launcher opens it in the browser. Sales, Manufacturing and Accounting are
  web-only by design (desktop work) and appear under "More on the web app".
  `app/apps.tsx` is the launcher that renders it.
- `artifacts/mobile/lib/site-api.ts` — the website's HTTP API, for the flows
  that must run server-side: invitation lookup/accept (registration) and the
  access-request form. `EXPO_PUBLIC_SITE_URL` points a UAT build at the UAT
  site; production otherwise.
- `artifacts/mobile/lib/crm.ts` — the CRM domain model, copied VERBATIM from the
  website (it has zero imports, which is what makes that safe). Stages, tracks,
  gates and the value ladder are identical by construction. Never hand-edit;
  re-copy when the website's changes.
- `artifacts/mobile/lib/crm-writes.ts` — the CRM writes this app performs, each
  payload mirroring the website dialog named in its comment.
- Every module ported to the phone is fully built; the `built: false` entries
  that remain are deliberate (Sales, Manufacturing, Accounting, the supplier
  directory) and open on the website.
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

- **Registration is by invitation only**, exactly as on the website: public
  self-registration was removed there on 2026-08-04 and firestore.rules
  reserves `users/{uid}` creation for the Admin SDK. `app/auth/register.tsx`
  resolves an invitation token (pasted link, or a `?invite=` deep link), creates
  the Auth user, then calls the website's `/api/invitations/accept`, which
  creates the profile and links the org. If that call fails the Auth user is
  deleted again. A Google sign-in with no profile is refused with a clear
  message — never provisioned client-side. A company with no invitation is sent
  to the website's access-request form.
- **Supplier specializations and coverage cities are gated by admin approval.**
  The rules reject a supplier's write to `specializations`/`coverageCities`;
  edits go to `pendingSpecializations`/`pendingCoverageCities` (canonical
  Arabic category names) and the profile shows them as awaiting approval. Legal
  documents live on `legalDocuments` (the website's field), never `documents`.
- `Alert.alert` is an empty stub in react-native-web. `lib/web-alert.ts` maps it
  onto the browser's alert/confirm at start-up so confirmations and errors are
  not silent on the PWA. New code should still prefer the toast provider.
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
- A checkout copied from Windows arrives with CRLF endings and every file shows
  as modified (283 files, zero content changes). `.gitattributes` now pins LF;
  `git checkout -- .` restores a copy that drifted. The same copy flattens
  pnpm's symlinks into empty directories — `node_modules/expo` exists but is
  empty and `tsc` cannot find `expo/tsconfig.base`. Reinstall with
  `CI=true npx pnpm@10 install --frozen-lockfile` (`CI=true` lets pnpm purge
  the broken tree without a TTY).
- The design-preview harness (`/design-preview`, `lib/preview.ts`) is off in
  production bundles; a QA web export opts in with
  `EXPO_PUBLIC_DESIGN_PREVIEW=1`.
- `expo-doctor` warns about a duplicate `react` from the PARENT repo's
  node_modules (this workspace nests inside studio-monaqasati) — expected, ignore
- Run `npx expo install <pkg>` (not plain pnpm add) so versions match the SDK
- `extra.eas.projectId` in app.json is intentionally absent until `eas init` links
  the real EAS project (a fake ID breaks builds)
