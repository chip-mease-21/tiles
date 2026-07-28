# Going live

Second draft. The first one was written blind. Your repo is public, so I cloned it, did the integration for real, and built it with your own toolchain. Most of what follows is now verified rather than assumed, and three things I had wrong are corrected below.

Step 0 is done. Start at step 1.

---

## What reading the repo changed

**Two of the old steps are already answered.** You do not need to do them.

*Old step 2, the `entries` update rule.* The hole is real. Your live rule is:

```
allow read, update, delete: if request.auth != null
  && request.auth.uid == resource.data.userId;
```

It checks the document that already exists and never checks the one being written. So a signed-in user can take one of their own tiles and change `userId` to somebody else's uid, pushing a tile into that person's private board. Nobody can *read* anyone else's data — this is a write-in, not a read-out — and with the people currently using Tiles the practical risk is close to nil. It is still a one-line fix and it is already in the new ruleset:

```
allow update: if signedIn()
  && resource.data.userId == request.auth.uid
  && request.resource.data.userId == resource.data.userId;
```

*Old step 3, the query filter.* Present and correct. It is in `src/lib/useEntries.ts`, not `Board.tsx` — `Board.tsx` only renders what it is handed. Nothing to change.

**One thing I would have broken.** My ruleset had no rule for `userdata/{uid}`, which is where Tiles keeps everyone's tag categories. Deploying it as written would have silently denied every tag write for every user — no crash, no error dialog, tags just stop filing. That collection is now carried over unchanged, with four tests around it. This is the argument for reading the code you are replacing rather than the code you think you are replacing.

**Three assumptions that were wrong, now fixed in the source.**

Sign-in is Google popup, not a passwordless email link. That is better for you — your staff are already on Google Workspace, so seating them is one click each.

The send-to-Tiles feature would not have worked. It wrote `column: 'This Week'`; your real column ids are lowercase (`today`, `this_week`, `someday` and so on). The tile would have been created and then rendered in no column at all — the worst kind of failure, because nothing errors. It also omitted `position` on the task object, which your `Task` type requires. Both fixed, and `src/lib/me.ts` now imports your `ColumnId` and `Task` types directly, so if you ever rename a column this stops compiling instead of silently misfiling.

Deployment is GitHub Pages out of `docs/`, not Firebase Hosting. Your README says Hosting; your repo says otherwise. Step 7 follows the repo.

---

## Step 1. Apply the branch

I did this integration in a clone and it typechecks and builds clean against your real dependencies — `tsc -b` with your strict settings, then `vite build`, 89 modules, no warnings that were not already there.

```bash
cd path/to/tiles
git checkout -b dlt-workspace
git apply dlt-workspace.patch
npm install
npm run build
```

**Expect:** a clean build. 28 files: 24 new, plus edits to `firestore.rules`, `firebase.json`, `.gitignore` and `src/App.tsx`.

What the patch does to code you already own is small and worth knowing. Your `src/App.tsx` is renamed to `src/TilesApp.tsx` untouched apart from the function name, and a four-line `App.tsx` takes its place that wraps it. `firebase.json` gains an indexes entry and an emulator block. `.gitignore` gains `serviceAccount.json`, which matters in step 5.

**Undo:** `git checkout main && git branch -D dlt-workspace`.

---

## Step 2. Run the rules tests

This is the gate, and it is the one step I cannot do for you. The Firestore emulator downloads its binary from a Google Cloud address my environment cannot reach, so the suite has still never executed anywhere.

```bash
npm install --save-dev firebase-tools @firebase/rules-unit-testing
npx firebase emulators:exec --only firestore --project demo-tiles "node rules.test.mjs"
```

First run downloads the emulator, so give it a minute.

**Expect:** `155 passed, 0 failed`.

**If anything fails, stop and send me the output.** A failure names the exact rule and the exact operation, which is normally a one-pass fix. Do not deploy rules that fail their own tests, and do not put anything else on top of them.

---

## Step 3. Deploy the rules

```bash
npx firebase deploy --only firestore:rules,firestore:indexes --project tiles-4972a
```

Then open Tiles and confirm your board loads, a tile saves, and the tag manager still files a tag. That last one is the `userdata` check.

**Undo:** `git show main:firestore.rules > firestore.rules` and deploy again. Under a minute.

At this point nothing has changed for any user. New rules, same app.

---

## Step 4. Create the org and seat yourself

There is no bootstrap path in the rules on purpose — a bootstrap path is an escalation path. The first seat goes in by hand.

Firebase console for `tiles-4972a`, Authentication, Users. Copy your own uid.

