# PROGRESS — World Cup 2026 Prediction Market

_You-are-here for a cheap resume. Durable map: `CLAUDE.md`. Deep archive: `../SESSION MD CODE HISTORY/SESSION_LOG.md`._

**Last updated:** 2026-06-12 (end of Session 3 — cheap-resume scaffolding + Vercel CLI token auth)

## Current phase
App still **fully live and shipped** — no app-code changes this session. This session set up the cost-discipline scaffolding (this PROGRESS.md + CLAUDE.md, now committed) and got the Vercel CLI persistently token-authenticated. Working tree **clean**; `main` at `b58f701` (docs: add CLAUDE.md + PROGRESS.md), pushed & deploy verified (Vercel: success).

## START HERE (next action)
**No app-code task is queued** — pick the next piece of work with Paul before coding. Strongest candidate (group stage opened Jun 12):
- **Sanity-check timezone / `closesAt` behaviour** now that real matches are kicking off — confirm the 72 group markets close at their true kickoff (`lib/kickoffs.ts`, `MatchStartTime`), and that closed markets render correctly.
- Then: first market **resolution** flow as results come in (admin resolve path in `app/admin/`, `lib/trade.ts`).

## Done (high level)
- **Session 3 (Jun 12):** added `CLAUDE.md` (durable map) + `PROGRESS.md` (this file) for cheap resumes — committed & pushed (`b58f701`). Vercel CLI now **token-authenticated & persistent** (token in `~/.config/vercel/token.env`, `~/.zshrc` sources it + aliases `vercel` to pass `--token`); `vercel whoami` → `paullo007`, no more device-flow.
- New public repo, fresh history; Supabase (Singapore) + Vercel deploy; GitHub auto-deploy on `main`.
- 234 markets seeded (10 winner · 72 matches · 144 knockouts · 8 crazy predictions).
- Light Apple-style theme, country flags, WC$ currency, FitText auto-sizing titles.
- Profile page (`/profile`), name privacy (first-name-only on leaderboard + feed).
- Visual bracket (`/bracket`) + admin slot editor (`/admin/bracket`, `BracketAssignment` table).
- FIFA-verified kickoff times (viewer-local tz) + official venues on cards, detail, bracket.
- Day-of-week on all dates; coloured Buy/Sell toggle (YES green / NO red).

## In-flight
- Nothing. Clean tree, nothing half-done.

## Active gotchas (see CLAUDE.md for full rules)
- ⛔ No commit/push or live-DB write without Paul's explicit OK ("go" = code only).
- Vercel CLI: token now persisted (see Done). CLI v50 ignores the `VERCEL_TOKEN` env var — pass `--token "$VERCEL_TOKEN"` (the `vercel` alias does this). If "Authorize Device" page appears, token is missing/expired — don't click Allow.
- FIFA data = Paul's screenshots (site is a JS SPA; aggregators hallucinate venues).
- Vercel sometimes misses a deploy webhook → empty commit to re-trigger.
- Verify cleanly: `grep | head` hides exit codes; React `<!-- -->` splits text.
