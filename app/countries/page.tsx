import Link from "next/link";
import { GROUPS } from "@/lib/groups";
import { flag } from "@/lib/flags";
import { slugifyCountry } from "@/lib/countries";

export default function CountriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Countries</h1>
        <p className="mt-1 text-sm text-slate-400">
          All 48 teams by group. Click a country for its fixtures, squad, coach and history —
          laid out just like the Brazil tab.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(GROUPS).map(([letter, teams]) => (
          <section key={letter} className="rounded-2xl border border-surface-border bg-surface-raised p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-amber-600">
              Group {letter}
            </h2>
            <ul className="space-y-1">
              {teams.map((t) => (
                <li key={t}>
                  <Link
                    href={`/countries/${slugifyCountry(t)}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-surface-hover"
                  >
                    <span className="text-xl">{flag(t)}</span>
                    <span className="font-semibold">{t}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
