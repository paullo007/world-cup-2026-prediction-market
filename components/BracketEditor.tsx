"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BRACKET, THIRD_PLACE, type BracketMatch } from "@/lib/bracket";
import { ALL_TEAMS, flag } from "@/lib/flags";

const ROUNDS = [...BRACKET, { key: "third", name: "Third-place play-off", dates: "Jul 18", matches: [THIRD_PLACE] }];

export function BracketEditor({ initial }: { initial: Record<string, string> }) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<string, string>>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const set = (slot: string, team: string) => setVals((v) => ({ ...v, [slot]: team }));

  async function save() {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/bracket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignments: vals }),
    });
    setBusy(false);
    setMsg(res.ok ? "Saved." : "Save failed.");
    if (res.ok) router.refresh();
  }

  const SlotSelect = ({ slot, label }: { slot: string; label: string }) => {
    const team = vals[slot] ?? "";
    return (
      <div className="flex items-center gap-2">
        <span className="w-5 text-center">{team ? flag(team) : ""}</span>
        <select
          value={team}
          onChange={(e) => set(slot, e.target.value)}
          className="flex-1 rounded-md border border-surface-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-accent"
        >
          <option value="">— {label} —</option>
          {ALL_TEAMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const MatchRow = ({ m }: { m: BracketMatch }) => (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-3">
      <div className="mb-2 text-xs font-semibold text-slate-400">Match #{m.num}</div>
      <div className="space-y-2">
        <SlotSelect slot={`${m.num}a`} label={m.a.label} />
        <SlotSelect slot={`${m.num}b`} label={m.b.label} />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="sticky top-16 z-10 flex items-center gap-3 rounded-lg border border-surface-border bg-surface/90 px-4 py-3 backdrop-blur">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save bracket"}
        </button>
        {msg && <span className="text-sm text-slate-400">{msg}</span>}
        <span className="ml-auto text-xs text-slate-400">
          Leave a slot blank to clear it. Fill teams as results come in.
        </span>
      </div>

      {ROUNDS.map((round) => (
        <section key={round.key}>
          <h2 className="mb-3 text-lg font-bold">
            {round.name} <span className="text-sm font-normal text-slate-400">· {round.dates}</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {round.matches.map((m) => (
              <MatchRow key={m.num} m={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
