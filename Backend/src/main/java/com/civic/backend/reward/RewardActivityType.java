package com.civic.backend.reward;

/**
 * The civic actions that earn (or, for ADMIN_ADJUSTMENT, can also deduct)
 * points. Mirrors the frontend's RewardActivityType union and the POINTS /
 * HUMAN_ACTIVITY tables in rewards/engine.ts so citizen and authority views
 * agree with the server.
 *
 * Each type carries its DEFAULT point value. ADMIN_ADJUSTMENT is variable:
 * the amount is supplied per-entry by an admin, so its default is 0.
 */
public enum RewardActivityType {

    REPORT_SUBMITTED(50, "Reported an issue"),
    REPORT_VERIFIED(20, "Report verified by authority"),
    REPORT_RESOLVED(100, "Reported issue resolved"),
    FIRST_REPORT_BONUS(100, "Welcome bonus — first report"),
    STREAK_BONUS(30, "Weekly reporting streak"),
    BADGE_BONUS(0, "Badge bonus"),
    ADMIN_ADJUSTMENT(0, "Manual adjustment by authority");

    private final int defaultPoints;
    private final String label;

    RewardActivityType(int defaultPoints, String label) {
        this.defaultPoints = defaultPoints;
        this.label = label;
    }

    public int getDefaultPoints() {
        return defaultPoints;
    }

    public String getLabel() {
        return label;
    }
}
