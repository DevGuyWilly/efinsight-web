# EFinSight web

React frontend for EFinSight: connect a UK bank (TrueLayer), import 90 days of transactions, then ask an AI advisor about spending, budgets and investing. It talks to the Spring Boot API in the `EFinSightAI` repo.

**Stack:** React 18, TypeScript, Vite, Tailwind CSS 3, React Router 6, TanStack Query 5, react-hook-form + zod, react-markdown (sanitised), Vitest. Design tokens (light and dark) live in `src/styles/tokens.css`; Tailwind colour utilities are generated from that file.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173, open this, not :8080
npm run mock       # optional: fake API on :8080 (jamie@example.com / password123)
npm test           # unit tests
npm run build      # typecheck + production build
```

The backend has no CORS config, so the browser only talks to the Vite origin. Vite proxies `/api`, `/callback` and `/auth/connect-bank` to `http://localhost:8080` (override with `VITE_DEV_PROXY_TARGET`). No `.env` is needed.

## Bank connection

**Connect bank** navigates the whole page to `/auth/connect-bank?token=<jwt>` (the backend takes the JWT as a query parameter). After the bank, TrueLayer returns to `<app origin>/callback`; the backend handles it and redirects to `/auth/success` or `/auth/error`, which are React routes (`BankCallbackPage`, also reachable as `/onboarding/callback?status=success|error`).

So the backend's `TRUELAYER_REDIRECT_URI` must be `<app origin>/callback` (`http://localhost:5173/callback` locally) and registered in the TrueLayer console.

With no `/api/me` endpoint, the callback page calls `/api/transactions/count` once; success marks the bank connected locally. A count above 0 does the same on any page load.

## Setup flow

| State | Route |
| --- | --- |
| Bank not connected | `/onboarding/bank` |
| Connected, 0 transactions | `/onboarding/import` |
| Transactions stored | `/app/*` |

"Do this later" lets a user into the app early; data pages then show a prompt to finish setup. Settings is always reachable.

## Auth

- JWT in `localStorage`, sent as `Authorization: Bearer` from one place (`src/api/client.ts`).
- No refresh. A 401 clears the session and redirects to `/login` with a notice; you return to the page you were on. A 403 from a protected endpoint is treated the same (Spring answers unauthenticated requests with 403).
- Login and signup accept both the flat response the backend returns (`{ token, userId, email, ... }`) and `{ token, user: {...} }`.

## Pages

| Route | |
| --- | --- |
| `/` | Landing (sample answer, labelled as sample data) |
| `/login`, `/signup` | Guests only |
| `/onboarding/bank`, `/onboarding/import`, `/onboarding/callback` | Setup steps |
| `/app/dashboard` | KPIs, 13-week spending, top merchants, recent transactions |
| `/app/transactions` | Search, filters, sort, client-side paging (12 per page), detail dialog |
| `/app/advisor` | Ask a question; progress, Stop, answer with sections and cited transactions |
| `/app/settings` | Read-only profile, reconnect bank, import, reprocess, theme, advice history, sign out |

## Backend behaviour the UI accounts for

- `transactionCategory` is a transaction type (`PURCHASE`, `TRANSFER`, `DIRECT_DEBIT`, ...), so filters list the values present. Top merchants group by merchant name, falling back to the description.
- `/api/transactions` is unpaged: fetched once, then filtered, sorted and paged in memory.
- Money is parsed to integer pence and formatted with `Intl.NumberFormat('en-GB')`. Direction comes from `transactionType`, falling back to the amount's sign.
- `/api/plan` takes only a question (no follow-up context), takes 5-15 s (60 s timeout, Stop button), and `success: false` on HTTP 200 is an error. Only returned sections render. Markdown is sanitised and links open with `rel="noopener noreferrer"`.
- Citations carry the numeric row id and are joined to the loaded transactions on `id`.
- Ingest and reprocess are long POSTs: indeterminate progress, and on a timeout "Check status" re-reads the count before retrying. A failed import offers "Reconnect bank". The backend skips transactions it already has.
- Not available on the backend: disconnect bank (shown disabled), profile edit (read-only), advice history (stored in `localStorage` per user and device, not synced). "Last import" is recorded locally.

## Deploy (Render)

`render.yaml` defines a static site that proxies `/api/*`, `/callback` and `/auth/connect-bank` to the API and serves the app for everything else, so the API needs no CORS config.

1. Deploy the API first (its repo has a Dockerfile and `render.yaml`).
2. Replace `API_URL` in `render.yaml` with the API's URL, commit, push.
3. In Render, New > Blueprint, select this repo.
4. Set the API's `TRUELAYER_REDIRECT_URI` to `https://<this-site>/callback` and add it to the TrueLayer console.

Render's docs don't say whether rewrites keep query strings or how rules are ordered; connecting a bank tests both. If long imports or the callback fail through the proxy, set `VITE_API_BASE_URL` to the API's URL instead and add CORS plus a redirect to this site on the backend.

## Layout

```
src/api/         fetch client (auth header, timeout, 401), endpoints, types
src/app/         routes, guards (RequireAuth, PublicOnly, RequireSetup)
src/components/  ui, layout, feedback, bank, dashboard, transactions, advisor
src/hooks/       useSetupState, useTransactions, useIngest, usePlan
src/lib/         money, dates, transaction logic, session, storage, config
src/pages/       one folder per screen
src/stores/      auth, theme, advice history
scripts/mock-backend.mjs   dependency-free stand-in for the API
tests/                     Vitest
```

## Known gaps

Terms and Privacy links are placeholders. Backend wishlist: one-time connect URL instead of the JWT in the query string, `GET /api/me`, 401 instead of 403, and endpoints for disconnect, profile update and advice history.
