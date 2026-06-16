# PROGRESS — World Cup 2026 Prediction Market

_You-are-here for a cheap resume. Durable map: `CLAUDE.md`. Deep archive: `../SESSION MD CODE HISTORY/SESSION_LOG.md`._

**Last updated:** 2026-06-17 (end of Session 10 — "Predict My Own World Cup Winner": users can add a winner market for any team not on the pre-seeded list). Shipped live on `main`, Vercel deploy verified green. HEAD = `bd13b2d`.

## Current phase
Session 10 **shipped and live** (commit `bd13b2d`, deploy `ndel235zo` ● Ready, button confirmed on the production domain). Nothing half-done in code.

## START HERE (next action)
Nothing is in-flight. Pick whichever is most relevant:
1. **SEC-01** — login rate-limit/lockout, still open (needs Upstash; in-memory useless on serverless).
2. **next@16 migration** — still deferred (residual Next.js 14.2.x advisories).
3. **AI Knockouts ↔ Elo** — make the static AI Knockouts bracket consistent with the Elo ratings (still independent).
4. **Architecture paper** — review **v1.1** and roll **v1.2** (`/plo-version-numbering`) if Paul has edits. File in `../01_ARCHITECTURE DESIGN OF APP/`. (Should now also document the Countries tab + sticky/fit pattern + Predict My Own Winner / user-added markets.)
5. **Countries data freshness** — rosters are a static snapshot from ESPN; re-run `npx tsx scripts/gen-countries.ts` to refresh squads as the tournament progresses.

## Done (high level)
- **Session 10 (Jun17.26):**
  - **Predict My Own World Cup Winner (NEW):** collapsible button atop the Tournament Winner tab, styled like the Countries tab's "History of World Cup Winners" panel (`components/PredictMyOwnWinner.tsx`). A signed-in user picks from a dropdown of the remaining 48-team field (with flags) — or types their own via **"Other"** — and `POST /api/winner-markets` creates a live binary "Will X win the 2026 FIFA World Cup?" market, then jumps to it.
  - **Elo-derived starting odds:** `lib/elo.tournamentWinProbability()` (Elo → field-normalized win share, host bonus, clamped to (0.002, 0.9); `DEFAULT_ELO` fallback for off-list custom teams). Seeded via `seedStateForProbability` (unlike the 11 hand-set winner seeds).
  - **Dedupe / aliases:** `lib/flags.canonicalTeam()` (USA↔United States, trim) — proposing an existing team links to it instead of duplicating; slug `@unique` is the backstop (P2002 → link). Validation: 2–40 chars, Latin letters incl. accents.
  - **Gate:** logged-in only, instant-create (no admin approval), no per-user limit — consistent with the app's zero-friction/auto-publish stance. First real submission writes a `Market` row to live Supabase.
  - Verified: `tsc --noEmit` clean, `npm run build` passes, collapsed/expanded screenshots, deploy green on prod domain.
