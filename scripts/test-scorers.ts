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
  // Mononym scorer: ESPN's fullName is "Name null" (null last name) — must be
  // cleaned to just the name, not "Trézéguet null".
  { scoringPlay: true, type: { text: "Goal - Header" }, penaltyKick: false, ownGoal: false, team: { id: "2" }, clock: { displayValue: "82'" }, athletesInvolved: [{ displayName: "Trézéguet", fullName: "Trézéguet null" }] },
  // Penalty SHOOTOUT kicks — scoring plays typed "Penalty" but NOT goals (the
  // tie was level). ESPN logs them in period 5. All must be EXCLUDED, by any of
  // the three signals (period >= 5, a "shootout" type, or an explicit flag).
  { scoringPlay: true, type: { text: "Penalty - Scored" }, penaltyKick: true, period: { number: 5 }, team: { id: "1" }, clock: { displayValue: "120'" }, athletesInvolved: [{ displayName: "Shootout Taker A" }] },
  { scoringPlay: true, type: { text: "Penalty - Shootout" }, penaltyKick: true, team: { id: "2" }, clock: { displayValue: "120'" }, athletesInvolved: [{ displayName: "Shootout Taker B" }] },
  { scoringPlay: true, type: { text: "Penalty - Scored" }, penaltyKick: true, shootout: true, team: { id: "2" }, clock: { displayValue: "120'" }, athletesInvolved: [{ displayName: "Shootout Taker C" }] },
];

const scorers = parseEspnScorers(details, teamById);

assert.equal(scorers.length, 4, `expected 4 goals (penalty + goal + own goal + mononym; shootout kicks excluded), got ${scorers.length}`);

assert.ok(
  !scorers.some((s) => /Shootout Taker/.test(s.name)),
  "penalty shootout kicks must be excluded (not counted as goals)"
);

assert.ok(
  scorers.some((s) => s.name === "Trézéguet"),
  "mononym scorer must be cleaned to 'Trézéguet', not 'Trézéguet null'"
);
assert.ok(
  !scorers.some((s) => /\b(null|undefined)\b/i.test(s.name)),
  "no scorer name may contain a 'null'/'undefined' token"
);

const kane = scorers.find((s) => s.name === "Harry Kane");
assert.ok(kane?.penalty === true, "penalty goal must be captured and flagged penalty");

const og = scorers.find((s) => s.ownGoal);
assert.ok(og, "own goal must be captured");
assert.equal(og?.team, "England", "own goal must be credited to the benefiting team (England)");
assert.equal(og?.name, "Croatia Defender", "own goal keeps the own-scorer's name");

assert.ok(!scorers.some((s) => s.name === "Missed Guy"), "missed penalty must be excluded");
assert.ok(!scorers.some((s) => s.name === "Booked Guy"), "yellow card must be excluded");

console.log("✓ test-scorers: penalties kept, own goals credited to benefiting team, non-goals excluded, mononym names cleaned (4/4)");
