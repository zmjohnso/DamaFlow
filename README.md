# DamaFlow

**The spaced repetition practice app for kendama players.**

DamaFlow applies the [FSRS](https://github.com/open-spaced-repetition/fsrs4anki) spaced repetition algorithm to kendama skill development — telling you exactly which trick to practice today based on your history, so you stop drilling what you've already landed and start making real progress. Built on the Kendama USA curriculum. Free, open-source, offline-first.

---

## Features

- **Smart practice queue** — FSRS scheduling surfaces the right skill at the right time; your queue is sectioned into overdue, due today, and upcoming
- **Full Kendama USA curriculum** — beginner, intermediate, and advanced tiers, each skill deep-linked to its tutorial video
- **Session logging** — log reps and rate yourself (Again / Hard / Good / Easy) after every practice; the algorithm adjusts your future schedule automatically
- **Mastery tracking** — mark skills as mastered; the progress view shows per-tier completion and surfaces overdue mastered skills that need a refresher
- **Onboarding flow** — experienced players can pre-fill mastered skills at first launch, tier by tier, to skip tricks they've already landed
- **Equipment tracker** — log your kendamas, purchase dates, string replacement history, and notes; associate equipment with individual practice sessions
- **Notifications** — optional daily practice reminders with a configurable time; no FCM or APNs push server required
- **Settings** — configure how many new skills are introduced per session; reset all app data if needed
- **Offline-first, privacy-first** — all data lives on your device; no accounts, no tracking, no Google Play Services required

---

## Tech Stack

| Layer         | Technology                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Framework     | [Expo](https://expo.dev) (React Native)                                                                    |
| Navigation    | [Expo Router](https://expo.github.io/router/) (file-based)                                                 |
| Database      | [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) + [Drizzle ORM](https://orm.drizzle.team) |
| SRS Algorithm | [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)                                               |
| State         | [Zustand](https://zustand-demo.pmnd.rs)                                                                    |
| UI            | [React Native Paper](https://reactnativepaper.com) (Material Design 3)                                     |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- iOS Simulator (Mac + Xcode) or Android Emulator, or the [Expo Go](https://expo.dev/go) app on a physical device

### Installation

```bash
git clone https://github.com/zmjohnso/DamaFlow.git
cd DamaFlow
npm install
```

### Running

```bash
# Start the dev server
npm start

# Or target a specific platform
npm run ios
npm run android
```

### Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

---

## Project Structure

```
app/                    # Expo Router screens (file-based routing)
  (tabs)/
    practice/           # Practice queue, session logging, progress view
    skills/             # Skill catalog with tier filter, search, and detail
    equipment/          # Equipment list, detail, and string replacement log
    settings.tsx        # New skill cap, notifications, data reset
  onboarding/           # First-launch mastery pre-fill flow
components/             # Shared UI components
lib/
  db/                   # Drizzle schema, migrations, queries, seed data
  fsrs/                 # FSRS scheduling logic
  theme/                # Design tokens and MD3 theme config
store/                  # Zustand state stores (queue, session)
assets/
  skillCatalog.ts       # Kendama USA curriculum data
```

---

## Contributing

Contributions are welcome — whether you're a kendama player with feature ideas or a developer looking for a focused open-source project.

1. Fork the repo and create a branch: `git checkout -b my-feature`
2. Make your changes with tests where applicable
3. Sign off your commits (`git commit -s`) — the project uses the [Developer Certificate of Origin](https://developercertificate.org/)
4. Open a pull request with a clear description of what you changed and why

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting.

---

## License

[GNU Affero General Public License v3.0](./LICENSE) (AGPL-3.0)

---

## Roadmap

V1 is shipping with the full core loop. Planned future directions:

- Cloud sync (opt-in)
- Social features and leaderboards
- Location-based player discovery (opt-in, coarse location only)
- Community-contributed tricks
