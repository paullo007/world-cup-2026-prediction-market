import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedStateForProbability } from "../lib/amm";
import { KICKOFFS } from "../lib/kickoffs";

const db = new PrismaClient();

const TOURNAMENT_END = new Date("2026-07-19T19:00:00Z");
const OPENING_KICKOFF = new Date("2026-06-11T19:00:00Z");
const GROUP_STAGE_END = new Date("2026-06-27T23:59:00Z");

interface SeedMarket {
  slug: string;
  question: string;
  description: string;
  category: string;
  probability: number; // initial implied probability
  closesAt: Date;
  liquidity?: number;
}

const winner = (team: string, p: number): SeedMarket => ({
  slug: `${team.toLowerCase().replace(/\s+/g, "-")}-wins-world-cup-2026`,
  question: `Will ${team} win the 2026 FIFA World Cup?`,
  description: `Resolves YES if ${team} lifts the trophy at the final on July 19, 2026 (MetLife Stadium, New Jersey).`,
  category: "Tournament Winner",
  probability: p,
  closesAt: TOURNAMENT_END,
  liquidity: 1500,
});

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[^\x00-\x7f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

// Group-stage fixtures from the Dec 2025 final draw: [date, home, away].
// The June 11 Mexico vs South Africa opener is omitted (covered by the
// dedicated "opening match" market below).
const GROUP_FIXTURES: [string, string, string][] = [
  ["2026-06-11", "South Korea", "Czechia"],
  ["2026-06-12", "Canada", "Bosnia and Herzegovina"],
  ["2026-06-12", "United States", "Paraguay"],
  ["2026-06-13", "Qatar", "Switzerland"],
  ["2026-06-13", "Brazil", "Morocco"],
  ["2026-06-13", "Haiti", "Scotland"],
  ["2026-06-13", "Australia", "Türkiye"],
  ["2026-06-14", "Germany", "Curaçao"],
  ["2026-06-14", "Netherlands", "Japan"],
  ["2026-06-14", "Ivory Coast", "Ecuador"],
  ["2026-06-14", "Sweden", "Tunisia"],
  ["2026-06-15", "Spain", "Cape Verde"],
  ["2026-06-15", "Belgium", "Egypt"],
  ["2026-06-15", "Saudi Arabia", "Uruguay"],
  ["2026-06-15", "Iran", "New Zealand"],
  ["2026-06-16", "France", "Senegal"],
  ["2026-06-16", "Iraq", "Norway"],
  ["2026-06-16", "Argentina", "Algeria"],
  ["2026-06-16", "Austria", "Jordan"],
  ["2026-06-17", "Portugal", "DR Congo"],
  ["2026-06-17", "England", "Croatia"],
  ["2026-06-17", "Ghana", "Panama"],
  ["2026-06-17", "Uzbekistan", "Colombia"],
  ["2026-06-18", "Czechia", "South Africa"],
  ["2026-06-18", "Switzerland", "Bosnia and Herzegovina"],
  ["2026-06-18", "Canada", "Qatar"],
  ["2026-06-18", "Mexico", "South Korea"],
  ["2026-06-19", "United States", "Australia"],
  ["2026-06-19", "Scotland", "Morocco"],
  ["2026-06-19", "Brazil", "Haiti"],
  ["2026-06-19", "Türkiye", "Paraguay"],
  ["2026-06-20", "Netherlands", "Sweden"],
  ["2026-06-20", "Germany", "Ivory Coast"],
  ["2026-06-20", "Ecuador", "Curaçao"],
  ["2026-06-20", "Tunisia", "Japan"],
  ["2026-06-21", "Spain", "Saudi Arabia"],
  ["2026-06-21", "Belgium", "Iran"],
  ["2026-06-21", "Uruguay", "Cape Verde"],
  ["2026-06-21", "New Zealand", "Egypt"],
  ["2026-06-22", "Argentina", "Austria"],
  ["2026-06-22", "France", "Iraq"],
  ["2026-06-22", "Norway", "Senegal"],
  ["2026-06-22", "Jordan", "Algeria"],
  ["2026-06-23", "Portugal", "Uzbekistan"],
  ["2026-06-23", "England", "Ghana"],
  ["2026-06-23", "Panama", "Croatia"],
  ["2026-06-23", "Colombia", "DR Congo"],
  ["2026-06-24", "Switzerland", "Canada"],
  ["2026-06-24", "Bosnia and Herzegovina", "Qatar"],
  ["2026-06-24", "Scotland", "Brazil"],
  ["2026-06-24", "Morocco", "Haiti"],
  ["2026-06-24", "Czechia", "Mexico"],
  ["2026-06-24", "South Africa", "South Korea"],
  ["2026-06-25", "Ecuador", "Germany"],
  ["2026-06-25", "Curaçao", "Ivory Coast"],
  ["2026-06-25", "Japan", "Sweden"],
  ["2026-06-25", "Tunisia", "Netherlands"],
  ["2026-06-25", "Türkiye", "United States"],
  ["2026-06-25", "Paraguay", "Australia"],
  ["2026-06-26", "Norway", "France"],
  ["2026-06-26", "Senegal", "Iraq"],
  ["2026-06-26", "Cape Verde", "Saudi Arabia"],
  ["2026-06-26", "Uruguay", "Spain"],
  ["2026-06-26", "Egypt", "Iran"],
  ["2026-06-26", "New Zealand", "Belgium"],
  ["2026-06-27", "Panama", "England"],
  ["2026-06-27", "Croatia", "Ghana"],
  ["2026-06-27", "Colombia", "Portugal"],
  ["2026-06-27", "DR Congo", "Uzbekistan"],
  ["2026-06-27", "Algeria", "Austria"],
  ["2026-06-27", "Jordan", "Argentina"],
];

const match = ([date, home, away]: [string, string, string]): SeedMarket => ({
  slug: `${slugify(home)}-vs-${slugify(away)}-${date}`,
  question: `Will ${home} beat ${away}?`,
  description: `Group-stage match on ${longDate(date)}. Resolves YES if ${home} win in regulation (a draw or a ${away} win resolves NO).`,
  category: "Matches",
  probability: 0.4,
  closesAt: new Date(KICKOFFS[`${home} vs ${away}`] ?? `${date}T19:00:00Z`),
  liquidity: 1000,
});

// Knockout placeholders: bracket matchups aren't known until the group stage
// finishes, so these are per-team "how far do they go?" progression markets.
const KO_ROUNDS = [
  { key: "quarter-finals", label: "the quarter-finals", date: "2026-07-09" },
  { key: "semi-finals", label: "the semi-finals", date: "2026-07-14" },
  { key: "final", label: "the final", date: "2026-07-19" },
] as const;

// All 48 teams with a "reach the quarter-finals" strength. Reach-SF and
// reach-final probabilities are derived from it (a team that makes the QF is
// progressively less likely to go deeper). Placeholder odds — the crowd moves them.
const KO_TEAMS: [string, number][] = [
  ["Argentina", 0.66],
  ["Spain", 0.66],
  ["France", 0.66],
  ["England", 0.6],
  ["Brazil", 0.6],
  ["Portugal", 0.55],
  ["Germany", 0.55],
  ["Netherlands", 0.5],
  ["Belgium", 0.46],
  ["Uruguay", 0.46],
  ["Croatia", 0.44],
  ["Colombia", 0.44],
  ["Morocco", 0.42],
  ["Switzerland", 0.42],
  ["Japan", 0.42],
  ["Senegal", 0.42],
  ["United States", 0.4],
  ["Mexico", 0.4],
  ["Ecuador", 0.4],
  ["Austria", 0.4],
  ["Ivory Coast", 0.38],
  ["Norway", 0.38],
  ["Sweden", 0.38],
  ["Egypt", 0.36],
  ["Iran", 0.36],
  ["South Korea", 0.36],
  ["Australia", 0.36],
  ["Scotland", 0.34],
  ["Türkiye", 0.34],
  ["Algeria", 0.34],
  ["Paraguay", 0.34],
  ["Canada", 0.32],
  ["Tunisia", 0.32],
  ["Saudi Arabia", 0.28],
  ["Qatar", 0.28],
  ["Cape Verde", 0.28],
  ["DR Congo", 0.28],
  ["Bosnia and Herzegovina", 0.26],
  ["Uzbekistan", 0.26],
  ["Ghana", 0.26],
  ["Czechia", 0.24],
  ["South Africa", 0.24],
  ["New Zealand", 0.24],
  ["Iraq", 0.24],
  ["Haiti", 0.2],
  ["Curaçao", 0.2],
  ["Jordan", 0.2],
  ["Panama", 0.2],
];

const round2 = (n: number) => Math.round(n * 100) / 100;

const knockout = ([team, qf]: [string, number]): SeedMarket[] => {
  const probs = [qf, round2(qf * 0.62), round2(qf * 0.46)];
  return KO_ROUNDS.map((round, i) => ({
    slug: `${slugify(team)}-reach-${round.key}`,
    question: `Will ${team} reach ${round.label}?`,
    description: `Resolves YES if ${team} reach ${round.label} of the 2026 FIFA World Cup. Knockout matchups are set once the group stage ends on June 27.`,
    category: "Knockouts",
    probability: probs[i],
    closesAt: new Date(`${round.date}T19:00:00Z`),
    liquidity: 1200,
  }));
};

const MARKETS: SeedMarket[] = [
  // Tournament winner
  winner("Argentina", 0.16),
  winner("Spain", 0.15),
  winner("France", 0.14),
  winner("England", 0.12),
  winner("Brazil", 0.1),
  winner("Portugal", 0.07),
  winner("Germany", 0.06),
  winner("Netherlands", 0.05),
  winner("USA", 0.03),
  winner("Mexico", 0.02),

  // Matches
  {
    slug: "mexico-wins-opening-match",
    question: "Will Mexico beat South Africa?",
    description:
      "The 2026 World Cup kicks off June 11 at Estadio Azteca, Mexico City, as Mexico face South Africa. Resolves YES if Mexico win in regulation.",
    category: "Matches",
    probability: 0.55,
    closesAt: new Date(KICKOFFS["Mexico vs South Africa"]),
  },
  // All 72 group-stage fixtures (opener handled above)
  ...GROUP_FIXTURES.map(match),

  // Knockout-stage progression placeholders (all 48 teams)
  ...KO_TEAMS.flatMap(knockout),

  // Props
  {
    slug: "host-nation-semifinal",
    question: "Will a host nation (USA, Canada or Mexico) reach the semi-finals?",
    description: "Resolves YES if any of the three co-hosts reaches the final four.",
    category: "Crazy Predictions",
    probability: 0.18,
    closesAt: TOURNAMENT_END,
  },
  {
    slug: "messi-scores-wc-2026",
    question: "Will Lionel Messi score a goal at the 2026 World Cup?",
    description: "Resolves YES if Messi scores at least one goal in the tournament (own goals excluded).",
    category: "Crazy Predictions",
    probability: 0.6,
    closesAt: TOURNAMENT_END,
  },
  {
    slug: "ronaldo-scores-wc-2026",
    question: "Will Cristiano Ronaldo score a goal at the 2026 World Cup?",
    description: "Resolves YES if Ronaldo scores at least one goal in the tournament (own goals excluded).",
    category: "Crazy Predictions",
    probability: 0.55,
    closesAt: TOURNAMENT_END,
  },
  {
    slug: "final-penalty-shootout",
    question: "Will the 2026 final be decided by a penalty shootout?",
    description: "Resolves YES if the final on July 19 goes to penalties.",
    category: "Crazy Predictions",
    probability: 0.2,
    closesAt: TOURNAMENT_END,
  },
  {
    slug: "golden-boot-7-goals",
    question: "Will the Golden Boot winner score 7+ goals?",
    description: "Resolves YES if the tournament's top scorer finishes with seven or more goals.",
    category: "Crazy Predictions",
    probability: 0.3,
    closesAt: TOURNAMENT_END,
  },
  {
    slug: "canada-advances-groups",
    question: "Will Canada advance past the group stage?",
    description: "Resolves YES if Canada qualifies for the knockout rounds.",
    category: "Crazy Predictions",
    probability: 0.45,
    closesAt: GROUP_STAGE_END,
  },
  {
    slug: "group-stage-hat-trick",
    question: "Will any player score a hat-trick in the group stage?",
    description: "Resolves YES if a player scores 3+ goals in a single group-stage match.",
    category: "Crazy Predictions",
    probability: 0.65,
    closesAt: GROUP_STAGE_END,
  },
  {
    slug: "mbappe-golden-boot",
    question: "Will Kylian Mbappé win the Golden Boot?",
    description: "Resolves YES if Mbappé wins (or shares) the top-scorer award.",
    category: "Crazy Predictions",
    probability: 0.15,
    closesAt: TOURNAMENT_END,
  },
];

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@worldcup.market").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error("Set ADMIN_PASSWORD in .env before seeding");
  }

  await db.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "Market Admin",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });
  console.log(`Admin user ready: ${adminEmail}`);

  for (const m of MARKETS) {
    const liquidity = m.liquidity ?? 1000;
    const state = seedStateForProbability(m.probability, liquidity);
    await db.market.upsert({
      where: { slug: m.slug },
      update: {},
      create: {
        slug: m.slug,
        question: m.question,
        description: m.description,
        category: m.category,
        closesAt: m.closesAt,
        liquidity,
        qYes: state.qYes,
        qNo: state.qNo,
      },
    });
  }
  console.log(`Seeded ${MARKETS.length} markets.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
