"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronDown } from "lucide-react";
import { ALL_TEAMS, flag } from "@/lib/flags";
import { cn } from "@/lib/utils";

const OTHER = "__other__";

/**
 * "Predict My Own World Cup Winner" — a collapsible panel pinned at the top of
 * the Tournament Winner tab, styled like the Countries tab's "History of World
 * Cup Winners" button. A signed-in user picks a team that isn't already on the
 * list (dropdown of the remaining 48-team field) — or types their own via
 * "Other" — and we create a live winner market on the spot (POST
 * /api/winner-markets), then jump to it.
 *
 * `existingTeams` are the canonical names that already have a winner market, so
 * we keep them out of the dropdown.
 */
export function PredictMyOwnWinner({ existingTeams }: { existingTeams: string[] }) {
  const router = useRouter();
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState("");
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const remaining = useMemo(() => {
    const taken = new Set(existingTeams);
    return ALL_TEAMS.filter((t) => !taken.has(t));
  }, [existingTeams]);

  const team = (choice === OTHER ? custom : choice).trim();

  async function submit() {
    if (!team) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/winner-markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ kind: "err", text: data.error ?? "Could not create that market." });
      } else {
        router.push(`/markets/${data.slug}`);
        router.refresh();
      }
    } catch {
      setMessage({ kind: "err", text: "Network error — try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-surface-border bg-surface-raised">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left transition hover:bg-surface-hover"
      >
        <span className="text-sm font-bold uppercase tracking-widest text-amber-600">
          ⚽ Predict My Own World Cup Winner
        </span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-surface-border px-5 py-5">
          {status === "unauthenticated" ? (
            <div className="text-center">
              <p className="text-sm text-slate-300">Sign in to propose your own champion.</p>
              <Link
                href="/login"
                className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
              >
                Log in
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-4 max-w-2xl text-sm text-slate-300">
                Don&apos;t see your pick above? Choose any team from the field — or type your own —
                and we&apos;ll open a live <span className="font-semibold">&ldquo;Will they win the
                2026 FIFA World Cup?&rdquo;</span> market at fair starting odds. Prices then move with
                the crowd.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={choice}
                  onChange={(e) => {
                    setChoice(e.target.value);
                    setMessage(null);
                  }}
                  className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2.5 text-sm sm:max-w-xs"
                >
                  <option value="">Select a team…</option>
                  {remaining.map((t) => (
                    <option key={t} value={t}>
                      {flag(t)} {t}
                    </option>
                  ))}
                  <option value={OTHER}>✏️ Other — type your own</option>
                </select>

                {choice === OTHER && (
                  <input
                    type="text"
                    value={custom}
                    onChange={(e) => {
                      setCustom(e.target.value);
                      setMessage(null);
                    }}
                    placeholder="Enter a country"
                    maxLength={40}
                    className="w-full rounded-lg border border-surface-border bg-surface px-3 py-2.5 text-sm sm:max-w-xs"
                  />
                )}

                <button
                  type="button"
                  onClick={submit}
                  disabled={busy || !team}
                  className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Creating…" : "Create market"}
                </button>
              </div>

              {message && (
                <p className={cn("mt-3 text-sm", message.kind === "ok" ? "text-yes" : "text-no")}>
                  {message.text}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
