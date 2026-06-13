import { AiKnockoutBracket } from "@/components/AiKnockoutBracket";
import { AI_CHAMPION } from "@/lib/aiKnockouts";

export default function AiKnockoutsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">AI Knockouts — Claude&apos;s Predicted Bracket 🏆</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Just for fun: Claude&apos;s own prediction of how the 2026 knockout stage could play out —
          from the Round of 32 to the Final, with predicted scorelines. Winners advance across each
          round to a predicted champion:{" "}
          <span className="font-bold text-amber-600">{AI_CHAMPION}</span>. It&apos;s an AI guess —
          not official, and not tradeable.
        </p>
      </div>

      <AiKnockoutBracket />
    </div>
  );
}
