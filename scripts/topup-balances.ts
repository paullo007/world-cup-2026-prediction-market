// One-off: add a flat WC$ amount to every player's spendable cash balance.
// Dry-run by default; pass --apply to write to the live DB.
// Run: set -a; source .env; set +a; npx tsx scripts/topup-balances.ts [--apply]
import { db } from "../lib/db";

const AMOUNT = 1000; // flat WC$ added to every user's balance
const apply = process.argv.includes("--apply");

async function main() {
  const users = await db.user.findMany({
    select: { id: true, name: true, nickname: true, balance: true },
    orderBy: { balance: "desc" },
  });

  console.log(`${apply ? "APPLY" : "DRY-RUN"} — +${AMOUNT} WC$ to ${users.length} users\n`);
  for (const u of users) {
    const who = u.nickname ?? u.name;
    console.log(`  ${who.padEnd(16)} ${u.balance.toFixed(2)} -> ${(u.balance + AMOUNT).toFixed(2)}`);
  }

  if (apply) {
    const res = await db.user.updateMany({ data: { balance: { increment: AMOUNT } } });
    console.log(`\n✅ Updated ${res.count} users (+${AMOUNT} WC$ each).`);
  } else {
    console.log(`\n(dry-run — no changes written. Re-run with --apply to commit.)`);
  }
}

main().finally(() => db.$disconnect());
