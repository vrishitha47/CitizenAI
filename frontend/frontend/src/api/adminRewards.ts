import type {
  AdminCitizenReward,
  RewardLeaderboardEntry,
  RewardsAnalytics,
} from "../types";
import { api } from "./client";

/**
 * Admin rewards data layer — now wired to the real Spring Boot backend.
 *
 * The server runs every citizen through the same rules (RewardRules mirrors
 * rewards/engine.ts), so leaderboard totals, levels and badges stay consistent
 * with what citizens see. All four calls hit /api/admin/rewards/** (ADMIN-gated
 * by SecurityConfig).
 */

/** Ranked leaderboard of every citizen. GET /api/admin/rewards/leaderboard */
export async function fetchRewardsLeaderboard(): Promise<RewardLeaderboardEntry[]> {
  const { data } = await api.get<RewardLeaderboardEntry[]>("/admin/rewards/leaderboard");
  return data;
}

/** Program-wide analytics. GET /api/admin/rewards/analytics */
export async function fetchRewardsAnalytics(): Promise<RewardsAnalytics> {
  const { data } = await api.get<RewardsAnalytics>("/admin/rewards/analytics");
  return data;
}

/** One citizen's full profile. GET /api/admin/rewards/{userId} */
export async function fetchCitizenReward(userId: number): Promise<AdminCitizenReward | null> {
  try {
    const { data } = await api.get<AdminCitizenReward>(`/admin/rewards/${userId}`);
    return data;
  } catch (err) {
    // A 404 (unknown citizen) surfaces as "not found" in the UI rather than an error.
    if (isNotFound(err)) return null;
    throw err;
  }
}

/**
 * Manually grant (positive) or deduct (negative) points for a citizen, with a
 * required reason recorded to the ledger.
 * POST /api/admin/rewards/{userId}/adjust
 */
export async function adjustCitizenPoints(
  userId: number,
  points: number,
  reason: string
): Promise<AdminCitizenReward | null> {
  const { data } = await api.post<AdminCitizenReward>(
    `/admin/rewards/${userId}/adjust`,
    { points, reason }
  );
  return data;
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    (err as { response?: { status?: number } }).response?.status === 404
  );
}
