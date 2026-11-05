package com.civic.backend.complaint.dto;

import com.civic.backend.complaint.enums.ComplaintStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload an admin sends to advance a complaint's status. Optionally records
 * who it's assigned to and a remark that lands in the history trail.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStatusRequest {

    @NotNull(message = "Status is required")
    private ComplaintStatus status;

    private String assignedTo;

    private String remarks;
}
