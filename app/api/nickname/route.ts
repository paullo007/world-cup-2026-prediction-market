import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { validateNickname } from "@/lib/nickname";

// Create a nickname account: instant 1000 WC$ (schema default). No password and
// no recovery code — sign-in is nickname-only (see lib/auth.ts). The client
// signs in immediately after.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const nickname: string = (body?.nickname ?? "").trim();

  const err = validateNickname(nickname);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const lower = nickname.toLowerCase();
  const existing = await db.user.findUnique({ where: { nicknameLower: lower } });
  if (existing) {
    return NextResponse.json({ error: "That nickname is taken — try another." }, { status: 409 });
  }

  try {
    await db.user.create({
      data: { name: nickname, nickname, nicknameLower: lower },
      // balance defaults to 1000 in the schema
    });
  } catch (e) {
    // Unique race: someone took the nickname between the check and the insert.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "That nickname is taken — try another." }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
