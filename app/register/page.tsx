"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [copied, setCopied] = useState(false);
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
    // Log in immediately with the fresh code, then reveal it to save.
    await signIn("nickname", { nickname, recoveryCode: data.recoveryCode, redirect: false });
    setRecoveryCode(data.recoveryCode);
    setBusy(false);
  }

  // Step 2: show the recovery code once.
  if (recoveryCode) {
    return (
      <div className="mx-auto max-w-sm pt-10">
        <h1 className="text-2xl font-extrabold">You&apos;re in, {nickname}! 🎉</h1>
        <p className="mt-1 text-sm text-slate-400">
          You&apos;ve got <span className="font-bold text-emerald-600">1,000 WC$</span>. Save
          this recovery code — it&apos;s the <span className="font-semibold">only</span> way back
          into your account if you switch devices or clear your browser.
        </p>
        <div className="mt-5 rounded-xl border border-accent/40 bg-surface-raised p-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Recovery code
          </div>
          <div className="mt-1 select-all font-mono text-2xl font-extrabold tracking-widest text-accent">
            {recoveryCode}
          </div>
        </div>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(recoveryCode);
            setCopied(true);
          }}
          className="mt-3 w-full rounded-lg border border-surface-border py-2 text-sm font-semibold hover:border-accent"
        >
          {copied ? "Copied ✓" : "Copy code"}
        </button>
        <button
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          className="mt-3 w-full rounded-lg bg-accent py-2.5 font-bold text-white hover:bg-accent-hover"
        >
          I&apos;ve saved it — start trading
        </button>
      </div>
    );
  }

  // Step 1: pick a nickname.
  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="text-2xl font-extrabold">Pick a nickname</h1>
      <p className="mt-1 text-sm text-slate-400">
        No email, no password. Just a nickname and you&apos;re in with{" "}
        <span className="font-bold text-emerald-600">1,000 WC$</span>.
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
          {busy ? "Creating…" : "Create nickname & get 1,000 WC$"}
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
