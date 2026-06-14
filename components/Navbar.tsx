"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Trophy, Coins } from "lucide-react";
import { formatWCD } from "@/lib/utils";

export function Navbar() {
  const { status } = useSession();
  const [me, setMe] = useState<{ name: string; balance: number; role: string } | null>(null);

  const refresh = useCallback(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setMe(d.user))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status === "authenticated") refresh();
    else setMe(null);
  }, [status, refresh]);

  useEffect(() => {
    window.addEventListener("balance-updated", refresh);
    return () => window.removeEventListener("balance-updated", refresh);
  }, [refresh]);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-amber-500/50 bg-gradient-to-r from-black via-zinc-900 to-black backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="mr-auto flex min-w-0 items-center gap-2.5">
          <Trophy className="h-9 w-9 shrink-0 text-amber-400 sm:h-11 sm:w-11" />
          <span className="hidden whitespace-nowrap bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-4xl font-black uppercase tracking-tight text-transparent sm:inline sm:text-5xl lg:text-7xl">
            World Cup 2026
          </span>
          <span className="self-start rounded bg-gradient-to-b from-amber-300 to-amber-500 px-2 py-1 text-xs font-black uppercase tracking-wide text-black shadow-sm">
            Predict
          </span>
        </Link>

        {/* Right column: global nav over the user / auth cluster, freeing the
            row width so the gold wordmark can stretch ~3/4 across. */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <nav className="flex items-center gap-4 text-sm font-semibold text-zinc-300">
            <Link href="/" className="hover:text-amber-400">Markets</Link>
            <Link href="/leaderboard" className="hover:text-amber-400">Leaderboard</Link>
            {me && (
              <Link href="/portfolio" className="hover:text-amber-400">Portfolio</Link>
            )}
            {me?.role === "ADMIN" && (
              <Link href="/admin" className="text-amber-400 hover:text-amber-300">Admin</Link>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {me ? (
              <>
                <Link
                  href="/profile"
                  title="Edit profile"
                  className="hidden text-sm font-medium text-zinc-200 hover:text-amber-400 sm:inline"
                >
                  {me.name}
                </Link>
                <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-amber-300 ring-1 ring-white/15">
                  <Coins className="h-4 w-4" />
                  {formatWCD(me.balance)}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-sm text-zinc-400 hover:text-amber-400"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm text-zinc-300 hover:text-amber-400">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-1.5 text-sm font-bold text-black hover:from-amber-200 hover:to-amber-400"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
