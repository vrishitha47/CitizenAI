package com.civic.backend.complaint.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Aggregated numbers for the admin dashboard.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsResponse {

    private long total;
    private long pending;   // anything not RESOLVED or REJECTED
    private long resolved;
    private long inProgress;

    private List<Count> byStatus;
    private List<Count> byCategory;
    private List<Count> bySeverity;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Count {
        private String key;    // enum name
        private String label;  // display label
        private long value;
    }
}
