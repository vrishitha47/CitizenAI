package com.civic.backend.complaint;

import com.civic.backend.complaint.enums.ComplaintStatus;
import com.civic.backend.complaint.enums.IssueCategory;
import com.civic.backend.complaint.enums.Priority;
import com.civic.backend.complaint.enums.Severity;
import com.civic.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A civic issue reported by a citizen. This is the central entity of the system.
 */
@Entity
@Table(name = "complaints")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Complaint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "complaint_id")
    private Long id;

    /**
     * Human-friendly reference shown to citizens, e.g. "CIV-10245".
     */
    @Column(name = "reference_code", unique = true, length = 20)
    private String referenceCode;

    /**
     * The citizen who filed this complaint.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User reporter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private IssueCategory category;

    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Relative URL / path to the uploaded image, e.g. "/uploads/abc123.jpg".
     */
    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    /**
     * Optional human-readable address / landmark for the location.
     */
    @Column(name = "location_address")
    private String locationAddress;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Severity severity;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ComplaintStatus status;

    /**
     * Free-text describing who/what team the complaint is assigned to.
     * (A full assignee relationship can be added later.)
     */
    @Column(name = "assigned_to")
    private String assignedTo;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = ComplaintStatus.SUBMITTED;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
