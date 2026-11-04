package com.civic.backend.reward.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A single citizen's full reward profile, as seen by an admin. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminCitizenRewardResponse {
    private CitizenRefDto user;
    private RewardProfileResponse profile;
}
