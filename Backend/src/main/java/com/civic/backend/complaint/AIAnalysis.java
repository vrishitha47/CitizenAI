package com.civic.backend.complaint;

import com.civic.backend.complaint.enums.Severity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Stores the result of the AI service analysing a complaint's image.
 * Populated in Part 3 when the AI microservice is wired in; the columns
 * exist now so the schema is stable.
 */
@Entity
@Table(name = "ai_analysis")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "analysis_id")
    private Long id;

    /**
     * One analysis per complaint (for now).
     */
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "complaint_id", nullable = false, unique = true)
    private Complaint complaint;

    /**
     * The class the model detected, e.g. "pothole".
     */
    @Column(name = "detected_class")
    private String detectedClass;

    /**
     * Model confidence 0.0 - 1.0.
     */
    @Column(name = "confidence")
    private Double confidence;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Severity severity;

    /**
     * Bounding box as a JSON string, e.g. "[x, y, width, height]".
     */
    @Column(name = "bounding_box", columnDefinition = "TEXT")
    private String boundingBox;

    @Column(name = "model_version")
    private String modelVersion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
