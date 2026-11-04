package com.civic.backend.complaint;

import com.civic.backend.complaint.enums.ComplaintStatus;
import com.civic.backend.complaint.enums.IssueCategory;
import com.civic.backend.complaint.enums.Severity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    List<Complaint> findByReporterIdOrderByCreatedAtDesc(Long reporterId);

    boolean existsByReferenceCode(String referenceCode);

    /**
     * Admin listing with optional filters and a free-text search over the
     * reference code, description and location. A null filter value means "any".
     * Sorting is driven by the Pageable's Sort.
     */
    @Query("""
            SELECT c FROM Complaint c
            WHERE (:category IS NULL OR c.category = :category)
              AND (:severity IS NULL OR c.severity = :severity)
              AND (:status IS NULL OR c.status = :status)
              AND (:search IS NULL OR :search = ''
                   OR LOWER(c.referenceCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(c.description) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(c.locationAddress) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<Complaint> findWithFilters(
            @Param("category") IssueCategory category,
            @Param("severity") Severity severity,
            @Param("status") ComplaintStatus status,
            @Param("search") String search,
            Pageable pageable
    );

    long countByStatus(ComplaintStatus status);

    long countByCategory(IssueCategory category);

    long countBySeverity(Severity severity);

    long countByReporterId(Long reporterId);

    long countByReporterIdAndStatus(Long reporterId, ComplaintStatus status);

    long countByReporterIdAndCategory(Long reporterId, IssueCategory category);
}
