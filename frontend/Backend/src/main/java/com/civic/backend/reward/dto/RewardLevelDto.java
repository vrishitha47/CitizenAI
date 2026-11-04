package com.civic.backend.reward.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A tier on the level ladder, resolved for a given point total. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RewardLevelDto {
    private int level;
    private String name;
    private int minPoints;
    /** null = already at the top tier. */
    private Integer nextLevelPoints;
}
