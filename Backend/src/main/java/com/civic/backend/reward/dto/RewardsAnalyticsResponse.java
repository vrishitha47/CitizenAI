package com.civic.backend.reward.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Program-wide reward analytics for the admin dashboard. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RewardsAnalyticsResponse {
    private int totalCitizens;
    private int totalPointsIssued;
    private int totalBadgesAwarded;
    private int activeThisWeek;
    private double averageLevel;
    private List<BadgeCount> badgeDistribution;
    private List<LevelCount> levelDistribution;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BadgeCount {
        private String id;
        private String name;
        private String icon;
        private int earnedCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LevelCount {
        private int level;
        private String name;
        private int count;
    }
}
