package com.civic.backend.reward;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RewardLedgerRepository extends JpaRepository<RewardLedger, Long> {

    /** A citizen's full ledger, newest first (display order). */
    List<RewardLedger> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** Sum of a citizen's points. Null when they have no entries yet. */
    @Query("SELECT COALESCE(SUM(l.points), 0) FROM RewardLedger l WHERE l.user.id = :userId")
    int sumPointsByUserId(@Param("userId") Long userId);

    /**
     * Guards award idempotency: has this complaint already produced an entry of
     * the given type (e.g. a REPORT_RESOLVED), so we don't award twice if an
     * admin toggles status back and forth.
     */
    boolean existsByUserIdAndComplaintIdAndType(Long userId, Long complaintId, RewardActivityType type);

    long countByUserIdAndType(Long userId, RewardActivityType type);

    long countByType(RewardActivityType type);
}
