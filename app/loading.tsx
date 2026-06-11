import { Hourglass } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-slate-400">
      <Hourglass className="h-8 w-8 animate-spin text-accent" style={{ animationDuration: "1.5s" }} />
      <p className="text-sm font-medium">Loading…</p>
    </div>
  );
}
