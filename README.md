# Expense Dashboard

A multi-user expense dashboard with Google sign-in, Firestore storage, Gmail
receipt sync, shared workspaces with invite-based collaboration, multi-person
expense splitting, customizable categories, and an animated stats + charts
dashboard.

This started as a single 3,800+ line HTML file, then a personal-only
multi-file app, and has since grown into a real multi-user system: every
piece of data (expenses, loans, categories) lives inside a **workspace**,
and a workspace can have one member (your personal one) or several (shared
with roommates, a partner, family, etc).

## Project structure

```
index.html          Page shell + all DOM markup (forms, modals, tab panels)
css/
  styles.css         All styling (design tokens, layout, animations)
js/
  main.js               Entry point — imports every feature module
  config.js             Firebase config + Gmail client config (public values)
  state.js              Single shared app-state object
  firebase-init.js      Firebase SDK init + auth-state listener
  auth.js               Sign in / sign out / startup sequence on login
  users.js              User profile doc (users/{uid}), onboarding-complete flag
  workspaceMigration.js One-time, idempotent creation of a user's personal workspace
  workspaces.js         Workspace switcher, create/delete/leave workspace, member roster
  invites.js            Invite-by-email, accept/decline, notification bell
  categories.js         Per-workspace customizable expense categories
  vendors.js             Per-user vendor watchlist (auto-categorization on manual entry)
  onboarding.js          First-login setup wizard
  topbar.js              Top bar search + notifications
  tabs.js                Dashboard / Transactions / Loans tab switching
  modal.js               Add/Edit Expense modal, multi-person split UI
  expenses.js             Expense CRUD (Firestore) + transactions table/filters
  gmail-sync.js           Gmail OAuth + message fetching/sync
  email-parsers.js        Parses receipt emails into expense records (PickMe only so far)
  loans.js                Loan/card CRUD, loan cards, payment logging
  settings.js             Monthly budget + display name (Firestore settings/{uid})
  charts.js               Stats calculations + all chart rendering (donut, gauge,
                          trend line, heatmap, count-up animation, color helpers)
  utils.js                formatDate / escapeHtml / escapeCsv / toast / loading /
                          split-participant normalizers
  export.js               CSV export
```

Every JS file is a native ES module (`<script type="module">`), so there's
**no build step** — open `index.html` (via a local server) and it just works.

## Running locally

Browsers block ES module imports over `file://`, so serve the folder instead
of double-clicking `index.html`:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

or with Node: `npx serve .`

## Data model (Firestore)

| Collection | Doc ID | Purpose |
|---|---|---|
| `users` | `{uid}` | Profile, `defaultWorkspaceId`, `onboardingComplete`, per-user `merchantWatchlist` |
| `workspaces` | auto-ID | `name`, `type` (`personal`/`shared`), `ownerId` |
| `workspaceMembers` | `{workspaceId}_{uid}` | Membership record — `role` (`owner`/`member`), denormalized `displayName`/`email` |
| `invites` | `{workspaceId}_{invitedEmail}` | Deterministic ID so re-inviting reuses the same doc instead of duplicating |
| `categories` | `{workspaceId}` | `list: [string]` — customizable per workspace |
| `expenses` | auto-ID | `workspaceId`, `userId`, `split.participants[]` for multi-person splits |
| `loans` | auto-ID | `workspaceId`, `userId`, loan/card fields |
| `settings` | `{uid}` | Monthly budget, display name — per-user, not per-workspace |

**Everything is workspace-scoped.** Expenses/loans are queried by
`workspaceId`, not `userId` — that's what makes a shared workspace show the
same data to every member. `state.currentWorkspaceId` (in `state.js`) is the
single source of truth for which workspace is active; switching workspaces
reloads expenses, loans, categories, and the member roster.

## Firestore Security Rules

Rules are a first-class part of this architecture, not an afterthought —
access is enforced by two helper functions used throughout:

- `isWorkspaceMember(workspaceId)` — checks a `workspaceMembers` doc exists
  for the caller.
- `isWorkspaceOwner(workspaceId)` — checks the caller owns the workspace.

Joining a workspace as a `member` requires a genuine, matching, pending
invite (checked via a `viaInviteId` field on the membership doc referencing
a real invite) — not just "this record says it's about me," which would let
anyone join any workspace ID they happened to learn.

Rules aren't version-controlled in this repo yet — they live in Firebase
Console → Firestore Database → Rules. Worth exporting them into the repo
(e.g. `firestore.rules`) the next time they change, so they're diffable
alongside the code that depends on them.

## Configuration

`js/config.js` holds the Firebase project config and Gmail OAuth client ID.
These are **public, client-side values** — Firebase's own security model
relies on Firestore Security Rules and the Auth "Authorized domains" list,
not on hiding these values. If you fork this for your own project:

1. Replace `firebaseConfig` with your own Firebase project's config.
2. Replace `GMAIL_CLIENT_ID` with your own Google Cloud OAuth client ID.
3. Add whatever domain you deploy to under Firebase Auth → Settings →
   Authorized domains.
4. Copy the Firestore Security Rules over (see above) before deploying
   anywhere public — the app assumes workspace-scoped rules are in place.

## Known limitations / notes

- **Gmail sync only recognizes PickMe** (`support@pickme.lk`) receipt
  emails. The vendor watchlist (Settings → gear icon, or during onboarding)
  lets a person register other vendors for name-based auto-categorization
  today, but *actual* Gmail parsing for a new vendor needs a dedicated
  parser built against a real sample email from that vendor — add it in
  `js/email-parsers.js` and register the sender in `EMAIL_SOURCES`
  (`js/config.js`).
- **No settlement/net-balance view.** Each split expense has its own
  settled/unsettled toggle, but there's no view showing your running net
  balance with one specific person across many expenses.
- **No ownership transfer.** A workspace's owner can't hand off ownership
  to another member — they can only delete the workspace (if empty) or
  remove/leave individual memberships.
- **Category rename isn't supported**, only add/remove — renaming would
  silently orphan the old category text on existing expenses, so for now
  changing a category means removing the old one and adding the new one.
- `auth.js` deliberately keeps one `console.log("ACTIVE WORKSPACE ID:", ...)`
  on every login — it's been genuinely useful for diagnosing workspace-ID
  mismatches more than once. Safe to remove if it's not needed anymore.
