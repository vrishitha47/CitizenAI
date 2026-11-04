package com.civic.backend.user.dto;

import com.civic.backend.user.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * User row for the admin user-management table.
 */
@Data
@Builder
public class UserSummaryResponse {
    private Long id;
    private String name;
    private String email;
    private Role role;
    private LocalDateTime createdAt;
    private long complaintCount;
}