Then in Firestore create two documents:

```
orgs/thepoint
  name: "The Point Church"

orgs/thepoint/members/<your-uid>
  name:     "Chip Measells"
  email:    "chip@thepointcville.com"
  role:     "admin"
  active:   true
  campusId: null
```

Field types matter. `active` is a boolean, `campusId` is null, `role` is the string `admin`.

---

## Step 5. Seed the board

Project settings, Service accounts, Generate new private key. Save it as `serviceAccount.json` in the repo root. The patch already added it to `.gitignore` — confirm with `git status` that it does not appear. It is a credential.

```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
ORG_ID=thepoint CHIP_UID=<your-uid> DRY_RUN=1 node scripts/seed.mjs
```

Read what it plans to write, then run it again without `DRY_RUN=1`.

It writes 48 documents: your rocks, issues, the June 8 Pantops decision, the campuses, NextGen, HR, Communications and Local Reach, culture grades, both pictures, and your twelve private role cards with their expectations.

Matt, Gabe and Rachel have no uid until they sign in once, so their seats come in step 7. Matt's rocks land unassigned and you reassign them by dragging.

**Undo:** documents are written by known id, so re-running overwrites rather than duplicates. To start clean, delete the `orgs/thepoint` and `users/<your-uid>` trees in the console.

---

## Step 6. Look at it

```bash
npm run dev
```

**Three things to check.**

Your own board works exactly as before and now has tabs above it: My tiles, My roles, DLT board, Team, Members.

The DLT board shows your real rocks and issues. Change a rock's status — it should refuse to save without a note, then save with one, and your name should appear on the row.

Open a private window and sign in as nobody seated. That person should see precisely the Tiles they saw yesterday: no tabs, no new navigation, nothing in the console. This is the one that matters most.

Then send one role item to Tiles from My roles and confirm it lands in This Week with its next step as a checkbox. That is the path I had wrong, so it is worth seeing with your own eyes.

**If the DLT board is empty but the tests passed,** it is almost always the semester. The seed writes `2026-summer`; the board reads the semester from `orgs/thepoint/meta/settings`. Check they match.

---

## Step 7. Publish, then seat the team

Your live site is GitHub Pages served from `docs/`, so publishing is a build and a commit:

```bash
npm run build
rm -rf docs && cp -r dist docs
git add -A && git commit -m "DLT Workspace" && git push
```

Merge to `main` first if Pages is serving from `main`.

Send Matt, Gabe and Rachel the link. They sign in with Google using their church accounts and land on a screen showing their id and a copy button. They send you the id; you paste each one into Members and pick DLT.

Then drag Matt's rocks into his column.

Rachel Crowder, rachel@thepointcville.com.

**Say one thing when you send that link.** Their roles card and their weekly reviews are private, nothing is shared unless they turn it on, and there is no setting anywhere that shares a weekly review with anybody. If you do not say it, they will assume you can read everything — and the whole value of the thing depends on someone being willing to write down the role they have been avoiding. Worth saying in the room rather than in the email.

---

## Step 8. Run one meeting from it

Before you change anything on the spreadsheet, run one full DLT meeting from the app with the sheet open beside you as a safety net.

If it holds, set the sheet to view only and put the app link in cell A1. Do not delete it — the archive URL is stored at `orgs/thepoint/meta/settings.sheetArchiveUrl`.

**The date worth aiming at is August 17**, when Fall rock setting starts. The app already has an empty Fall board waiting. Live before then and Fall rocks get set in the app and the sheet never gets another entry, which is a far cleaner break than migrating mid-semester. Three weeks from today, for maybe two hours of actual work.

---

## When something goes wrong

**Permission denied on the Tiles board.** Almost certainly `userdata`, not `entries`. Confirm the deployed ruleset has the `userdata/{userId}` block.

**Permission denied writing a rock or an issue.** The write did not carry its audit stamp. Every rock and issue write needs `updatedBy` set to your uid and `updatedAt` as `serverTimestamp()`. Anything going through `src/lib/org.ts` already does; the cause is usually a write added somewhere else.

**A status change is rejected even with a stamp.** It moved status without a note. Deliberate.

**An issue will not close.** It needs a linked decision or a written close reason. Also deliberate.

**The query requires an index.** The console error contains a link that builds it. The two you should already have are in `firestore.indexes.json`.

**Somebody's shared card does not appear.** Sharing is per person and revocable. Check their share settings before suspecting the rules.

---

## What I need back

The output of the rules run in step 2, whatever it says. That is the only thing still standing between this and a deploy.

Matt's and Gabe's uids once they have signed in.
