package com.civic.backend.reward.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Points a citizen earns for the report they just submitted (success modal). */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RewardGrantResponse {
    private int totalAwarded;
    private List<Line> breakdown;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Line {
        private String label;
        private int points;
    }
}
