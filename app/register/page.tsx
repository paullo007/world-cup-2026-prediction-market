"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Registration failed");
      setBusy(false);
      return;
    }
    await signIn("credentials", { email, password, redirect: false });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="text-2xl font-extrabold">Create account</h1>
      <p className="mt-1 text-sm text-slate-400">
        Start with <span className="font-bold text-emerald-600">$1,000 WCD</span> free.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <input
          required
          placeholder="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2.5 outline-none focus:border-accent"
        />
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
          minLength={8}
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-surface-border bg-surface-raised px-3 py-2.5 outline-none focus:border-accent"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-accent py-2.5 font-bold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "Creating…" : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-400">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
