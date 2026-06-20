# PFMS Mobile (Expo · iOS + Android)

React Native app that reuses the PFMS backend over its REST API (`/api/v1/**`).
Single codebase for both platforms. Logging in here shows the same data as the
web app — they share one Postgres database.

## Stack
- **Expo** (SDK 54) + **expo-router** (file-based routing, typed routes)
- **TanStack Query** — online-first data fetching + cache
- **NativeWind** — Tailwind classes in React Native
- **expo-secure-store** — bearer token in iOS Keychain / Android Keystore
- **@pfms/shared** — Zod schemas, enums, and the typed API client shared with web

## One-time setup
From the repo root (the web app must be running for the device to reach it):

```bash
cd mobile
bun install
# Align native dependency versions with the installed Expo SDK:
bunx expo install --fix
```

## Configure the backend URL
The app reads `expo.extra.apiBaseUrl` from `app.json` (default `http://localhost:3000`).
On a **physical device**, `localhost` won't reach your laptop — set your LAN IP:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.5:3000 bunx expo start
```

(iOS simulator can use `localhost`; Android emulator uses `http://10.0.2.2:3000`.)

## Run
```bash
bunx expo start        # then press i (iOS) / a (Android), or scan the QR in Expo Go
```

## How auth works
`Login` → `POST /api/v1/auth/login` (email + password) → backend mints an `ApiToken`
→ stored in secure storage → sent as `Authorization: Bearer <token>` on every request.
Create the account on the web app first; the same credentials work here.

## MVP scope
Expenses and Income (list / add / delete) + a home summary. Accounts and credit
cards are read-only pickers for linking. Everything else (full account/card CRUD,
offline sync, receipts) is a future track — see `.agent/docs/features/mobile.md`.
```
