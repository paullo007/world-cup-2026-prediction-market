"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="text-2xl font-extrabold">Log in</h1>
      <p className="mt-1 text-sm text-slate-400">Welcome back to the market.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
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
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-accent py-2.5 font-bold hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-400">
        No account?{" "}
        <Link href="/register" className="font-semibold text-accent hover:underline">
          Sign up and get 1,000 coins
        </Link>
      </p>
    </div>
  );
}
