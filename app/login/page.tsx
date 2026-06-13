"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function done(res: { error?: string | null } | undefined, msg: string) {
    setBusy(false);
    if (res?.error) {
      setError(msg);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  async function loginNickname(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await signIn("nickname", { nickname, redirect: false });
    done(res ?? undefined, "No account with that nickname yet — pick one below to get started.");
  }

  async function loginEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    done(res ?? undefined, "Invalid email or password.");
  }

  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="text-2xl font-extrabold">Log in</h1>

      {!showEmail ? (
        <>
          <p className="mt-1 text-sm text-slate-400">
            Just type your nickname to sign in — no password, nothing to remember.
          </p>
          <form onSubmit={loginNickname} className="mt-6 space-y-3">
            <input
              required
              autoFocus
              maxLength={12}
              placeholder="Nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2.5 outline-none focus:border-accent"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              disabled={busy}
              className="w-full rounded-lg bg-accent py-2.5 font-bold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Log in"}
            </button>
          </form>
          <p className="mt-4 text-sm text-slate-400">
            New here?{" "}
            <Link href="/register" className="font-semibold text-accent hover:underline">
              Pick a nickname & get 1,000 WC$
            </Link>
          </p>
          <button
            onClick={() => {
              setShowEmail(true);
              setError("");
            }}
            className="mt-2 text-sm font-bold text-accent hover:text-accent-hover hover:underline"
          >
            Returning email user / admin →
          </button>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-400">Log in with your email and password.</p>
          <form onSubmit={loginEmail} className="mt-6 space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2.5 outline-none focus:border-accent"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2.5 outline-none focus:border-accent"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              disabled={busy}
              className="w-full rounded-lg bg-accent py-2.5 font-bold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Log in"}
            </button>
          </form>
          <button
            onClick={() => {
              setShowEmail(false);
              setError("");
            }}
            className="mt-4 text-2xl font-bold text-blue-600 hover:text-blue-700"
          >
            ← Back to nickname login
          </button>
        </>
      )}
    </div>
  );
}