- **Session 9 (Jun15–16.26):**
  - **Global nav progress bar:** `nextjs-toploader` in `app/layout.tsx` (gold `#fbbf24`, no spinner) — fires on every `<Link>`/back-forward nav. `position:fixed`, doesn't touch the sticky region.
  - **Results pipeline — 3rd source:** added **365Scores** (keyless, `webws.365scores.com`, WC competition id 5930, `statusGroup===4`=ended) as `fetch365Scores()` in `lib/results.ts`; pipeline now ESPN→365Scores→TheSportsDB and resolves on ANY single source (no "all agree" gate — that was always true; TheSportsDB is stale dead-weight). `/admin/sources` shows all 3. Resolved the stuck **Sweden 5–1 Tunisia** live (root cause was ESPN finalization timing, not the merge logic).
  - **Canada market (#11):** new "Will Canada win the 2026 FIFA World Cup?" tournament-winner market, seeded at 1% (Yes 1¢) like the other hand-set winners. In `prisma/seed.ts` + upserted live; `WINNER_ORDER` in `app/page.tsx` appended so it numbers #11. (Winner odds are hand-set, NOT Elo-derived; the live % is just the LMSR YES price moving with trades.)
  - **Sticky/fit pattern (NEW, reused 6×):** `components/FitToWidth.tsx` (scale-to-fit via CSS transform, min-scale floor → scroll), `useTopbarHeight()` + `StickyUnderNav` in `components/StickyUnderNav.tsx` (measure `#wc-topbar` height, pin just under nav). Applied to: AI Knockouts **bracket auto-fit** + **sticky round labels**; **Matches** date-selector bar; **Brazil/Countries squad** headers; **Countries history** headers; **Goals** headers. Sticky tables use `<th>`-level `position:sticky` + wrapper `overflow-x:clip` (never `auto`/`hidden`, which form a scroll container that breaks sticky).
  - **Countries tab (NEW):** pill after Brazil → `/countries` lists all 48 teams by group A–L; `/countries/[slug]` renders **identically to the Brazil tab** via shared `components/CountryDetail.tsx` + `components/SquadTable.tsx`. Squads for all 48 from ESPN (`scripts/gen-countries.ts` → `lib/countries.generated.ts`, 1246 players); `lib/countries.ts` `getCountry()` keeps Brazil curated (clubs/coach/5 titles), others from ESPN (club "—", no coach box — ESPN coach data is stale). `WORLD_CUP_TITLES` for the 7 past champions in the field.
  - **World Cup history (NEW):** collapsible "🏆 History of World Cup Winners" panel at top of `/countries` (`components/WorldCupHistory.tsx` + `lib/worldCupHistory.ts`) — all 22 finals 1930–2022, Brazil-titles-table style, with a **Final Score** column ("Winner W vs L Loser", amber "PENALTIES:" prefix for shootout finals).
  - **Flags:** `EXTRA_ISO` in `lib/flags.ts` for non-WC2026/historical countries (Italy, Chile, Czechoslovakia, Hungary, Russia, West Germany) — kept out of `ISO` so `ALL_TEAMS` stays the 48.
- **Session 8 (Jun14–15.26):** results-pipeline hardening (removed cooldown, idempotent resolution, per-match error isolation = CQ-01 fixed), FIFA black/gold redesign + single sticky top region, Elo-based varied starting odds (live reprice), architecture whitepaper v1.1.
- **Session 7 (Jun14):** auto-publish results, code audit (0 Crit/0 High), AI Knockouts tab, nickname-only login.
- **Sessions 1–6 (Jun11–13):** launch/deploy, 72 matches→3-way (216 markets), 48-team bracket, FIFA groups/times/venues, data tabs (Standings/Scores/Goals/Brazil), live resolutions. (Detail in `SESSION_LOG.md`.)

## In-flight
- None — everything committed, merged to `main`, pushed, deployed. Canada live-DB upsert applied & verified.

## Known issues / gotchas (see CLAUDE.md for full rules)
- ⛔ No commit/push or live-DB write without Paul's explicit OK.
- 🟢 **Sticky bars depend on the single `sticky top-0` wrapper having NO `overflow`/`transform` ancestor** (`app/layout.tsx`, now `id="wc-topbar"`). Sticky **table headers** need wrapper `overflow-x:clip`, never `auto`/`hidden`. `FitToWidth` uses `transform` → breaks `position:sticky` for descendants, so sticky bars live OUTSIDE it (`StickyUnderNav` wraps FitToWidth but the sticky is on its untransformed outer).
- 🟢 **Countries rosters are a static ESPN snapshot** (`lib/countries.generated.ts`); re-run `scripts/gen-countries.ts` to refresh. Non-Brazil: club "—", no coach.
- 🟠 **SEC-01** login rate-limit still open (Upstash). **next@16** migration deferred.
- 🟡 Nickname-only login has NO account security; auto-publish has no human gate (both accepted for play money).
- 🟢 144 legacy "Knockouts" markets hidden, not deleted. Elo reprice only touches OPEN untraded match markets.
- 🟢 NULL-outcome Prisma filter trap still applies (`app/page.tsx` `hideSecondary` uses `OR [HOME, null]`).
- 📝 `PROGRESS.md` + `CLAUDE.md` are currently **uncommitted** in the working tree (doc handoff, intentionally not pushed). `.DS_Store` + `design-backups/` are untracked, ignore.

## How to run / verify
- `npm run dev` → :3000 · `npx tsc --noEmit` · `npm run build` · `npm run db:push` · `npm run db:seed`.
- **Regenerate country squads:** `npx tsx scripts/gen-countries.ts` (writes `lib/countries.generated.ts`).
- **Elo reprice:** `npx tsx scripts/reprice-elo.ts` (dry-run) → `--apply` to write live.
- **One-off live scripts** (run with `set -a; source .env; set +a; npx tsx scripts/<file>`) were used + removed this session for the Canada upsert and Sweden–Tunisia resolve.
- **Visual check:** headless Chrome screenshot (Chrome-for-Testing at `~/.cache/puppeteer/...`; puppeteer-core installed in `/tmp/wcshot`).
- Full stack/commands in `CLAUDE.md`.
