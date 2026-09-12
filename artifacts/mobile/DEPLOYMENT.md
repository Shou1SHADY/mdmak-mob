# Mdmak Tech Mobile — Deployment Guide

Expo SDK 54 / React Native 0.81 app for the Mdmak Tech B2B procurement platform.
It shares the **same Firebase project as the website** (`studio-2889504658-6ee2a`,
mdmaktech.sa) — same Auth users, Firestore collections (`users`, `rfqs`, `offers`,
`chats`, `users/{uid}/notifications`), and security rules. There is no separate
mobile backend.

## Backend / sync

- Firebase config lives in `lib/firebase.ts` with hardcoded fallbacks identical to
  the website's `src/firebase/config.ts`. Env vars (`EXPO_PUBLIC_FIREBASE_*`)
  override them — only needed to point at a different project.
- Firestore rules are owned by the website repo (`firestore.rules` at the repo
  root) and deployed from there. Rule changes must stay compatible with both apps.
- Canonical data values (categories, cities, districts, status enums) are mirrored
  from the website's `src/lib/constants.ts` into `constants/data.ts`. **If the
  website list changes, update `constants/data.ts` to match** — Arabic strings are
  the stored Firestore values.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `EXPO_PUBLIC_FIREBASE_*` (6 vars) | No | Fallbacks in `lib/firebase.ts` point at the production project already; also set explicitly in `eas.json` production profile. |
| `EXPO_PUBLIC_FIREBASE_CLIENT_ID` | For native Google sign-in | The **Web client** OAuth 2.0 client ID from Google Cloud Console → Credentials (Firebase project). Web builds use `signInWithPopup` and don't need it. Set it as an EAS environment variable for production builds. |
| `EXPO_PUBLIC_SITE_URL` | UAT builds | Base URL of the website whose API the app calls for registration (`/api/invitations/*`), the access-request form and the AI assistant. Defaults to `https://mdmaktech.sa`; set the UAT site's URL in `.env.uat`. |
| `EXPO_PUBLIC_DESIGN_PREVIEW` | Design QA only | `1` re-enables the `/design-preview` fixture harness in a production web export. Never set it for a build users receive. |

## Registration and the website's API

Accounts are created by invitation only (as on the website since 2026-08-04).
The register screen resolves the invitation token against
`GET {SITE_URL}/api/invitations/lookup`, creates the Firebase Auth user, then
calls `POST {SITE_URL}/api/invitations/accept` with the user's ID token; the
website creates the Firestore profile and links the organization. Native
builds call these routes directly. **A PWA build is a different origin** from
the website, so the website's `src/middleware.ts` allow-lists the PWA origins
(`src/lib/cors.ts`: `mdmak-mobile-uat.web.app`, its `firebaseapp.com` twin,
and localhost dev servers on UAT). A new hosting site must be added there — or
to the website's `CORS_EXTRA_ORIGINS` env — before its PWA can register.
Google sign-in from a PWA additionally needs the PWA's domain in the Firebase
project's Auth → Authorized domains. Sign-in with email, and everything after
it, is Firestore-direct and unaffected.

## One-time EAS setup

1. `npm i -g eas-cli && eas login` (Expo account that will own the app)
2. From `artifacts/mobile/`: `eas init` — creates/links the EAS project and writes
   the real `extra.eas.projectId` (a UUID) into `app.json`. A placeholder was
   intentionally removed; builds fail with a fake ID.
3. For native Google sign-in: `eas env:create --name EXPO_PUBLIC_FIREBASE_CLIENT_ID --value <web-client-id>`
4. Add the app's OAuth redirect / SHA-1 fingerprints:
   - Android: after the first build, `eas credentials` shows the SHA-1 → add it to
     the Firebase project (Project settings → Android app) if you later switch to
     native Google Play sign-in.
   - Firebase Auth → Settings → Authorized domains already covers web.

## Build commands (run from `artifacts/mobile/`)

```bash
pnpm run typecheck        # must pass before any build
pnpm run eas:preview      # internal APK + iOS simulator build
pnpm run eas:prod         # store builds (production profile)
pnpm run build:web        # static web export (dist/) if needed
```

## Web (PWA) hosting — UAT and production

Two Firebase Hosting sites, one build output. Build `dist/` for the target
first, then deploy only that target — the env file baked into `dist/` must
match the site it lands on:

```bash
cd artifacts/mobile
npm run build:web:uat            # .env.uat  → mdmaktech-uat
cd ../.. && firebase deploy --only hosting:uat --project uat     # mdmak-mobile-uat.web.app

cd artifacts/mobile
npm run build:web:prod           # .env.prod → studio-2889504658-6ee2a
cd ../.. && firebase deploy --only hosting:prod --project prod   # mdmak-mobile.web.app
```

Where the CLI cannot log in, point it at a service account instead:
`GOOGLE_APPLICATION_CREDENTIALS=<key.json> npx firebase-tools deploy ...`.
Both PWA origins are allow-listed on the website's API (`src/lib/cors.ts`) and
must be in each Firebase project's Auth → Authorized domains for Google sign-in.

## Store submission checklist

- [ ] `eas init` done, `extra.eas.projectId` present in `app.json`
- [ ] Bundle IDs: iOS `com.mdmaktech.app`, Android `com.mdmaktech.app` (set in `app.json`)
- [ ] Icons/splash present in `assets/images/` (icon, adaptive-icon, splash-bg) ✓
- [ ] `EXPO_PUBLIC_FIREBASE_CLIENT_ID` set in EAS env (native Google sign-in)
- [ ] Test login + register against production Firestore rules on a preview build
- [ ] Verify Arabic (RTL) and English rendering on device
- [ ] `eas submit -p ios` / `eas submit -p android` (store credentials required)

## Push notifications (currently disabled)

- Push registration is intentionally **disabled**: the `usePushToken()` call in
  `app/_layout.tsx` is commented out so users see no permission prompt until the
  EAS project and push credentials exist. Re-enable it after the steps below.
- `hooks/usePushToken.ts` registers the device with Expo's push gateway and saves
  `expoPushToken` on the user's Firestore doc. It no-ops on web/simulators and
  when `extra.eas.projectId` is missing (i.e. before `eas init`).
- After `eas init`, configure push credentials once:
  - Android: `eas credentials` → set up **FCM V1 service account** (from the same
    Firebase project's settings → Cloud Messaging).
  - iOS: `eas credentials` → let EAS manage the **APNs key**.
- Sending: a Cloud Function (website repo `functions/`) or server can POST to
  `https://exp.host/--/api/v2/push/send` with the stored `expoPushToken`.

## Known notes

- Arabic is the primary locale; `context/LanguageContext.tsx` drives RTL. The i18n
  dictionaries (`i18n/ar.ts` / `i18n/en.ts`) are parity-enforced by the
  `Translations` type — typecheck fails if a key is missing in either language.
- The workspace's `api-server` / Postgres packages (`lib/db`, `lib/api-*`) are
  unused scaffolding from the original template; the mobile app talks only to
  Firebase and does not need them at runtime or deploy time.
- `npx expo-doctor` reports a "duplicate react" between this workspace and the
  parent website repo's `node_modules` (this workspace lives inside the
  studio-monaqasati repo). Metro resolves from the pnpm workspace root
  (`mdmak-mob/`), so the parent copy is not bundled — the warning is expected.
