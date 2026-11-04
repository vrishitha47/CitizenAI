package com.civic.backend.reward.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Everything the Rewards UI needs — fully computed server-side. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RewardProfileResponse {
    private int totalPoints;
    private RewardLevelDto level;
    private int pointsIntoLevel;      // points earned since entering the current level
    private Integer pointsToNextLevel; // points still needed to level up (null at max)
    private Integer levelSpan;         // size of the current level band (null at max)
    private int progressPercent;       // 0..100 within the current level
    private RewardStatsDto stats;
    private List<BadgeDto> badges;
    private List<RewardHistoryEntryDto> history;
}
