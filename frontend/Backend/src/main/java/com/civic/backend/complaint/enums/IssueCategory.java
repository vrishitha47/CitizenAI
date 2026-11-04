package com.civic.backend.complaint.enums;

/**
 * Civic issue categories. Kept as an enum for type-safety in Part 2;
 * can be migrated to a configurable DB-backed table later if you need
 * to add categories without redeploying.
 */
public enum IssueCategory {
    POTHOLE("Pothole"),
    DAMAGED_ROAD("Damaged Road"),
    GARBAGE("Garbage / Waste"),
    BROKEN_STREETLIGHT("Broken Streetlight"),
    WATER_LEAKAGE("Water Leakage"),
    DAMAGED_INFRASTRUCTURE("Damaged Infrastructure"),
    OTHER("Other");

    private final String displayName;

    IssueCategory(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
