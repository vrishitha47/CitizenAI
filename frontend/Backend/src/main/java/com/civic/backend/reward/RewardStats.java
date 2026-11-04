package com.civic.backend.reward;

/**
 * The raw activity stats that badges are measured against. Computed server-side
 * from the citizen's complaints and AI analyses. Mirrors the frontend
 * RewardStats interface in rewards/engine.ts.
 */
public record RewardStats(
        int reportsSubmitted,
        int reportsResolved,
        int potholeReports,
        int garbageReports,
        int streetlightReports,
        int currentStreakDays,
        double maxAiConfidence // 0..1, best AI confidence across the citizen's reports
) {
    public static RewardStats empty() {
        return new RewardStats(0, 0, 0, 0, 0, 0, 0.0);
    }
}
