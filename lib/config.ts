/**
 * Feature flags. Kept in one place so the "pull-back switch" is obvious.
 *
 * PROPOSALS_ENABLED — the "Propose a Prediction" feature (user-submitted markets
 * with an admin review queue). Defaults OFF: when off, the pill, the /propose
 * form, and the proposal APIs all disappear and the app looks exactly like its
 * pre-feature state. Set NEXT_PUBLIC_ENABLE_PROPOSALS="true" in the environment
 * (Vercel + local .env) to turn it on; unset/anything-else keeps it off. Because
 * it's a NEXT_PUBLIC_ var it's readable from both server and client code (the
 * category pill is a client component); flipping it takes effect on the next
 * deploy. Proposed markets are additionally tagged in the DB
 * (Market.proposalStatus), so turning the flag off hides the entrypoint and a
 * cleanup pass can remove the rows — nothing baseline is ever mutated.
 */
export const PROPOSALS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PROPOSALS === "true";
