package com.civic.backend.notification.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {
    private Long id;
    private String title;
    private String message;
    private String link;
    private Long complaintId;
    private boolean read;
    private LocalDateTime createdAt;
}
