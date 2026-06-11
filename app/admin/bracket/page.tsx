import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BracketEditor } from "@/components/BracketEditor";

export const dynamic = "force-dynamic";

export default async function AdminBracketPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/");

  const assignments = await db.bracketAssignment.findMany();
  const initial: Record<string, string> = Object.fromEntries(
    assignments.map((a) => [a.slot, a.team])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Admin — Bracket</h1>
        <p className="mt-1 text-sm text-slate-400">
          Assign teams to knockout slots as the group stage and each round resolve. The{" "}
          <Link href="/bracket" className="font-semibold text-accent hover:underline">
            public bracket
          </Link>{" "}
          fills in automatically.
        </p>
      </div>
      <BracketEditor initial={initial} />
    </div>
  );
}
