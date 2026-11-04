package com.civic.backend.reward;

import com.civic.backend.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A single immutable line in a citizen's points ledger. Every points-earning
 * (or admin-adjusting) event appends one row; a citizen's total is the sum of
 * their rows. Mirrors the frontend RewardHistoryEntry shape.
 *
 * Modelled on {@code ComplaintHistory}: a thin append-only audit record.
 */
@Entity
@Table(name = "reward_ledger", indexes = {
        @Index(name = "idx_reward_ledger_user", columnList = "user_id"),
        @Index(name = "idx_reward_ledger_complaint", columnList = "complaint_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RewardLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ledger_id")
    private Long id;

    /**
     * The citizen this ledger entry belongs to.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RewardActivityType type;

    @Column(columnDefinition = "TEXT")
    private String description;

    /**
     * Signed point value: positive = earned, negative = deducted (only possible
     * via an admin adjustment).
     */
    @Column(nullable = false)
    private int points;

    /**
     * Optional complaint this entry was earned from — used both for display
     * deep-links and to keep awards idempotent (one VERIFIED/RESOLVED per
     * complaint).
     */
    @Column(name = "complaint_id")
    private Long complaintId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
