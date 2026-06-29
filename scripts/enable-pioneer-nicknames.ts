// One-off: give the 3 original email/password "pioneer" users a nickname so they
// can use nickname-only login (type the nickname, no password) — they keep their
// email+password as a backup. Idempotent; targets by email. Dry-run default.
// Run: set -a; source .env; set +a; npx tsx scripts/enable-pioneer-nicknames.ts [--apply]
import { db } from "../lib/db";

const apply = process.argv.includes("--apply");
const TARGETS: { email: string; nickname: string }[] = [
  { email: "paul.lo@me.com", nickname: "Paul" },
  { email: "ahmad.dzuizz.annajib@gmail.com", nickname: "Dzuizz" },
  { email: "ainunnajib@gmail.com", nickname: "Ainun" },
];

async function main() {
  console.log(`${apply ? "APPLY" : "DRY-RUN"} — enable nickname login for pioneer users\n`);
  for (const t of TARGETS) {
    const lower = t.nickname.toLowerCase();
    const user = await db.user.findUnique({ where: { email: t.email }, select: { id: true, name: true, nickname: true } });
    if (!user) {
      console.log(`  ⚠ ${t.email} — NOT FOUND, skipping`);
      continue;
    }
    // Safety: ensure the desired nicknameLower isn't already taken by someone else.
    const clash = await db.user.findUnique({ where: { nicknameLower: lower }, select: { id: true, name: true } });
    if (clash && clash.id !== user.id) {
      console.log(`  ⚠ ${t.email} — nicknameLower "${lower}" already taken by ${JSON.stringify(clash.name)}, skipping`);
      continue;
    }
    console.log(`  ${t.email} (${JSON.stringify(user.name)}) → nickname "${t.nickname}" (lower "${lower}")`);
    if (apply) {
      await db.user.update({ where: { id: user.id }, data: { nickname: t.nickname, nicknameLower: lower } });
    }
  }
  console.log(`\n${apply ? "Applied." : "(dry-run — no changes. Re-run with --apply.)"}`);
}

main().finally(() => db.$disconnect());
