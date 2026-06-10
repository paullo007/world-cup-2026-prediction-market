"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Trophy, Coins } from "lucide-react";
import { formatCoins } from "@/lib/utils";

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
    <header className="sticky top-0 z-40 border-b border-surface-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <Trophy className="h-6 w-6 text-amber-600" />
          <span className="hidden sm:inline">World Cup 2026</span>
          <span className="rounded bg-accent px-1.5 py-0.5 text-xs font-bold uppercase">
            Predict
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium text-slate-300">
          <Link href="/" className="hover:text-accent">Markets</Link>
          <Link href="/leaderboard" className="hover:text-accent">Leaderboard</Link>
          {me && (
            <Link href="/portfolio" className="hover:text-accent">Portfolio</Link>
          )}
          {me?.role === "ADMIN" && (
            <Link href="/admin" className="text-amber-600 hover:text-amber-700">Admin</Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {me ? (
            <>
              <Link
                href="/profile"
                title="Edit profile"
                className="hidden text-sm font-medium text-slate-200 hover:text-accent sm:inline"
              >
                {me.name}
              </Link>
              <span className="flex items-center gap-1.5 rounded-full bg-surface-raised px-3 py-1.5 text-sm font-semibold text-emerald-600">
                <Coins className="h-4 w-4" />
                {formatCoins(me.balance)}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm text-slate-400 hover:text-accent"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate-300 hover:text-accent">
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
