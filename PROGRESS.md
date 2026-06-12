# PROGRESS — World Cup 2026 Prediction Market

_You-are-here for a cheap resume. Durable map: `CLAUDE.md`. Deep archive: `../SESSION MD CODE HISTORY/SESSION_LOG.md`._

**Last updated:** 2026-06-12 (end of Session 4 — market lifecycle revamp + dual-source auto-results)

## Current phase
Group stage has started (2 games played). Built the "finished games shouldn't look bettable" revamp **A + B + C1**. All code is **tsc-green and live-validated**; being migrated + deployed at the end of this session.

## START HERE (next action)
**Watch the first real auto-resolution flow end-to-end.** After the next cron run (daily 05:00 UTC):
1. Open `/admin` → "Ready to resolve" should show kicked-off games with an **auto-detected** line (e.g. "ESPN+TheSportsDB: Mexico 2–0 South Africa (YES) ✓ agree") and an **Approve** button.
2. Open `/admin/sources` to compare ESPN vs TheSportsDB accuracy/coverage as more games finish.
3. Approve a couple, confirm payouts land in users' balances + show in Portfolio → Results.
- If the cron didn't fire, hit `GET /api/cron/results` manually with `Authorization: Bearer $CRON_SECRET` to trigger ingestion.

## Done (high level)
- **Session 4 (Jun 12):** Market lifecycle + automated results revamp:
  - **A — UI honesty:** `awaitingResult()` helper (`lib/utils.ts`); MarketCard shows "Closed — awaiting result" (no fake Yes/No) once kickoff passes; detail page awaiting banner; home feed hides RESOLVED behind a new **Results** pill and sorts awaiting markets below tradable ones.
  - **B — Results surfacing:** Portfolio **Results** table (payout + realized P&L); admin split into **"Ready to resolve"** (kicked-off) vs "Open — still trading".
  - **C1 — Dual-source auto-results:** `lib/results.ts` queries **ESPN** (`fifa.world` scoreboard, date-swept) **+ TheSportsDB** (league 4429), normalizes team names, **cross-checks** (✓ agree / ⚠ disagree). Cron `/api/cron/results` (CRON_SECRET-protected) sets a **pending** result only — never auto-pays. `/api/admin/approve-result` + `ApproveResultButton` = human gate → `resolveMarket()`. **`/admin/sources`** diagnostic compares the two feeds. Schema: 4 nullable `Market` cols (pendingOutcome, resultSource, resultDetail, fetchedAt). `vercel.json` cron 1×/day (Hobby).
  - Live-validated: both sources returned Mexico 2–0 SA + South Korea 2–1 Czechia, agreed, correct YES outcomes.
- **Session 3 (Jun 12):** CLAUDE.md + PROGRESS.md scaffolding; Vercel CLI token-auth persisted.
- 234 markets seeded; light theme, flags, WC$ currency; Profile, Bracket, FIFA-verified kickoffs/venues.

## In-flight
- DB migration (`db:push`) + deploy happening now at session end. (If this note still says "happening now" next session, verify it actually completed — see START HERE.)

## Active gotchas (see CLAUDE.md for full rules)
- ⛔ No commit/push or live-DB write without Paul's explicit OK ("go" = code only).
- 🔴 **Deploy order is load-bearing:** the regenerated Prisma client selects the 4 new `Market` columns, so **`db:push` MUST run before deploying** new code — deploying first breaks every page that reads a market.
- **Sources:** ESPN scoreboard returns only the current day → `fetchEspn()` sweeps the last ~4 days; TheSportsDB returns the whole season. ESPN keyless; TheSportsDB uses free key "3" (env `THESPORTSDB_API_KEY`). Both are undocumented/ToS-gray (fine for play-money); admin-approval gate is the safety net for any team-name mismatch or source disagreement.
- Auto-resolution NEVER pays out directly — admin must approve each pending result.
- Vercel sometimes misses a deploy webhook → empty commit to re-trigger.
- Verify cleanly: `grep | head` hides exit codes; React `<!-- -->` splits text.

## How to run / verify
- `npm run dev` → localhost:3000 · `npm run build` (catches type errors) · `npx tsc --noEmit` · `npm run db:push` (schema → DB). Full stack/commands in CLAUDE.md.
