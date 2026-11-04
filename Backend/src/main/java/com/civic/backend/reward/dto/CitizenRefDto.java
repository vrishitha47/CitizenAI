package com.civic.backend.reward.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** A citizen, identified for the admin rewards views. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CitizenRefDto {
    private Long userId;
    private String name;
    private String email;
}
