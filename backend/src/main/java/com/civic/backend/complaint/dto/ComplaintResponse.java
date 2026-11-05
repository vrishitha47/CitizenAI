package com.civic.backend.complaint.dto;

import com.civic.backend.complaint.enums.ComplaintStatus;
import com.civic.backend.complaint.enums.IssueCategory;
import com.civic.backend.complaint.enums.Priority;
import com.civic.backend.complaint.enums.Severity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * The full view of a complaint returned to clients, including AI analysis
 * and status history.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComplaintResponse {
    private Long id;
    private String referenceCode;

    private Long reporterId;
    private String reporterName;

    private IssueCategory category;
    private String categoryLabel;
    private String description;
    private String imageUrl;

    private Double latitude;
    private Double longitude;
    private String locationAddress;

    private Severity severity;
    private Priority priority;
    private ComplaintStatus status;
    private String assignedTo;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private AIAnalysisResponse aiAnalysis;
    private List<HistoryEntryResponse> history;
}
