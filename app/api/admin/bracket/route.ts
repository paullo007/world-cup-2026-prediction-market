import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// { assignments: { "<slot>": "<team or empty>" } }
const schema = z.object({
  assignments: z.record(z.string(), z.string()),
});

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const entries = Object.entries(parsed.data.assignments);
  await db.$transaction(
    entries.map(([slot, team]) =>
      team.trim()
        ? db.bracketAssignment.upsert({
            where: { slot },
            update: { team: team.trim() },
            create: { slot, team: team.trim() },
          })
        : db.bracketAssignment.deleteMany({ where: { slot } })
    )
  );

  return NextResponse.json({ ok: true });
}
