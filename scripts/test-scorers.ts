import assert from "node:assert/strict";
import { parseEspnScorers, type EspnDetail } from "../lib/results";

/**
 * Regression test for the ESPN scoring-play parser. Locks in the bugs we hit:
 * penalties (typed "Penalty - Scored", no "goal") must be kept; own goals must
 * be kept and credited to the BENEFITING team; missed penalties and non-goal
 * plays must be excluded. Run: `npm run test:scorers`.
 */
const teamById = new Map<string, string>([
  ["1", "England"],
  ["2", "Croatia"],
]);

const details: EspnDetail[] = [
  // Scored penalty — must be captured + flagged penalty.
  { scoringPlay: true, type: { text: "Penalty - Scored" }, penaltyKick: true, ownGoal: false, team: { id: "1" }, clock: { displayValue: "12'" }, athletesInvolved: [{ displayName: "Harry Kane" }] },
  // Regular goal.
  { scoringPlay: true, type: { text: "Goal" }, penaltyKick: false, ownGoal: false, team: { id: "1" }, clock: { displayValue: "42'" }, athletesInvolved: [{ displayName: "Jude Bellingham" }] },
  // Own goal by a Croatia player — ESPN sets team.id to the benefiting side (England).
  { scoringPlay: true, type: { text: "Own Goal" }, penaltyKick: false, ownGoal: true, team: { id: "1" }, clock: { displayValue: "55'" }, athletesInvolved: [{ displayName: "Croatia Defender" }] },
  // Missed penalty — not a scoring play, must be excluded.
  { scoringPlay: false, type: { text: "Penalty - Missed" }, penaltyKick: true, ownGoal: false, team: { id: "2" }, clock: { displayValue: "70'" }, athletesInvolved: [{ displayName: "Missed Guy" }] },
  // Yellow card — not a goal, must be excluded.
  { scoringPlay: false, type: { text: "Yellow Card" }, team: { id: "2" }, athletesInvolved: [{ displayName: "Booked Guy" }] },
];

const scorers = parseEspnScorers(details, teamById);

assert.equal(scorers.length, 3, `expected 3 goals (penalty + goal + own goal), got ${scorers.length}`);

const kane = scorers.find((s) => s.name === "Harry Kane");
assert.ok(kane?.penalty === true, "penalty goal must be captured and flagged penalty");

const og = scorers.find((s) => s.ownGoal);
assert.ok(og, "own goal must be captured");
assert.equal(og?.team, "England", "own goal must be credited to the benefiting team (England)");
assert.equal(og?.name, "Croatia Defender", "own goal keeps the own-scorer's name");

assert.ok(!scorers.some((s) => s.name === "Missed Guy"), "missed penalty must be excluded");
assert.ok(!scorers.some((s) => s.name === "Booked Guy"), "yellow card must be excluded");

console.log("✓ test-scorers: penalties kept, own goals credited to benefiting team, non-goals excluded (3/3)");
