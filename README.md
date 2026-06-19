# Tiles

A tag-driven idea & task board. Capture an idea in two taps; organize it later by
dragging tiles between **Notes · Today · This Week · Someday**. Each tile is a markdown
**Note** or a **To-Do list** with checkboxes and due dates. Tags are alphabetical and
filterable. Built mobile-first as an installable PWA, synced across your devices.

Stack: React + Vite + TypeScript + Tailwind, drag-and-drop via dnd-kit, and Firebase
(Firestore + Auth + Hosting) for realtime sync, passwordless login, and offline capture.

---

## 1. Prerequisites

- Node.js 18+ and npm
- A Firebase project (free "Spark" plan is fine) named **Tiles**

## 2. Set up Firebase (one time)

1. At <https://console.firebase.google.com> create a project named **Tiles**.
2. Add a **Web app** (`</>`). Copy the `firebaseConfig` values.
3. **Build → Firestore Database → Create database** (production mode, region near you).
4. **Build → Authentication → Get started**, enable **Email/Password**, and inside it
   turn on **Email link (passwordless sign-in)**.
5. **Authentication → Settings → Authorized domains**: make sure `localhost` is listed
   (it is by default) and later add your live hosting domain.

## 3. Run locally

```bash
npm install
cp .env.example .env.local      # then paste your Firebase values into .env.local
npm run dev                     # open the printed http://localhost:5173
```

Sign in with your email — Firebase sends a one-time link; open it on the same device.

## 4. Deploy your Firestore security rules

The rules in `firestore.rules` restrict every entry to the user who created it.

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # pick your Tiles project, alias it "default"
firebase deploy --only firestore:rules
```

## 5. Deploy the app (Firebase Hosting)

```bash
npm run build                 # outputs to dist/
firebase deploy --only hosting
```

Firebase prints your live URL. Add that domain under Authentication → Authorized domains
so email-link sign-in works in production. On your iPhone, open the URL in Safari →
Share → **Add to Home Screen** to install it like an app.

### Optional: auto-deploy from GitHub
Run `firebase init hosting:github` to wire up a GitHub Action that deploys on every push
to `main`.

---

## How it works (data model)

Single Firestore collection `entries`; each document is one tile. To-Do checkboxes live
in a `tasks` array on the entry. Fields: `userId, type('note'|'todo'), title, body,
column, position, tags[], dueDate, pinned, tasks[], createdAt, updatedAt`. Ordering uses
a float `position` so reordering never renumbers the whole column. Realtime listeners
(`onSnapshot`) keep devices in sync; Firestore offline persistence queues writes made
while offline.

## Project structure

```
src/
  App.tsx                 app shell, login gate, capture button
  types.ts                shared types + the 4 columns
  lib/firebase.ts         Firebase init (reads .env.local)
  lib/useAuth.ts          email-link sign-in
  lib/useEntries.ts       realtime Firestore hook + create/update/delete
  lib/sort.ts             tag/sort/filter helpers
  components/Board.tsx    dnd-kit board + drag logic
  components/Column.tsx   one column + per-column sort
  components/Tile.tsx     a card
  components/TileEditor.tsx  note/todo editor (autosaves)
  components/QuickAdd.tsx    frictionless capture
  components/TagBar.tsx      search + alphabetical tag filter
  components/Login.tsx       email-link login screen
firestore.rules           per-user security rules
firebase.json             Firestore + Hosting config
```

## Roadmap (Phase 2)
Subtags, per-task due dates, light/dark toggle, reminders/notifications, SMS capture,
shared/team boards.
