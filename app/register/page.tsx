"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/nickname", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not create that nickname.");
      setBusy(false);
      return;
    }
    // Log in immediately with just the nickname, then go to the markets.
    await signIn("nickname", { nickname, redirect: false });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="text-2xl font-extrabold">Pick a nickname</h1>
      <p className="mt-1 text-sm text-slate-400">
        No email, no password, nothing to remember — just a nickname and you&apos;re in with{" "}
        <span className="font-bold text-emerald-600">2,000 WC$</span>. Sign back in any time by
        typing the same nickname.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-2">
        <input
          required
          autoFocus
          maxLength={12}
          placeholder="e.g. GoalMachine7"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2.5 outline-none focus:border-accent"
        />
        <p className="text-xs text-slate-400">
          Letters and numbers only, no spaces, up to 12 characters.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={busy}
          className="mt-2 w-full rounded-lg bg-accent py-2.5 font-bold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create nickname & get 2,000 WC$"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-400">
        Been here before?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
