package com.civic.backend.complaint.dto;

import com.civic.backend.complaint.enums.IssueCategory;
import com.civic.backend.complaint.enums.Priority;
import com.civic.backend.complaint.enums.Severity;
import lombok.Builder;
import lombok.Data;

/**
 * Result of an on-demand AI analysis that is NOT persisted — used to preview a
 * detection on the report form (before a complaint exists) so the citizen can
 * have the category/severity/priority fields filled in for them.
 */
@Data
@Builder
public class AiPreviewResponse {
    private boolean detected;
    private IssueCategory category;
    private String categoryLabel;
    private Double confidence;
    private Severity severity;
    private Priority priority;
    private String modelVersion;
    private String message;
}
