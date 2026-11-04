package com.civic.backend.reward.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** The headline counters shown next to a citizen's profile. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RewardStatsDto {
    private int reportsSubmitted;
    private int reportsResolved;
    private int currentStreakDays;
    private int badgesEarned;
}
