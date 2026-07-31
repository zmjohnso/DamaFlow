# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start               # Expo dev server
npm run android         # Run on Android emulator/device
npm run ios             # Run on iOS simulator/device
npm test                # Run full Jest test suite
npm test -- path/to/file.test.ts          # Run a single test file
npm test -- --testNamePattern="test name" # Run a specific test by name
npm run lint            # ESLint
```

**`android/` is not committed** — it's gitignored (`/android` in `.gitignore`) and regenerated
on demand via Expo's Continuous Native Generation. Run `npx expo prebuild --platform android`
(or just `npm run android`, which does this automatically) before any `./gradlew` command if
the directory doesn't exist locally yet. Release-build customizations (signing config, version
overrides, real-device-only architecture defaults) live in `plugins/withReleaseConfig.js`
(referenced from `app.json`'s `plugins` array), **not** as hand edits to the generated
`android/app/build.gradle` / `gradle.properties` — those get wiped on every prebuild, so any
future change to release build behavior belongs in that plugin file, not in `android/` directly.

**Android APK build** requires Java 21 (not 17, not 25+):
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
npx expo prebuild --platform android   # only if android/ doesn't exist locally yet
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
# Output: android/app/build/outputs/apk/release/app-release.apk
```
The `-PreactNativeArchitectures` override is required for distributable builds — without
it, the default `gradle.properties` value bundles x86/x86_64 native libraries too (needed
only for emulators, never real devices), pushing the APK from ~42MB to ~81MB and over the
50MB budget (NFR5). Leave the default in place for local `npm run android`/emulator use.

**This produces a debug-signed APK** unless `DAMAFLOW_RELEASE_STORE_FILE` and friends are
set (see below) — fine for local testing, but Android refuses to install a differently-signed
APK over an existing install, so anything actually distributed must be signed with the real
release key every time.

## Release Process

Releases are built and published by `.github/workflows/release.yml`: push a tag matching
`vX.Y.Z` (e.g. `git tag v1.2.3 && git push origin v1.2.3`) and it regenerates `android/` via
prebuild, builds a signed/minified/real-device-only APK, and attaches it to a GitHub Release —
this is what [Obtainium](https://github.com/ImranR98/Obtainium) tracks for install/update.
`versionCode`/`versionName` are derived from the tag, not hand-maintained anywhere. You can
also trigger it manually from the Actions tab (`workflow_dispatch`) against an existing tag.

**One-time setup** — the release signing key is *not* in this repo (`*.keystore` is
gitignored); it lives wherever it was generated, plus four GitHub Actions repo secrets:

```bash
gh secret set DAMAFLOW_RELEASE_KEYSTORE_BASE64 < damaflow-release.keystore.b64
gh secret set DAMAFLOW_RELEASE_STORE_PASSWORD --body "<password>"
gh secret set DAMAFLOW_RELEASE_KEY_ALIAS --body "damaflow-release"
gh secret set DAMAFLOW_RELEASE_KEY_PASSWORD --body "<password>"
```

**This keystore is irreplaceable** — losing it means every future release must ship as a
different app (new package identity) since Android rejects a differently-signed update over
an existing install. Keep a backup of the `.keystore` file and its password somewhere durable
(password manager, encrypted backup) outside of git and outside any single machine.

**Building a real release-signed APK locally** (e.g. to test before tagging), with the
keystore available locally:
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
export DAMAFLOW_RELEASE_STORE_FILE=/path/to/damaflow-release.keystore
export DAMAFLOW_RELEASE_STORE_PASSWORD="..."
export DAMAFLOW_RELEASE_KEY_ALIAS=damaflow-release
export DAMAFLOW_RELEASE_KEY_PASSWORD="..."
npx expo prebuild --platform android   # only if android/ doesn't exist locally yet
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
```

**Future distribution channels** (not yet wired up): F-Droid builds from source via its own
infrastructure against a submitted recipe (it would run the same `prebuild` + `gradlew`
sequence, unsigned — F-Droid applies its own signing), not from this pipeline's artifacts. The app
already meets F-Droid's reproducibility/no-proprietary-deps bar. Google Play and the App
Store need separate signing/submission flows (Play App Signing, Apple's own certificates)
and aren't covered by this workflow.

## Architecture

DamaFlow is a spaced-repetition kendama practice app. It uses the FSRS v5 algorithm to schedule practice sessions.

### Layer Overview

**Navigation** — Expo Router (file-based). `app/_layout.tsx` initializes the DB, runs migrations, loads stores, and redirects to `/onboarding` if `onboarding_complete` is unset. The four-tab interface lives under `app/(tabs)/`. All navigation paths inside tabs must use the full `/(tabs)/...` prefix — omitting it sends users to `+not-found`.

**State** — Three Zustand stores in `store/`:
- `appStore` — onboarding flag, theme preference (persisted to SQLite settings table)
- `queueStore` — practice queue loaded from DB at startup; `loadQueue()` fetches, sorts, and caps rows in memory; pure helpers `sortQueueItems` / `capNewSkills` are unit-testable
- `sessionStore` — ephemeral session state (current skill, ratings) cleared after each session

**Database** — Expo SQLite via Drizzle ORM. Single connection in `lib/db/client.ts` with `PRAGMA foreign_keys = ON` and `enableChangeListener: true`. Migrations auto-run at startup via `runMigrations()` before any screen renders. All query helpers are in `lib/db/queries.ts`. Schema table order matters (referenced tables before dependents).

**Scheduling** — `lib/fsrs/scheduler.ts` wraps `ts-fsrs`. Two FSRS instances: standard `f` (with learning steps) and `fBulk` (New→Review directly, used during onboarding to pre-fill mastered skills). `toCard()` reconstructs `last_review` from persisted `due` and `scheduled_days` because ts-fsrs v5 needs `elapsed_days`.

**UI** — React Native Paper (Material Design 3). Custom light/dark themes in `lib/theme.ts`. Theme preference is read from the settings table and falls back to the system color scheme.

### Data Flow

User rates a practice attempt → `sessionStore` holds the rating → `schedule()` computes next FSRS state → DB updated via `queries.ts` → `queueStore.loadQueue()` refreshes → queue UI re-renders.

### Key Patterns

- **Dates**: stored as ISO 8601 strings. Queue sectioning uses `new Date().toLocaleDateString('sv')` (Swedish locale → `YYYY-MM-DD`) for local calendar date. Always compare as `Date` objects, not strings.
- **FSRS ratings**: 1=Again, 2=Hard, 3=Good, 4=Easy. States: 0=New, 1=Learning, 2=Review, 3=Relearning.
- **Testing**: DB is mocked at the Jest module level — tests never touch a real SQLite file. Test files are co-located with source (`queries.ts` → `queries.test.ts`).
- **Notifications**: All local (Expo Notifications), no remote push services.
