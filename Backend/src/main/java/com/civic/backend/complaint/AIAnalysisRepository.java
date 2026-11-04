package com.civic.backend.complaint;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AIAnalysisRepository extends JpaRepository<AIAnalysis, Long> {

    Optional<AIAnalysis> findByComplaintId(Long complaintId);

    /** Best AI confidence (0..1) across all of a citizen's reports; null if none. */
    @Query("SELECT MAX(a.confidence) FROM AIAnalysis a WHERE a.complaint.reporter.id = :userId")
    Double findMaxConfidenceByReporterId(@Param("userId") Long userId);
}
