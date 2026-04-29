# Contributing to DamaFlow

Thank you for your interest in contributing! DamaFlow is an open-source kendama practice tracker licensed under AGPL v3.

## Prerequisites

- Node.js ≥20 (check: `node --version`)
- npm (comes with Node.js)
- Expo Go on your iOS or Android device, OR an iOS Simulator / Android Emulator

## Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/<your-fork>/DamaFlow.git
   cd DamaFlow
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npx expo start
   ```
4. Scan the QR code with Expo Go, or press `i` for iOS Simulator / `a` for Android Emulator.

## Running Tests

```bash
npm test
```

## Running Lint

```bash
npm run lint
```

Fix any reported errors before opening a pull request.

## Developer Certificate of Origin (DCO)

All commits must include a sign-off:

```bash
git commit -s -m "your commit message"
```

The `-s` flag appends `Signed-off-by: Your Name <email@example.com>` to your commit message. This certifies that you have the right to submit the contribution under the AGPL v3 license per the [Developer Certificate of Origin](https://developercertificate.org/).

**Why we require this:** DCO sign-off is a lightweight legal mechanism that ensures every contributor affirms they have the right to contribute the code under the project's license. It protects both contributors and the project.

## Finding Issues

Browse [GitHub Issues](https://github.com/<your-username>/DamaFlow/issues) and look for the **`good first issue`** label — these are tasks scoped for new contributors.

## Pull Request Process

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b my-feature
   ```
2. Make your changes with DCO-signed commits (`git commit -s`).
3. Ensure both checks pass locally:
   ```bash
   npm test
   npm run lint
   ```
4. Open a pull request against `main` — CI will run lint and tests automatically.
5. Address any review comments. A maintainer will merge once the PR is approved and CI passes.
