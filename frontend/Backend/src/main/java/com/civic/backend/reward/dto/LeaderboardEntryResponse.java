package com.civic.backend.reward.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** One row in the admin rewards leaderboard. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardEntryResponse {
    private int rank;
    private CitizenRefDto user;
    private int totalPoints;
    private RewardLevelDto level;
    private int badgesEarned;
    private int reportsSubmitted;
    private int reportsResolved;
    private int currentStreakDays;
    /** Last points-earning activity — used to flag "active this week". */
    private LocalDateTime lastActivity;
}
