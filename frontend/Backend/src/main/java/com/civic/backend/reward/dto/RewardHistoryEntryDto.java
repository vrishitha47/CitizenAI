package com.civic.backend.reward.dto;

import com.civic.backend.reward.RewardActivityType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** A single line in the citizen's points ledger. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RewardHistoryEntryDto {
    private Long id;
    private RewardActivityType type;
    private String description;
    private int points; // positive = earned, negative = deducted
    private LocalDateTime date;
    private Long complaintId;
}
