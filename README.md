# Finpersona Mobile

Capacitor 8 + React 19 + TypeScript shell for the Finpersona iOS/Android app. Backend lives in [`finpersona/`](../finpersona) (Next.js + Supabase).

## Phase status

**Phase 1 — auth + onboarding** is implemented. The app boots to a splash, redirects to login if no session, walks new users through a 3-step onboarding (tax year, employment, income band), then lands on a Home placeholder. Real screens land in Phase 2.

## Stack

- **Capacitor 8** — native shell, Swift Package Manager on iOS (no CocoaPods)
- **Vite + React 19 + TypeScript**
- **Tailwind v3** — design tokens in `src/styles/tokens.ts`
- **Supabase JS** — session persisted natively via `@capacitor/preferences`, falls back to `localStorage` on web
- **TanStack Query** — server state
- **Zustand** — UI/auth client state
- **React Router v6 MemoryRouter** — no URL bar on native
- **Vitest 4** + Testing Library

## Required env vars

Create `finpersona-mobile/.env.local`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_API_BASE_URL=http://localhost:3000
VITE_APPLE_SERVICES_ID=com.aexlora.finpersona.signin
```

`getEnv()` validates these on first use — missing values throw with the specific names listed. **A blank white page in dev usually means a missing/typo'd env var.**

## Local development

```bash
npm install
npm run dev               # http://localhost:5173
```

## Tests + type-check

```bash
npx vitest run
npx tsc --noEmit
```

## iOS

```bash
npm run build
npx cap sync ios
npx cap open ios          # opens Xcode → press ▶ to run on simulator
```

## Android

```bash
npm run build
npx cap sync android
npx cap open android      # opens Android Studio → press ▶
```

## Apple Sign-In setup (iOS only)

The button is gated by `Capacitor.getPlatform() === 'ios'` and the wire-up is no-op until Apple Developer + Supabase are configured.

1. **Xcode** — open `ios/App/App.xcworkspace`, select the App target → Signing & Capabilities → `+ Capability` → "Sign in with Apple".
2. **Apple Developer portal** — create a Services ID matching `VITE_APPLE_SERVICES_ID` (`com.aexlora.finpersona.signin`), generate a Sign-In with Apple key, capture Team ID + Key ID.
3. **Supabase dashboard** — Authentication → Providers → Apple, paste Services ID + Team ID + Key ID + Private Key.
4. Run on a real iPhone (Simulator does not support Apple Sign-In).

## Project structure

```
src/
  app/              Routes, RequireAuth, RequireOnboarded, Providers
  components/       PhoneShell, SafeArea
  features/auth/    LoginScreen, SignupScreen, OnboardingScreen, apple-sign-in
  hooks/            useAuth, useAuthBootstrap
  lib/
    env.ts          Lazy validated env reader
    supabase/       Client + Capacitor Preferences storage adapter
  screens/          Splash, Placeholder
  stores/           authStore, uiStore
  styles/tokens.ts  Design tokens (single source of truth for Tailwind)
```

## Visual design source

`../Finpersona-mobile-build/` holds the JSX mockups used as visual reference. Phase 2+ ports those screens; tokens are already aligned.
