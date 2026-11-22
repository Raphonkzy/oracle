# Development

How to run the app on your PC and how to test it. The server lives in the `oracle-api` repository. The app needs a running server.

## Layout

```
oracle/
├─ mobile/       Expo app (Android, also exported to the web)
│  ├─ src/app/        Screens (Expo Router)
│  ├─ src/components/ Components and charts
│  ├─ src/lib/        API access, local storage, chat sessions, themes
│  ├─ src/i18n/       Text in 8 languages
│  ├─ plugins/        Expo plugins for APK signing and the Windows build path
│  └─ scripts/        build-apk.sh and check-i18n.mjs
├─ shared/core/  Pure logic (no database, no UI)
└─ docs/         This file and BUILD.md, and the README screenshots
```

## Running on your PC

1. Run `npm install` in the repository root. Use Node.js 26 (the current LTS).
2. Start the server (see `oracle-api`). By default it listens on `http://localhost:3200`.
3. `cp mobile/.env.example mobile/.env`. It sets `EXPO_PUBLIC_API_URL`: `http://10.0.2.2:3200` for the Android emulator, your PC's LAN address for a real phone, `http://localhost:3200` for the browser.
4. Run `npm run android` (emulator or phone) or `npm run web` (browser).

The server only accepts web origins listed in its `CORS_ORIGINS`. For `npm run web`, set `CORS_ORIGINS=http://localhost:8081` on the server.

## Tests and checks

```bash
npm test             # shared logic (shared/core)
npm run typecheck    # core and mobile
npm run lint
npm run check:i18n   # every sentence is translated into the 8 languages
```

New sentences are written in English inside `t("...")`, then added to every file in `mobile/src/i18n/dictionaries/`. `check:i18n -- --write-guide` rebuilds `shared/core/src/guide-labels.ts` (the screen names the AI assistant reads) from the app translations. `check:i18n -- --write-keys` rebuilds `keys.json`.

## Demo mode

`EXPO_PUBLIC_DEMO_LOGIN=1` turns on sample data inside the app, with no server, so you can look at the screens. Demo mode is never part of a release build.

## Themes and language

All colors, fonts and shapes are in `mobile/src/theme.ts` (three themes and "System"). Style sheets are created with `themed(() => StyleSheet.create(...))`, so they update when the theme changes. The language follows the phone by default (`mobile/src/i18n/index.ts`). English is the fallback for any language the app does not have.

## Logo

The Oracle eye is always yellow `#FFC400` in every theme (`mobile/src/components/Logo.tsx`). Do not use `colors.accent` for the logo.
