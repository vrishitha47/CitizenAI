package com.civic.backend.reward.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** An achievement — either earned or still locked (with progress). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BadgeDto {
    private String id;
    private String name;
    private String description;
    private String icon; // emoji glyph
    private boolean earned;
    private LocalDateTime earnedDate; // null if locked or date unknown
    private int current;  // progress toward the goal
    private int target;   // goal needed to unlock
    private int progressPercent; // 0..100
}
