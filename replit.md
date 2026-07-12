# Mdmak Tech Mobile

Expo/React Native companion app for the Mdmak Tech B2B procurement platform
(mdmaktech.sa) — contractors publish RFQs, suppliers submit offers, both chat and
track orders. Shares the website's Firebase backend; there is no separate mobile API.

## Run & Operate

- `cd artifacts/mobile && pnpm run dev` — Expo dev server (QR / web preview)
- `pnpm run typecheck` — full typecheck across all packages (must pass before builds)
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
- Firestore security rules live in the parent website repo (`../firestore.rules`)
  and are deployed from there

## Architecture decisions

- Arabic-first (RTL) like the website; `context/LanguageContext.tsx` drives direction
- Firestore document shapes are byte-compatible with the website (verified for
  `users`, `rfqs`, `offers`, `chats/{id}/messages`, `users/{uid}/notifications`)
- Firebase config has hardcoded public fallbacks (same pattern as the website's
  `src/firebase/config.ts`) so builds work with zero env setup
- Push notifications use Expo's push gateway (`hooks/usePushToken.ts`); token is
  stored on the user doc as `expoPushToken`

## Gotchas

- `pnpm run typecheck` pipes through nothing — never trust `tsc | tail` exit codes
- `expo-doctor` warns about a duplicate `react` from the PARENT repo's
  node_modules (this workspace nests inside studio-monaqasati) — expected, ignore
- Run `npx expo install <pkg>` (not plain pnpm add) so versions match the SDK
- `extra.eas.projectId` in app.json is intentionally absent until `eas init` links
  the real EAS project (a fake ID breaks builds)
