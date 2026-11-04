package com.civic.backend.complaint.dto;

import com.civic.backend.complaint.enums.ComplaintStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoryEntryResponse {
    private ComplaintStatus status;
    private String updatedBy;
    private String remarks;
    private LocalDateTime timestamp;
}
