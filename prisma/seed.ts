import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedStateForProbability } from "../lib/amm";

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
    question: "Will Mexico win the opening match on June 11?",
    description:
      "The 2026 World Cup kicks off June 11 at Estadio Azteca, Mexico City. Resolves YES if Mexico wins in regulation.",
    category: "Matches",
    probability: 0.55,
    closesAt: OPENING_KICKOFF,
  },

  // Props
  {
    slug: "host-nation-semifinal",
    question: "Will a host nation (USA, Canada or Mexico) reach the semi-finals?",
    description: "Resolves YES if any of the three co-hosts reaches the final four.",
    category: "Props",
    probability: 0.18,
    closesAt: TOURNAMENT_END,
  },
  {
    slug: "messi-scores-wc-2026",
    question: "Will Lionel Messi score a goal at the 2026 World Cup?",
    description: "Resolves YES if Messi scores at least one goal in the tournament (own goals excluded).",
    category: "Props",
    probability: 0.6,
    closesAt: TOURNAMENT_END,
  },
  {
    slug: "ronaldo-scores-wc-2026",
    question: "Will Cristiano Ronaldo score a goal at the 2026 World Cup?",
    description: "Resolves YES if Ronaldo scores at least one goal in the tournament (own goals excluded).",
    category: "Props",
    probability: 0.55,
    closesAt: TOURNAMENT_END,
  },
  {
    slug: "final-penalty-shootout",
    question: "Will the 2026 final be decided by a penalty shootout?",
    description: "Resolves YES if the final on July 19 goes to penalties.",
    category: "Props",
    probability: 0.2,
    closesAt: TOURNAMENT_END,
  },
  {
    slug: "golden-boot-7-goals",
    question: "Will the Golden Boot winner score 7+ goals?",
    description: "Resolves YES if the tournament's top scorer finishes with seven or more goals.",
    category: "Props",
    probability: 0.3,
    closesAt: TOURNAMENT_END,
  },
  {
    slug: "canada-advances-groups",
    question: "Will Canada advance past the group stage?",
    description: "Resolves YES if Canada qualifies for the knockout rounds.",
    category: "Props",
    probability: 0.45,
    closesAt: GROUP_STAGE_END,
  },
  {
    slug: "group-stage-hat-trick",
    question: "Will any player score a hat-trick in the group stage?",
    description: "Resolves YES if a player scores 3+ goals in a single group-stage match.",
    category: "Props",
    probability: 0.65,
    closesAt: GROUP_STAGE_END,
  },
  {
    slug: "mbappe-golden-boot",
    question: "Will Kylian Mbappé win the Golden Boot?",
    description: "Resolves YES if Mbappé wins (or shares) the top-scorer award.",
    category: "Props",
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
