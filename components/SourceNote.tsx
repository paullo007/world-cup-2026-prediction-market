import type { SourceLink } from "@/lib/sources";

/**
 * "Source:" attribution line for data-driven tabs, linking out to the public
 * feed(s) the figures are compiled from. Rendered in the empty space below the
 * table.
 */
export function SourceNote({ sources }: { sources: SourceLink[] }) {
  return (
    <div className="mt-6 border-t border-surface-border pt-4 text-xs text-slate-400">
      <p>Source:</p>
      <ol className="mt-1 space-y-0.5">
        {sources.map((s, i) => (
          <li key={s.url}>
            {i + 1}){" "}
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              {s.url}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
