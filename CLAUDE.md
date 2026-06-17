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
(region ap-southeast-1, Singapore)** · NextAuth (**two** credential providers — see Auth)
· hosted on **Vercel** (GitHub auto-deploy on `main`).

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
| `lib/auth.ts`, `lib/db.ts` | NextAuth config (2 providers: `nickname`=nickname+recoveryCode, `credentials`=email+password); Prisma client |
| `lib/nickname.ts` | nickname validation (alnum, ≤12, no spaces) + recovery-code gen/canonicalize |
| `app/api/nickname/` | POST: create nickname account → 1000 WC$ + one-time recovery code |
| `components/BracketTree.tsx` | pure-CSS flexbox bracket: compact boxes + right-angle elbow connectors (CSS borders, no SVG); time/venue on hover |
| `lib/flags.ts` | country → flag emoji (48 teams) + `matchTeams()` parser + `ALL_TEAMS` |
| `lib/kickoffs.ts` | FIFA-verified UTC kickoff for all 72 group matches |
| `lib/venues.ts` | official FIFA venue names for all 72 group matches |
| `lib/bracket.ts` | knockout bracket data (R32→Final, kickoffs, venues) — static, no DB; verified vs FIFA PDF |
| `lib/groups.ts` | official FIFA group A–L assignments; single source for Standings/Brazil |
| `lib/playedMatches.ts` | one-row-per-match approved results (HOME market only) for Scores/Standings/Goals/Brazil |
| `lib/sources.ts` | per-tab "Source:" attribution links (ESPN/TheSportsDB) |
| `lib/brazil.ts` | Brazil tab static data: ESPN roster, coach, titles, source links |
| `lib/trade.ts` | binary LMSR trade + `resolveMarket` / `resolveMatchGroup` (atomic 3-way) |
| `lib/elo.ts` | Elo strength ratings (48 teams) + `matchProbabilities()` → per-fixture 3-way **starting odds** (Session 8); `tournamentWinProbability()` → field-normalized **winner-market** starting odds (Session 10); seeded via `seedStateForProbability` |
| `scripts/reprice-elo.ts` | re-runnable reprice of OPEN untraded match markets to Elo odds (dry-run default, `--apply`) |
| `components/MatchDayBoard.tsx` (client) | ESPN-style match-day picker; groups outcome markets into 3-way fixtures |
| `components/MatchCard3Way.tsx` | one fixture as Home/Draw/Away outcome prices; when RESOLVED, also lists **goalscorers** (team flag + player + minute, "(penalty)" after the time) from the HOME market's `scorers`, chronological, **split into two columns by side** — home-team scorers left, away-team right (matched via scorer `team` vs the fixture's home/away; empty column if a side didn't score). Each scorer's **assist(s)** show indented + italic below ("Assist: A, B"). Uses `ScorerLine` + `sameTeam` helpers |
| `components/CategoryNav.tsx` (client) | permanent pill nav (in layout); active-state + label overrides |
| `components/SourceNote.tsx`, `ResolveMatchButtons.tsx` | numbered source list; manual 3-way resolve |
| `app/standings`, `app/scores`, `app/goals`, `app/brazil` | the four data tabs |
| `lib/utils.ts` | `formatWCD()` currency, `firstName()`, `formatDate()`; `awaitingResult()` = closed-but-unresolved rule |
| `lib/results.ts` | **Triple-source** results: `fetchEspn()` + `fetch365Scores()` (keyless, WC comp id 5930, `statusGroup===4`) + `fetchTheSportsDB()` (stale dead-weight), team-name normalize/alias, `mergeForMarket()` (resolves on ANY single source; flags ✓ agree / ⚠ disagree); `fetchEspnAssists()`+`attachAssists()` pull goal **assists** from ESPN's per-match *summary* endpoint (scoreboard has none) and attach by scorer name+minute |
| `lib/countries.ts`, `lib/countries.generated.ts`, `scripts/gen-countries.ts` | Countries tab data: `getCountry()` (Brazil curated; other 47 from ESPN-generated rosters), `WORLD_CUP_TITLES`, fixtures, slug helpers. Re-gen squads with `npx tsx scripts/gen-countries.ts` |
| `components/CountryDetail.tsx`, `components/SquadTable.tsx` | Shared country layout (Brazil + every `/countries/[slug]` render identically) + sticky-header squad table |
| `lib/topScorers.ts`, `components/TopScorers.tsx` | "Top-10 Goal Scorers of All Time" collapsible panel (static all-time men's WC scorers through 2022) at the top of the **Goals** tab — clones the Countries "History" panel (amber pill + sticky `<th>` headers) |
| `app/countries/`, `app/countries/[slug]/` | Countries list (by group A–L) + country detail page |
| `lib/worldCupHistory.ts`, `components/WorldCupHistory.tsx` | "History of World Cup Winners" panel (22 finals 1930–2022, Final Score + PENALTIES) atop `/countries` |
| `components/FitToWidth.tsx`, `components/StickyUnderNav.tsx` | Reusable UI: scale-to-fit wrapper (CSS transform); `useTopbarHeight()` + `StickyUnderNav` pin content under the nav (`#wc-topbar`) |
| `lib/ingest.ts` | `ingestAndPublish()` — shared detect + **auto-resolve/pay out** (no approval gate); `ingestIfDue()` — throttled self-heal (SystemState cooldown, only when a closed match is unresolved) |
| `lib/trade.ts` (resolve) | **Pooler-safe (Session 11):** `resolveMarketOps()` builds payout+status writes, run as a batched `$transaction([...])`; all trade/resolve transactions wrapped in `withTxRetry()` (P2028/connection retry) |
| `app/api/auto-resolve/` | Public, throttled self-heal endpoint (GET/POST → `ingestIfDue()`); driven by `<AutoResolve>` + the GitHub Actions cron |
| `components/AutoResolve.tsx` | Invisible client self-heal in `app/layout.tsx`: pings `/api/auto-resolve` on every page view, `router.refresh()` if anything published |
| `.github/workflows/resolve-results.yml` | GitHub Actions cron (every 15m) → `/api/auto-resolve`; plan-independent replacement for the dead Vercel cron |
| `app/api/cron/results/` | Vercel Cron (CRON_SECRET-gated): calls `ingestAndPublish()` — **NB: not enabled on this plan, never fires** (see hard rules) |
| `app/api/refresh-results/` | "Update Latest Results" trigger → `ingestAndPublish()`; **open to everyone** (Session 11, login gate removed), no cooldown |
| `lib/aiKnockouts.ts`, `components/AiKnockoutBracket.tsx`, `app/ai-knockouts/` | Static AI-predicted knockout bracket (R32→Final, Brazil champion) |
| `app/api/admin/approve-result/` | Admin gate: resolves a market via its stored `pendingOutcome` → `resolveMarket()` |
| `app/admin/sources/` | Diagnostic: ESPN vs 365Scores vs TheSportsDB side-by-side (3-way agree/disagree) |
| `components/ApproveResultButton.tsx` | Admin "Approve" button for an auto-detected pending result |
| `prisma/schema.prisma` | Users, markets (AMM state), positions, trades, `BracketAssignment`, `SystemState` (singleton: `resultsFetchedAt` cooldown clock) |
| `prisma/seed.ts` | admin + markets (winner / 72 matches / knockouts / crazy predictions) |
| `app/page.tsx` | home: hero + category pills (Matches · Bracket · Knockouts · …) |
| `components/PredictMyOwnWinner.tsx`, `app/api/winner-markets/` | **Predict My Own Winner** (Session 10): collapsible button atop the Tournament Winner tab (styled like the Countries "History" panel) → combobox (remaining-field dropdown + "Other" free-text) → auth'd POST creates a live winner market at Elo odds, then jumps to it. Logged-in only, instant (no admin gate), idempotent by canonical team. |
| `app/markets/[slug]/` | market detail: chart, trade panel, activity |
| `app/bracket/`, `app/admin/bracket/` | public bracket; admin slot-assignment editor |
| `app/admin/` | resolve markets (ADMIN role only) |
| `components/FitText.tsx` | auto-fit title to box + scaled centered subtitle |
| `components/MatchStartTime.tsx` | kickoff in viewer's local timezone + UTC offset |
| `components/MarketCard.tsx`, `Navbar.tsx`, `TradePanel.tsx`, `BracketEditor.tsx` | UI |

## Domain facts
- **~379 markets**: **11 tournament-winner** (Canada added Session 9 at 1%) · **72 group matches × 3 outcomes (Home/Draw/Away) = 216** · 144 knockout progression · 8 crazy predictions. Tournament-winner odds are **hand-set** in `prisma/seed.ts` (NOT Elo-derived); the displayed "% chance" is just the live LMSR YES price. Order/numbering pinned by `WINNER_ORDER` in `app/page.tsx`.
- **User-added winner markets (Session 10):** any signed-in user can add a winner market for a team not on the list via **Predict My Own Winner** (`POST /api/winner-markets`). These open at **Elo-derived** odds (`tournamentWinProbability()`) — unlike the 11 hand-set seeds. Dedupe is by **canonical team** (`canonicalTeam()` in `lib/flags.ts` maps aliases like USA↔United States; slug `@unique` is the backstop) — proposing an existing team just links to it. New teams need no `WINNER_ORDER` entry (unlisted teams already sort to the end). Instant-create, no admin gate, no per-user limit (same accepted Sybil stance as nickname signup); writes a real `Market` row to live Supabase.
- **Countries tab (Session 9):** pill after Brazil → `/countries` (all 48 by group A–L) + `/countries/[slug]` rendered identically to Brazil via shared `CountryDetail`. Squads are a **static ESPN snapshot** (`lib/countries.generated.ts` from `scripts/gen-countries.ts`); Brazil keeps curated data, others get club "—"/no coach. Top panel = `WorldCupHistory` (22 finals). `lib/flags.ts` `EXTRA_ISO` holds historical/non-WC2026 flags (Italy/Chile/Czechoslovakia/Hungary/Russia/West Germany), kept out of `ISO` so `ALL_TEAMS` stays the 48.
- **3-way group matches (Session 5):** every group fixture is **three grouped binary markets** (Home win / Draw / Away win), Polymarket-style, reusing the binary LMSR. Linked by `Market.matchKey` ("Home vs Away"); `Market.outcomeType` = HOME|DRAW|AWAY (null for non-match markets). Exactly one resolves YES (pays 1.00 WC$). Structured score + scorers live on the **HOME market only** so one-row-per-match views never double-count. Resolution settles the whole `matchKey` group **atomically** (`resolveMatchGroup` in `lib/trade.ts`); the cron derives Home/Draw/Away from the score; admin Approve (auto) and Home/Draw/Away buttons (manual, `ResolveMatchButtons`) both resolve the group. `scripts/migrate-3way.ts` migrated the live 72.
- **Data tabs (Sessions 4–5):** Standings (`/standings`), Scores (`/scores`), Goals (`/goals`), Brazil (`/brazil`) — all read approved results via `lib/playedMatches.ts`. Goalscorers parsed from ESPN `competition.details[]`. The category nav bar is **permanent** (`components/CategoryNav.tsx` mounted in `app/layout.tsx`), and the **Matches tab uses an ESPN-style day picker** (`MatchDayBoard`, groups local-tz by kickoff day). Each data tab shows a numbered **Source:** list (`SourceNote` + `lib/sources.ts`).
- **Group letters are OFFICIAL** — verified against Paul's FIFA standings PDF (2026-06-12). `lib/groups.ts` is the single source (Brazil=C, USA=D, Belgium=G, Spain=H). The bracket (`lib/bracket.ts`) was also cross-checked 100% against that PDF (times + feeders).
- **Market lifecycle**: OPEN (tradable) → *awaiting result* (derived: `closesAt` passed, not yet RESOLVED — UI shows "Closed — awaiting result", trading already blocked in `lib/trade.ts`) → RESOLVED. The `CLOSED` enum value exists but isn't set; "awaiting" is computed via `awaitingResult()`, not stored.
- **Results flow (Session 7 — AUTO-PUBLISH, no approval gate):** finished matches are detected from both sources, cross-checked, and **resolved + paid out on the spot** — no admin approval. Shared logic = `lib/ingest.ts` `ingestAndPublish()`, called by all triggers (Session 11): on-view self-heal (`<AutoResolve>` → throttled `/api/auto-resolve` via `ingestIfDue()`), the GitHub Actions cron (every 15m → `/api/auto-resolve`), the **"Update Latest Results"** button (`app/api/refresh-results`, **open to everyone** — login gate removed; idempotent), and the (non-firing) Vercel cron. **No time cooldown (removed Session 8):** any signed-in user press runs a fresh ingest. **Idempotent resolution** (skips RESOLVED) + **per-match error isolation** make repeated/concurrent clicks safe — they can't double-pay or abort the batch. The button shows a toast ("N matches were updated"). (`SystemState.resultsFetchedAt` is now vestigial.) Source disagreement is published anyway but flagged "⚠ disagree" in `resultDetail`. There is no un-resolve tooling — accepted risk for a trusted, play-money audience. `/admin` manual resolve still exists as a fallback. (`/admin/sources` compares feeds.)
- **AI Knockouts (Session 7):** the old per-team "Knockouts" markets are **retired** — the pill renamed to **"AI Knockouts"** routes to `/ai-knockouts`, a *static* predicted bracket (`lib/aiKnockouts.ts` + `components/AiKnockoutBracket.tsx`), Claude's picks R32→Final → champion (currently Brazil). Not tradeable. The 144 legacy `category:"Knockouts"` markets are **hidden** (excluded in `app/page.tsx`; `/?category=Knockouts` redirects to `/ai-knockouts`) but **still in the DB** — delete only on explicit OK.
- Bracket times/venues are **static data** (`lib/bracket.ts`); group `closesAt` = real kickoff.
- Flags/teams parsed frontend-side from the "Will X beat Y?" question — no schema change needed.
- **Currency**: World Cup Dollars, **suffix** format `1,000 WC$`; single-digit amounts show 2 decimals (`1.00 WC$`).
- Admin: `admin@worldcup.market` (password rotated; stored separately, not in repo).
- **Auth model (Session 7 — NICKNAME-ONLY login):** new users sign up with a **nickname** (alphanumeric, ≤12, case-insensitive-unique via `nicknameLower`) → instant 1000 WC$ → straight in. **Logging back in = just type the nickname** (no password, no recovery code — the recovery-code mechanism was removed). This means **no account security** (anyone typing a nickname is that user) — a deliberate zero-friction choice for a private play-money game. The original **4 users + admin keep email/password** (2nd NextAuth provider) reached via the bold-blue **"Returning email user / admin →"** toggle on `/login`; login is one smart field by intent but currently a toggle. Legacy/admin accounts have no nickname so they can't be reached via the nickname field. `recoveryCodeHash` column still exists but is unused. No signup rate-limit (Sybil accepted). Admin = `admin@worldcup.market`; original email users incl. `paul.lo@me.com`.

## Conventions / hard rules
- **Never `git commit` / `git push`, and never write to the live DB, without Paul's explicit OK.** "go" / "proceed" means *start coding only* — push is a separate approval. (Memory `feedback_wait_for_approval_before_push`.)
- **Vercel + Supabase CLIs: use access tokens, not browser device-flow** (device-flow won't persist on this Mac). (Memory `feedback_vercel_supabase_cli_use_tokens`.)
- **FIFA times/venues come from Paul's screenshots** — FIFA's site is a JS SPA (empty to fetcher), aggregators hallucinate venues. Screenshots are the source of truth.
- Vercel auto-deploy occasionally **misses a webhook** → re-trigger with an empty commit.
- ⛔ **DB transactions must be pooler-safe (Session 11).** Prisma **interactive** transactions (`db.$transaction(async (tx) => …)`) fail *intermittently* over Supabase's transaction-mode pooler (pgbouncer, the 6543 `DATABASE_URL`) with `Transaction API error: Transaction not found … obtained before disconnecting` (P2028). This silently broke ALL match resolution for weeks (every `resolveMatchGroup` threw; matches stuck "Closed — awaiting result"). Rules: **resolution uses the batched `$transaction([...])` array form** (pre-read, then one atomic non-interactive batch — `resolveMarketOps()` in `lib/trade.ts`); **every transaction (trade + resolve) is wrapped in `withTxRetry()`** (retries P2028/connection-drop, never a `TradeError`). When retrying a batched transaction, **rebuild the ops each attempt** — a `PrismaPromise` is single-use. Don't reintroduce a long interactive transaction on the hot path.
- **Never depend on Vercel Cron here (Session 11).** The `vercel.json` cron (`/api/cron/results`) was **never enabled** on this plan (`crons: []`, `enabledAt: null`) — it had not fired once. Result settling now has THREE independent, idempotent triggers: on-view self-heal (`<AutoResolve>` → throttled `/api/auto-resolve`), a **GitHub Actions** cron every 15 min (`.github/workflows/resolve-results.yml` → `/api/auto-resolve`, no secret), and the public manual button. The `vercel.json` cron is left as a harmless extra backstop.
- Verify carefully: `grep | head` masks grep's exit code; React `<!-- -->` markers split text — both have caused false positives.
- **NULL-outcome filter trap:** never filter non-match markets with Prisma `NOT: { outcomeType: { in: ["DRAW","AWAY"] } }` — SQL 3-valued logic drops NULL-outcome rows (Tournament Winner/Knockouts/Crazy), silently emptying those tabs. Use `OR: [{ outcomeType: "HOME" }, { outcomeType: null }]`. (`app/page.tsx` `hideSecondary`.)
- The **All** tab groups match outcomes by `matchKey` into 3-way cards (`MatchCard3Way`); non-match markets render as binary `MarketCard`.
- **Security (Session 7 audit):** app security headers live in `next.config.mjs` (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS, CSP `frame-ancestors`); NextAuth `session.maxAge` = 7 days. Audit reports (`Code_Audit_Report_*_v1.0/v1.1.docx`) are in `../reports/`-style `reports/` (non-repo). Open items: SEC-01 login rate-limit (needs Upstash), `next@16` migration (residual advisories). **CQ-01 (ingest per-match error isolation) FIXED Session 8.**
- **Tailwind JIT + bracket connectors:** per-round color classes must be full literal strings (no dynamic `bg-${x}`); bracket box spacing uses uniform `py-3` + fixed-height headers (never a flex `gap`) so the CSS connector fractions stay aligned.
- **FIFA top bar + sticky nav (Session 8):** black/gold header (gold `bg-clip-text` "WORLD CUP 2026" wordmark, "PREDICTION MARKET" badge centered *below* it, enlarged trophy) constrained to content max-width. The header **and** the category tab bar are pinned together by ONE `sticky top-0` wrapper in `app/layout.tsx` (now `id="wc-topbar"`; Navbar header is not self-sticky) — **never add `overflow`/`transform` to body/main or sticky breaks.** Active tab + "Update Latest Results" button are `bg-accent` blue (the festival-rainbow tab experiment was reverted). Match markets now open at **Elo-derived odds**, not a flat 40/27/33.
- **Sticky-under-nav + fit-to-width pattern (Session 9):** content that should pin just below the nav while scrolling measures `#wc-topbar`'s live height via `useTopbarHeight()` and uses `position: sticky; top: <that>`. Used by: AI Knockouts round labels + Matches date bar (`StickyUnderNav`), and sticky **table headers** (Brazil/Countries squad, Countries history, Goals) via `<th>`-level `position:sticky`. **Sticky table wrappers must use `overflow-x: clip` (never `auto`/`hidden`** — those create a scroll container that confines the sticky). **`FitToWidth` uses a CSS `transform`, which breaks `position:sticky` for descendants** — so sticky elements live OUTSIDE the transformed subtree (e.g. AI Knockouts labels are a separate `StickyUnderNav` from the scaled bracket body). `FitToWidth` (scale-to-fit, min-scale floor → horizontal scroll) keeps the AI Knockouts bracket fitting any screen.
- **Global nav progress bar (Session 9):** `nextjs-toploader` in `app/layout.tsx` (gold `#fbbf24`, no spinner) — `position:fixed`, fires on every `<Link>`/history nav. Non-navigation async buttons (Update Latest Results, TradePanel) already have their own pending state.

## Workflow
One phase = one session. End with `/plo-save-phase` (updates `PROGRESS.md`, this file if a
durable decision changed, appends to `SESSION_LOG.md`). Start with `/plo-resume-phase`.
