# PROGRESS — World Cup 2026 Prediction Market

_You-are-here for a cheap resume. Durable map: `CLAUDE.md`. Deep archive: `../SESSION MD CODE HISTORY/SESSION_LOG.md`._

**Last updated:** 2026-06-12 (by /plo-resume-phase, first PROGRESS for this project)

## Current phase
App is **fully live and shipped**. Two build sessions done (Jun 11 launch+UI, Jun 12 bracket+times+venues). Working tree **clean**; `main` at `c7de0a2` (hero copy "Trade the Odds."), all pushed & auto-deployed.

## START HERE (next action)
**None defined yet** — both prior sessions ended on polish, no next task was queued. Pick the next piece of work with Paul before coding.

Candidate ideas (not committed):
- Sanity-check timezone / `closesAt` behaviour now that the group stage has **opened (Jun 12)** — markets should be closing at real kickoffs.
- First market **resolution** flow once group results come in (admin resolve path in `app/admin/`, `lib/trade.ts`).

## Done (high level)
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
- Vercel/Supabase CLIs → access tokens, not browser login.
- FIFA data = Paul's screenshots (site is a JS SPA; aggregators hallucinate venues).
- Vercel sometimes misses a deploy webhook → empty commit to re-trigger.
- Verify cleanly: `grep | head` hides exit codes; React `<!-- -->` splits text.
