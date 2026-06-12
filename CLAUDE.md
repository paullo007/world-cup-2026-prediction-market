# World Cup 2026 Prediction Market — Project Map (CLAUDE.md)

Durable map for this project. The volatile "you-are-here" lives in `PROGRESS.md` (same folder).
Deep archive of past sessions: `../SESSION MD CODE HISTORY/SESSION_LOG.md`.

## What it is
A Polymarket-style **play-money** prediction market for the FIFA World Cup 2026
(Jun 11 – Jul 19, 2026). Binary YES/NO markets priced by an LMSR automated market maker.
New accounts start with 1,000 coins; winning shares pay 1 coin on admin resolution.

- **Live:** https://world-cup-2026-prediction-market.vercel.app
- **Repo:** https://github.com/paullo007/world-cup-2026-prediction-market (public)
- **Local (code root):** `…/08_WORLD CUP PREDICTION MARKET/World Cup 2026 Prediction Market`

## Stack
Next.js 14 (App Router) · TypeScript · Tailwind · Prisma · PostgreSQL on **Supabase
(region ap-southeast-1, Singapore)** · NextAuth (credentials) · hosted on **Vercel**
(GitHub auto-deploy on `main`).

## How to run / test
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # prisma generate && next build  (use to catch type/build errors)
npm run lint
npm run db:push    # push prisma schema to DB
npm run db:seed    # tsx prisma/seed.ts — admin user + markets
```
`.env` (gitignored) holds `DATABASE_URL` (pooled, 6543, pgbouncer), `DIRECT_URL` (5432),
`NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Seed refuses to run
without `ADMIN_PASSWORD`. Results pipeline adds `CRON_SECRET` (protects the cron route;
Vercel sends it as a Bearer token) and `THESPORTSDB_API_KEY` (free key "3" default; ESPN
needs no key). Set `CRON_SECRET` + `THESPORTSDB_API_KEY` in Vercel env too.

## Architecture / key files
| Path | Purpose |
|---|---|
| `lib/amm.ts` | LMSR market-maker math (price, cost, shares) |
| `lib/trade.ts` | Atomic trade execution & market resolution (Prisma transactions) |
| `lib/auth.ts`, `lib/db.ts` | NextAuth config; Prisma client |
| `lib/flags.ts` | country → flag emoji (48 teams) + `matchTeams()` parser + `ALL_TEAMS` |
| `lib/kickoffs.ts` | FIFA-verified UTC kickoff for all 72 group matches |
| `lib/venues.ts` | official FIFA venue names for all 72 group matches |
| `lib/bracket.ts` | knockout bracket data (R32→Final, kickoffs, venues) — static, no DB |
| `lib/utils.ts` | `formatWCD()` currency, `firstName()`, `formatDate()`; `awaitingResult()` = closed-but-unresolved rule |
| `lib/results.ts` | Dual-source results: `fetchEspn()` + `fetchTheSportsDB()`, team-name normalize/alias, `mergeForMarket()` cross-check (✓ agree / ⚠ disagree) |
| `app/api/cron/results/` | Vercel Cron (CRON_SECRET-gated): ingests both sources, writes **pending** result only (never pays) |
| `app/api/admin/approve-result/` | Admin gate: resolves a market via its stored `pendingOutcome` → `resolveMarket()` |
| `app/admin/sources/` | Diagnostic: ESPN vs TheSportsDB side-by-side (accuracy/coverage) |
| `components/ApproveResultButton.tsx` | Admin "Approve" button for an auto-detected pending result |
| `prisma/schema.prisma` | Users, markets (AMM state), positions, trades, `BracketAssignment` |
| `prisma/seed.ts` | admin + markets (winner / 72 matches / knockouts / crazy predictions) |
| `app/page.tsx` | home: hero + category pills (Matches · Bracket · Knockouts · …) |
| `app/markets/[slug]/` | market detail: chart, trade panel, activity |
| `app/bracket/`, `app/admin/bracket/` | public bracket; admin slot-assignment editor |
| `app/admin/` | resolve markets (ADMIN role only) |
| `components/FitText.tsx` | auto-fit title to box + scaled centered subtitle |
| `components/MatchStartTime.tsx` | kickoff in viewer's local timezone + UTC offset |
| `components/MarketCard.tsx`, `Navbar.tsx`, `TradePanel.tsx`, `BracketEditor.tsx` | UI |

## Domain facts
- **234 markets live**: 10 tournament-winner · 72 group matches · 144 knockout progression · 8 crazy predictions.
- **Market lifecycle**: OPEN (tradable) → *awaiting result* (derived: `closesAt` passed, not yet RESOLVED — UI shows "Closed — awaiting result", trading already blocked in `lib/trade.ts`) → RESOLVED. The `CLOSED` enum value exists but isn't set; "awaiting" is computed via `awaitingResult()`, not stored.
- **Results flow**: daily cron auto-detects finished matches from two sources, cross-checks them, and stores a **pending** outcome; an admin **approves** on `/admin` before any payout. Never auto-resolves. `/admin/sources` compares the feeds.
- Knockouts are **per-team progression** markets ("reach QF/SF/final"), not concrete matchups — real matchups aren't known until group stage ends (~Jun 27).
- Bracket times/venues are **static data** (`lib/bracket.ts`); group `closesAt` = real kickoff.
- Flags/teams parsed frontend-side from the "Will X beat Y?" question — no schema change needed.
- **Currency**: World Cup Dollars, **suffix** format `1,000 WC$`; single-digit amounts show 2 decimals (`1.00 WC$`).
- Admin: `admin@worldcup.market` (password rotated; stored separately, not in repo).

## Conventions / hard rules
- **Never `git commit` / `git push`, and never write to the live DB, without Paul's explicit OK.** "go" / "proceed" means *start coding only* — push is a separate approval. (Memory `feedback_wait_for_approval_before_push`.)
- **Vercel + Supabase CLIs: use access tokens, not browser device-flow** (device-flow won't persist on this Mac). (Memory `feedback_vercel_supabase_cli_use_tokens`.)
- **FIFA times/venues come from Paul's screenshots** — FIFA's site is a JS SPA (empty to fetcher), aggregators hallucinate venues. Screenshots are the source of truth.
- Vercel auto-deploy occasionally **misses a webhook** → re-trigger with an empty commit.
- Verify carefully: `grep | head` masks grep's exit code; React `<!-- -->` markers split text — both have caused false positives.

## Workflow
One phase = one session. End with `/plo-save-phase` (updates `PROGRESS.md`, this file if a
durable decision changed, appends to `SESSION_LOG.md`). Start with `/plo-resume-phase`.
