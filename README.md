# CashMine payback app

React Native (Expo) slice of the CashMine app: see payback balances, claim them, and browse history.
Built for a phone screen (~390 px); on desktop it shows a centered phone-width column.

**Live:** https://dmitry-tupelo.github.io/cash-app/

On first open the app asks for an API token. It is stored only in your browser, and you can change
or remove it from **Token** in the header.

## Run locally

CI builds with Node 24.

```bash
npm install
npx expo start --web
```

Open the URL Expo prints (http://localhost:8081 by default) and paste your token.

```bash
npm test               # unit tests
npx tsc --noEmit       # type check
npm run build          # static web build into dist/
```

Pushing to `main` deploys to GitHub Pages (`.github/workflows/deploy.yml`).
The API base URL lives in `src/api/config.ts`.

## What works

- **Balances (Home)**: available, pending and claiming per asset at full precision; "Available to
  claim" total in USD with pending and claiming totals; "Updated Ns ago" with a warning when the
  server snapshot is over a minute old. Refresh button plus auto-refresh every 15 s. Loading,
  retrying, error with retry, "couldn't refresh, showing data from …" and empty states; a rejected
  token leads to "Change token".
- **Claim**: pick an asset, enter an amount or tap Max, choose a destination. Input is validated
  against the API rules (format, asset decimals, minimum, available, more than the fee); "not
  enough to claim" is shown up front. Shows the fee and the amount you receive (with USD), then a
  review step before confirming. A status screen follows the claim until it completes or fails.
- **Balance right after a claim**: the claimed amount leaves "available" immediately and stays
  that way until a server snapshot newer than the claim arrives, so it never jumps back. Failed
  claims are shown as returned.
- **Unknown claim outcome** (timeout, 5xx, network): the same request is retried with the same
  Idempotency-Key, so a claim is never created twice. "Confirming…", then "Check again"; new claims
  are paused until it is resolved, and it resumes after a page reload.
- **Activity**: paginated history of accruals, reversals and claims; claims link to their status.
- **Tests**: amount parsing and formatting, claim validation and fee, USD totals, the post-claim
  balance adjustment, which claim errors are retried, activity parsing.

Decisions, AI usage and known issues are in [NOTES.md](NOTES.md).
