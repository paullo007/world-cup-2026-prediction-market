import Link from "next/link";
import { slugifyCountry, countryFromSlug } from "@/lib/countries";
import { canonicalTeam } from "@/lib/flags";
import { cn } from "@/lib/utils";

/**
 * Render a country name as a subtle link to its `/countries/<slug>` detail page —
 * but ONLY when the name resolves to a real country page. Non-country text
 * ("Draw", player names) and historical teams with no 2026 page (West Germany,
 * Czechoslovakia, …) fall back to plain text, so it's always safe to wrap a name.
 *
 * Subtle by design: inherits the surrounding color/weight and only adds a hover
 * underline + pointer. Has no hooks, so it works in both server and client
 * components. Do NOT place it inside another <a>/Link (invalid nested anchors).
 */
export function CountryLink({ name, className }: { name?: string | null; className?: string }) {
  if (!name) return null;
  const slug = slugifyCountry(canonicalTeam(name));
  const resolved = slug ? countryFromSlug(slug) : null;
  // Not a linkable country → plain text, but keep the className so layout
  // (e.g. `flex-1 truncate` in a row) is preserved either way.
  if (!resolved) return <span className={className}>{name}</span>;
  return (
    <Link
      href={`/countries/${slug}`}
      className={cn("hover:underline", className)}
      title={`${resolved} — squad, fixtures & history`}
    >
      {name}
    </Link>
  );
}
