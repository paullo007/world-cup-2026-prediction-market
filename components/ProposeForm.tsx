"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

/**
 * "Propose a Prediction" form — a signed-in user submits a free-text yes/no
 * market (question + resolution criteria + close date). On submit it's created
 * as a PENDING proposal; an admin then approves it live on /admin/proposals, so
 * the form shows a "submitted for review" confirmation rather than jumping to a
 * live market. Mirrors the industry standard (Kalshi/Polymarket): a well-formed
 * proposal needs an unambiguous question, written resolution criteria, and a
 * close date.
 */
export function ProposeForm() {
  const { status } = useSession();
  const [question, setQuestion] = useState("");
  const [rules, setRules] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, rules, closesAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ kind: "err", text: data.error ?? "Could not submit that proposal." });
      } else {
        setMessage({
          kind: "ok",
          text: "Submitted for review! An admin will approve it before it goes live.",
        });
        setQuestion("");
        setRules("");
        setClosesAt("");
      }
    } catch {
      setMessage({ kind: "err", text: "Network error — try again." });
    } finally {
      setBusy(false);
    }
  }

  if (status === "unauthenticated") {
    return (
      <div className="rounded-2xl border border-surface-border bg-surface-raised p-8 text-center">
        <p className="text-sm text-slate-300">Sign in to propose a prediction.</p>
        <Link
          href="/login"
          className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Log in
        </Link>
      </div>
    );
  }

  const field = "w-full rounded-lg border border-surface-border bg-surface px-3 py-2.5 text-sm";
  const canSubmit = question.trim().length >= 12 && rules.trim().length >= 10 && closesAt && !busy;

  return (
    <div className="space-y-5 rounded-2xl border border-surface-border bg-surface-raised p-6">
      <div>
        <label className="mb-1.5 block text-sm font-semibold">
          Your prediction <span className="font-normal text-slate-400">(a yes/no question)</span>
        </label>
        <input
          type="text"
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            setMessage(null);
          }}
          placeholder="e.g. Will Lionel Messi score in the 2026 World Cup Final?"
          maxLength={200}
          className={field}
        />
        <p className="mt-1 text-xs text-slate-400">
          Frame it so the answer is clearly YES or NO. {question.length}/200
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold">
          How it resolves <span className="font-normal text-slate-400">(what makes it YES vs NO)</span>
        </label>
        <textarea
          value={rules}
          onChange={(e) => {
            setRules(e.target.value);
            setMessage(null);
          }}
          placeholder="e.g. Resolves YES if Messi scores at any point (including extra time, excluding the penalty shootout) in the Final. Otherwise NO."
          maxLength={500}
          rows={3}
          className={cn(field, "resize-y")}
        />
        <p className="mt-1 text-xs text-slate-400">
          Be specific — this is the rulebook the admin uses to settle it. {rules.length}/500
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold">Trading closes</label>
        <input
          type="datetime-local"
          value={closesAt}
          onChange={(e) => {
            setClosesAt(e.target.value);
            setMessage(null);
          }}
          className={cn(field, "sm:max-w-xs")}
        />
        <p className="mt-1 text-xs text-slate-400">
          When trading stops (before the outcome is known). No later than the tournament end, Jul 19, 2026.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Submit for review"}
        </button>
        {message && (
          <p className={cn("text-sm", message.kind === "ok" ? "text-yes" : "text-no")}>{message.text}</p>
        )}
      </div>

      <div className="rounded-lg border border-surface-border bg-surface px-4 py-3 text-xs text-slate-400">
        <p className="font-semibold text-slate-300">How proposals work</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-4">
          <li>You submit a yes/no prediction with clear resolution criteria.</li>
          <li>An admin reviews it (blocks spam/ambiguous/duplicate markets).</li>
          <li>Once approved it opens at 50/50 and everyone can trade it.</li>
          <li>When the outcome is known, an admin settles it YES or NO.</li>
        </ol>
      </div>
    </div>
  );
}
