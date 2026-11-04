package com.civic.backend.reward.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Admin manual points adjustment (grant if positive, deduct if negative). */
@Data
public class AdjustPointsRequest {

    /** Non-zero signed amount. Negative deducts points. */
    private int points;

    @NotBlank(message = "A reason is required for the audit trail")
    private String reason;
}
