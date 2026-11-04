package com.civic.backend.complaint;

import com.civic.backend.complaint.enums.ComplaintStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * An audit trail entry recording each status change on a complaint, so the
 * full lifecycle is preserved instead of just the current status.
 */
@Entity
@Table(name = "complaint_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComplaintHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "complaint_id", nullable = false)
    private Complaint complaint;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ComplaintStatus status;

    /**
     * Email/name of whoever triggered this change (citizen on creation,
     * admin on updates, or "SYSTEM" for automated steps).
     */
    @Column(name = "updated_by")
    private String updatedBy;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "timestamp", nullable = false, updatable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        this.timestamp = LocalDateTime.now();
    }
}
