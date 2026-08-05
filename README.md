# Expense Dashboard

A personal expense dashboard with Google sign-in, Firestore storage, Gmail
receipt sync (PickMe rides/food/marketplace), loan/card tracking, and an
animated stats + charts dashboard.

This was originally a single 3,800+ line HTML file. It's been split into a
proper multi-file project so it's actually maintainable.

## Project structure

```
index.html          Page shell + all DOM markup (forms, modals, tab panels)
css/
  styles.css         All styling (design tokens, layout, animations)
js/
  main.js            Entry point — imports every feature module
  config.js          Firebase config + Gmail client config (public values)
  state.js           Single shared app-state object
  firebase-init.js   Firebase SDK init + auth-state listener
  auth.js            Sign in / sign out / show auth vs. dashboard view
  topbar.js          Top bar search + notifications
  tabs.js            Dashboard / Transactions / Loans tab switching
  modal.js           Add/Edit Expense modal
  expenses.js        Expense CRUD (Firestore) + transactions table/filters
  gmail-sync.js       Gmail OAuth + message fetching/sync
  email-parsers.js   Parses PickMe receipt emails into expense records
  loans.js           Loan/card CRUD, loan cards, payment logging
  settings.js        Monthly budget + display name (Firestore settings/{uid})
  charts.js          Stats calculations + all chart rendering (donut, gauge,
                     trend line, heatmap, count-up animation, color helpers)
  utils.js           formatDate / escapeHtml / escapeCsv / toast / loading
  export.js          CSV export
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

## Configuration

`js/config.js` holds the Firebase project config and Gmail OAuth client ID.
These are **public, client-side values** — Firebase's own security model
relies on Firestore Security Rules and the Auth "Authorized domains" list,
not on hiding these values. If you fork this for your own project:

1. Replace `firebaseConfig` with your own Firebase project's config.
2. Replace `GMAIL_CLIENT_ID` with your own Google Cloud OAuth client ID.
3. Add whatever domain you deploy to under Firebase Auth → Settings →
   Authorized domains.
4. Double-check your Firestore Security Rules restrict reads/writes to
   `request.auth.uid == resource.data.userId` (or similar) before deploying
   anywhere public.

## Known limitations / notes

- Gmail sync currently only recognizes PickMe (`support@pickme.lk`) receipt
  emails. Add more parsers in `js/email-parsers.js` and register the sender
  in `EMAIL_SOURCES` (`js/config.js`) to support more sources.
- `parsePickMeEmail` has a handful of `console.log` debug lines left in from
  development — harmless, but safe to strip once the parser's confirmed
  stable for your inbox.
