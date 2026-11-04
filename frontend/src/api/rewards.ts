import type { RewardGrant, RewardProfile } from "../types";
import { grantForReport } from "../rewards/engine";
import { api } from "./client";

/**
 * Rewards data layer — now wired to the real Spring Boot backend.
 *
 * The server mirrors rewards/engine.ts (same POINTS, LEVELS and BADGES) and
 * returns the fully-computed RewardProfile from GET /api/rewards/me, so the UI
 * is unchanged. The pure engine is still used client-side for the instant
 * "+points" success modal (rules are shared and deterministic, so no round-trip
 * is needed there).
 */

/**
 * Returns the signed-in citizen's fully-computed reward profile.
 * Backend: GET /api/rewards/me
 */
export async function fetchRewardProfile(): Promise<RewardProfile> {
  const { data } = await api.get<RewardProfile>("/rewards/me");
  return data;
}

/**
 * Computes the points a citizen will earn for the report they just submitted,
 * for the success modal. Kept client-side on purpose: the rules live in the
 * shared engine and are deterministic, so this matches what the backend records
 * in awardForSubmission without an extra network call.
 *
 * (A server round-trip is also available at POST /api/rewards/preview if ever
 * needed — e.g. to reflect the real first-report bonus for a brand-new user.)
 */
export function previewReportReward(opts?: {
  isFirstReport?: boolean;
  keepsStreak?: boolean;
}): RewardGrant {
  return grantForReport({
    isFirstReport: opts?.isFirstReport ?? false,
    keepsStreak: opts?.keepsStreak ?? true,
  });
}
