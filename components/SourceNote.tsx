import type { SourceLink } from "@/lib/sources";

/**
 * "Source:" attribution line for data-driven tabs, linking out to the public
 * feed(s) the figures are compiled from. Rendered in the empty space below the
 * table.
 */
export function SourceNote({ sources }: { sources: SourceLink[] }) {
  return (
    <p className="mt-6 border-t border-surface-border pt-4 text-xs text-slate-400">
      Source:{" "}
      {sources.map((s, i) => (
        <span key={s.url}>
          {i > 0 && ", "}
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:underline"
          >
            {s.url}
          </a>
        </span>
      ))}
    </p>
  );
}
