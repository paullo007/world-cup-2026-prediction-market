import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { validateNickname, generateRecoveryCode } from "@/lib/nickname";

// Create a nickname account: instant 1000 WC$ (schema default) + a one-time
// recovery code (returned once, stored hashed). No email/password needed.
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

  const code = generateRecoveryCode();
  try {
    await db.user.create({
      data: {
        name: nickname,
        nickname,
        nicknameLower: lower,
        recoveryCodeHash: await bcrypt.hash(code.canonical, 10),
        // balance defaults to 1000 in the schema
      },
    });
  } catch (e) {
    // Unique race: someone took the nickname between the check and the insert.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "That nickname is taken — try another." }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true, recoveryCode: code.display });
}
