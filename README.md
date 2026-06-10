# World Cup 2026 Prediction Market

A Polymarket-style prediction market for the FIFA World Cup 2026 (June 11 – July 19, 2026),
built with **play money** — no real wagering.

## How it works

- Every market is a binary **YES / NO** question (e.g. *"Will Argentina win the 2026 FIFA World Cup?"*).
- Prices come from an **LMSR automated market maker** (the mechanism Polymarket originally used):
  buying YES pushes the price up, buying NO pushes it down, so the price always reads as the
  crowd's implied probability.
- New accounts start with **1,000 coins**. Each share of the winning outcome pays **1 coin**
  when an admin resolves the market.
- **Portfolio** shows open positions with live mark-to-market P&L; the **Leaderboard** ranks
  traders by net worth (cash + position value).

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL · NextAuth (credentials)

## Local development

```bash
cd prediction-market
npm install
cp .env.example .env        # fill in DATABASE_URL, NEXTAUTH_SECRET, ADMIN_PASSWORD
npx prisma db push          # create tables
npm run db:seed             # admin user + World Cup markets
npm run dev                 # http://localhost:3000
```

The seed script creates an admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`
(it refuses to run without a password set). The admin sees an extra **Admin** nav link for
resolving markets.

## Deploying (Vercel + Supabase)

1. Create a Supabase project; set `DATABASE_URL` (pooled, port 6543, `?pgbouncer=true`) and
   `DIRECT_URL` (direct, port 5432).
2. In Vercel, create a project with **Root Directory** set to `prediction-market/`.
3. Set env vars: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL` (your prod URL),
   `NEXTAUTH_SECRET` (`openssl rand -base64 32`).
4. Run `npx prisma db push` and `npm run db:seed` once against the Supabase DB
   (locally with prod env vars).

## Key files

| Path | Purpose |
|---|---|
| `lib/amm.ts` | LMSR market-maker math (price, cost, share calculations) |
| `lib/trade.ts` | Atomic trade execution & market resolution (Prisma transactions) |
| `prisma/schema.prisma` | Users, markets (AMM state), positions, trades |
| `prisma/seed.ts` | Admin user + initial World Cup 2026 markets |
| `app/markets/[slug]/` | Market detail: price chart, trade panel, activity |
| `app/admin/` | Resolve markets (ADMIN role only) |
