package com.civic.backend.notification;

import com.civic.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * An in-app notification addressed to a single user. Created automatically when
 * something happens that the user should know about (e.g. an admin changes the
 * status of one of their complaints).
 */
@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notification_recipient", columnList = "recipient_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id")
    private Long id;

    /**
     * The user this notification is for.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    /**
     * Optional deep-link the frontend can navigate to, e.g. "/app/complaints/42".
     */
    @Column(name = "link")
    private String link;

    /**
     * Optional complaint this notification relates to (for grouping / cleanup).
     */
    @Column(name = "complaint_id")
    private Long complaintId;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
