package com.civic.backend.reward;

import com.civic.backend.complaint.AIAnalysisRepository;
import com.civic.backend.complaint.Complaint;
import com.civic.backend.complaint.ComplaintRepository;
import com.civic.backend.complaint.enums.ComplaintStatus;
import com.civic.backend.complaint.enums.IssueCategory;
import com.civic.backend.reward.dto.*;
import com.civic.backend.user.Role;
import com.civic.backend.user.User;
import com.civic.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Computes citizen reward profiles from the ledger + complaint activity, and
 * records point-earning events. The point/level/badge RULES live in
 * {@link RewardRules} / {@link RewardActivityType}, mirroring the frontend
 * engine so both sides agree.
 *
 * Awarding is deliberately fail-soft (like NotificationService): a reward
 * problem must never break the action that triggered it (reporting an issue,
 * updating a status).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RewardService {

    private final RewardLedgerRepository ledgerRepository;
    private final ComplaintRepository complaintRepository;
    private final AIAnalysisRepository aiAnalysisRepository;
    private final UserRepository userRepository;

    // ----------------------------------------------------------------
    // Awarding (called from the complaint lifecycle; fail-soft)
    // ----------------------------------------------------------------

    /**
     * Award points for a freshly created complaint: REPORT_SUBMITTED always,
     * plus a one-time FIRST_REPORT_BONUS if this is the citizen's first report.
     * Any failure is logged and swallowed so complaint creation never fails.
     */
    @Transactional
    public void awardForSubmission(User reporter, Complaint complaint) {
        try {
            String label = complaint.getCategory() == null
                    ? "an issue" : complaint.getCategory().getDisplayName();
            String ref = complaint.getReferenceCode() == null
                    ? "" : " (" + complaint.getReferenceCode() + ")";
            append(reporter, RewardActivityType.REPORT_SUBMITTED,
                    "Reported " + label + ref, complaint.getId());

            // First-ever report → welcome bonus (idempotent: only if none exists).
            boolean firstReport = complaintRepository.countByReporterId(reporter.getId()) <= 1
                    && ledgerRepository.countByUserIdAndType(reporter.getId(),
                            RewardActivityType.FIRST_REPORT_BONUS) == 0;
            if (firstReport) {
                append(reporter, RewardActivityType.FIRST_REPORT_BONUS,
                        RewardActivityType.FIRST_REPORT_BONUS.getLabel(), complaint.getId());
            }
        } catch (Exception e) {
            log.warn("Failed to award submission points for complaint {}: {}",
                    complaint.getId(), e.getMessage());
        }
    }

    /**
     * Award points when a complaint moves to a milestone status:
     *   ASSIGNED  → REPORT_VERIFIED (an authority accepted it)
     *   RESOLVED  → REPORT_RESOLVED (the issue was fixed)
     * Idempotent per complaint, so toggling status back and forth never
     * double-awards. Fail-soft.
     */
    @Transactional
    public void awardForStatusChange(Complaint complaint, ComplaintStatus newStatus) {
        try {
            RewardActivityType type = switch (newStatus) {
                case ASSIGNED -> RewardActivityType.REPORT_VERIFIED;
                case RESOLVED -> RewardActivityType.REPORT_RESOLVED;
                default -> null;
            };
            if (type == null) return;

            User reporter = complaint.getReporter();
            if (reporter == null) return;

            boolean already = ledgerRepository.existsByUserIdAndComplaintIdAndType(
                    reporter.getId(), complaint.getId(), type);
            if (already) return;

            String ref = complaint.getReferenceCode() == null
                    ? "your report" : complaint.getReferenceCode();
            String desc = type == RewardActivityType.REPORT_VERIFIED
                    ? "Report " + ref + " verified by authority"
                    : "Report " + ref + " resolved";
            append(reporter, type, desc, complaint.getId());
        } catch (Exception e) {
            log.warn("Failed to award status-change points for complaint {}: {}",
                    complaint.getId(), e.getMessage());
        }
    }

    /** Append a ledger row using the activity type's default point value. */
    private RewardLedger append(User user, RewardActivityType type, String description, Long complaintId) {
        return append(user, type, type.getDefaultPoints(), description, complaintId);
    }

    /** Append a ledger row with an explicit (possibly negative) point value. */
    private RewardLedger append(User user, RewardActivityType type, int points,
                                String description, Long complaintId) {
        RewardLedger entry = RewardLedger.builder()
                .user(user)
                .type(type)
                .points(points)
                .description(description)
                .complaintId(complaintId)
                .build();
        return ledgerRepository.save(entry);
    }

    // ----------------------------------------------------------------
    // Profile computation (citizen-facing)
    // ----------------------------------------------------------------

    /** The signed-in citizen's fully-computed profile. GET /api/rewards/me */
    @Transactional(readOnly = true)
    public RewardProfileResponse getProfileForEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return buildProfile(user);
    }

    /** Assemble the full profile for a user from their ledger + complaint stats. */
    RewardProfileResponse buildProfile(User user) {
        List<RewardLedger> ledger = ledgerRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        int totalPoints = ledger.stream().mapToInt(RewardLedger::getPoints).sum();

        RewardLevelDto level = RewardRules.levelForPoints(totalPoints);
        int pointsIntoLevel = totalPoints - level.getMinPoints();
        Integer levelSpan = level.getNextLevelPoints() == null
                ? null : level.getNextLevelPoints() - level.getMinPoints();
        Integer pointsToNextLevel = level.getNextLevelPoints() == null
                ? null : level.getNextLevelPoints() - totalPoints;
        int progressPercent = levelSpan == null || levelSpan == 0
                ? 100 : Math.min(100, (int) Math.round((pointsIntoLevel / (double) levelSpan) * 100));

        RewardStats stats = computeStats(user);
        Map<String, LocalDateTime> earnedDates = earnedDates(user);
        List<BadgeDto> badges = RewardRules.evaluateBadges(stats, totalPoints, level.getLevel(), earnedDates);
        badges.sort((a, b) -> Boolean.compare(b.isEarned(), a.isEarned()));
        int badgesEarned = (int) badges.stream().filter(BadgeDto::isEarned).count();

        List<RewardHistoryEntryDto> history = ledger.stream()
                .map(l -> RewardHistoryEntryDto.builder()
                        .id(l.getId())
                        .type(l.getType())
                        .description(l.getDescription())
                        .points(l.getPoints())
                        .date(l.getCreatedAt())
                        .complaintId(l.getComplaintId())
                        .build())
                .toList();

        return RewardProfileResponse.builder()
                .totalPoints(totalPoints)
                .level(level)
                .pointsIntoLevel(pointsIntoLevel)
                .pointsToNextLevel(pointsToNextLevel)
                .levelSpan(levelSpan)
                .progressPercent(progressPercent)
                .stats(RewardStatsDto.builder()
                        .reportsSubmitted(stats.reportsSubmitted())
                        .reportsResolved(stats.reportsResolved())
                        .currentStreakDays(stats.currentStreakDays())
                        .badgesEarned(badgesEarned)
                        .build())
                .badges(badges)
                .history(history)
                .build();
    }

    /** Derive the badge-measure stats from the citizen's actual complaints. */
    RewardStats computeStats(User user) {
        Long uid = user.getId();
        int submitted = (int) complaintRepository.countByReporterId(uid);
        int resolved = (int) complaintRepository.countByReporterIdAndStatus(uid, ComplaintStatus.RESOLVED);
        int potholes = (int) complaintRepository.countByReporterIdAndCategory(uid, IssueCategory.POTHOLE);
        int garbage = (int) complaintRepository.countByReporterIdAndCategory(uid, IssueCategory.GARBAGE);
        int streetlights = (int) complaintRepository.countByReporterIdAndCategory(uid, IssueCategory.BROKEN_STREETLIGHT);

        Double maxConf = aiAnalysisRepository.findMaxConfidenceByReporterId(uid);
        double maxConfidence = maxConf == null ? 0.0 : maxConf;

        int streak = currentStreakDays(uid);

        return new RewardStats(submitted, resolved, potholes, garbage, streetlights, streak, maxConfidence);
    }

    /**
     * Longest run of consecutive calendar days (ending at the most recent
     * report) on which the citizen filed at least one report. A simple,
     * defensible "current streak".
     */
    private int currentStreakDays(Long userId) {
        List<Complaint> complaints = complaintRepository.findByReporterIdOrderByCreatedAtDesc(userId);
        if (complaints.isEmpty()) return 0;

        // Distinct report days, newest first.
        TreeSet<LocalDate> days = new TreeSet<>(Comparator.reverseOrder());
        for (Complaint c : complaints) {
            if (c.getCreatedAt() != null) days.add(c.getCreatedAt().toLocalDate());
        }
        if (days.isEmpty()) return 0;

        Iterator<LocalDate> it = days.iterator();
        LocalDate prev = it.next();
        int streak = 1;
        while (it.hasNext()) {
            LocalDate day = it.next();
            if (day.plusDays(1).equals(prev)) {
                streak++;
                prev = day;
            } else {
                break;
            }
        }
        return streak;
    }

    /**
     * Best-effort "earned on" dates for count-based badges: the createdAt of the
     * complaint that pushed the citizen over each badge's target. Streak-,
     * confidence- and level-based badges return no date (null in the DTO).
     */
    private Map<String, LocalDateTime> earnedDates(User user) {
        List<Complaint> asc = new ArrayList<>(
                complaintRepository.findByReporterIdOrderByCreatedAtDesc(user.getId()));
        Collections.reverse(asc); // oldest first

        Map<String, LocalDateTime> dates = new HashMap<>();
        putNthMatch(dates, "first-steps", asc, 1, c -> true);
        putNthMatch(dates, "reporter", asc, 5, c -> true);
        putNthMatch(dates, "prolific-reporter", asc, 25, c -> true);
        putNthMatch(dates, "pothole-patrol", asc, 5, c -> c.getCategory() == IssueCategory.POTHOLE);
        putNthMatch(dates, "clean-streets", asc, 5, c -> c.getCategory() == IssueCategory.GARBAGE);
        putNthMatch(dates, "night-watch", asc, 3, c -> c.getCategory() == IssueCategory.BROKEN_STREETLIGHT);
        putNthMatch(dates, "problem-solver", asc, 10, c -> c.getStatus() == ComplaintStatus.RESOLVED);
        return dates;
    }

    private void putNthMatch(Map<String, LocalDateTime> out, String badgeId, List<Complaint> ascending,
                             int n, java.util.function.Predicate<Complaint> match) {
        int seen = 0;
        for (Complaint c : ascending) {
            if (match.test(c)) {
                seen++;
                if (seen == n) {
                    out.put(badgeId, c.getCreatedAt());
                    return;
                }
            }
        }
    }

    /**
     * Points a citizen will earn for a report submitted right now (success
     * modal). Pure and deterministic so it matches what awardForSubmission will
     * actually record. POST /api/rewards/preview
     */
    @Transactional(readOnly = true)
    public RewardGrantResponse previewReportReward(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        boolean firstReport = complaintRepository.countByReporterId(user.getId()) == 0
                && ledgerRepository.countByUserIdAndType(user.getId(),
                        RewardActivityType.FIRST_REPORT_BONUS) == 0;

        List<RewardGrantResponse.Line> breakdown = new ArrayList<>();
        breakdown.add(RewardGrantResponse.Line.builder()
                .label("Issue reported")
                .points(RewardActivityType.REPORT_SUBMITTED.getDefaultPoints())
                .build());
        if (firstReport) {
            breakdown.add(RewardGrantResponse.Line.builder()
                    .label("First report bonus")
                    .points(RewardActivityType.FIRST_REPORT_BONUS.getDefaultPoints())
                    .build());
        }
        int total = breakdown.stream().mapToInt(RewardGrantResponse.Line::getPoints).sum();
        return RewardGrantResponse.builder().totalAwarded(total).breakdown(breakdown).build();
    }

    // ----------------------------------------------------------------
    // Admin: leaderboard, analytics, per-citizen detail, manual adjust
    // ----------------------------------------------------------------

    /** Ranked leaderboard of every citizen. GET /api/admin/rewards/leaderboard */
    @Transactional(readOnly = true)
    public List<LeaderboardEntryResponse> leaderboard() {
        List<User> citizens = userRepository.findByRole(Role.CITIZEN);
        List<LeaderboardEntryResponse> rows = new ArrayList<>(citizens.size());
        for (User u : citizens) {
            RewardProfileResponse p = buildProfile(u);
            LocalDateTime lastActivity = p.getHistory().isEmpty()
                    ? null : p.getHistory().get(0).getDate(); // history is newest-first
            rows.add(LeaderboardEntryResponse.builder()
                    .user(refOf(u))
                    .totalPoints(p.getTotalPoints())
                    .level(p.getLevel())
                    .badgesEarned(p.getStats().getBadgesEarned())
                    .reportsSubmitted(p.getStats().getReportsSubmitted())
                    .reportsResolved(p.getStats().getReportsResolved())
                    .currentStreakDays(p.getStats().getCurrentStreakDays())
                    .lastActivity(lastActivity)
                    .build());
        }
        rows.sort(Comparator.comparingInt(LeaderboardEntryResponse::getTotalPoints).reversed());
        for (int i = 0; i < rows.size(); i++) {
            rows.get(i).setRank(i + 1);
        }
        return rows;
    }

    /** Program-wide analytics. GET /api/admin/rewards/analytics */
    @Transactional(readOnly = true)
    public RewardsAnalyticsResponse analytics() {
        List<User> citizens = userRepository.findByRole(Role.CITIZEN);
        List<RewardProfileResponse> profiles = citizens.stream().map(this::buildProfile).toList();
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);

        int totalPointsIssued = profiles.stream().mapToInt(RewardProfileResponse::getTotalPoints).sum();
        int totalBadgesAwarded = profiles.stream().mapToInt(p -> p.getStats().getBadgesEarned()).sum();
        int activeThisWeek = (int) profiles.stream().filter(p ->
                !p.getHistory().isEmpty()
                        && p.getHistory().get(0).getDate() != null
                        && p.getHistory().get(0).getDate().isAfter(weekAgo)).count();
        double averageLevel = profiles.isEmpty() ? 0
                : profiles.stream().mapToInt(p -> p.getLevel().getLevel()).average().orElse(0);

        List<RewardsAnalyticsResponse.BadgeCount> badgeDistribution = new ArrayList<>();
        for (RewardRules.BadgeDef def : RewardRules.BADGES) {
            int count = (int) profiles.stream()
                    .filter(p -> p.getBadges().stream()
                            .anyMatch(b -> b.getId().equals(def.id()) && b.isEarned()))
                    .count();
            badgeDistribution.add(RewardsAnalyticsResponse.BadgeCount.builder()
                    .id(def.id()).name(def.name()).icon(def.icon()).earnedCount(count).build());
        }

        List<RewardsAnalyticsResponse.LevelCount> levelDistribution = new ArrayList<>();
        for (RewardRules.LevelDef l : RewardRules.LEVELS) {
            int count = (int) profiles.stream().filter(p -> p.getLevel().getLevel() == l.level()).count();
            levelDistribution.add(RewardsAnalyticsResponse.LevelCount.builder()
                    .level(l.level()).name(l.name()).count(count).build());
        }

        return RewardsAnalyticsResponse.builder()
                .totalCitizens(profiles.size())
                .totalPointsIssued(totalPointsIssued)
                .totalBadgesAwarded(totalBadgesAwarded)
                .activeThisWeek(activeThisWeek)
                .averageLevel(averageLevel)
                .badgeDistribution(badgeDistribution)
                .levelDistribution(levelDistribution)
                .build();
    }

    /** One citizen's full profile. GET /api/admin/rewards/{userId} */
    @Transactional(readOnly = true)
    public AdminCitizenRewardResponse getCitizenReward(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Citizen not found"));
        return AdminCitizenRewardResponse.builder()
                .user(refOf(user))
                .profile(buildProfile(user))
                .build();
    }

    /**
     * Manually grant (positive) or deduct (negative) points, with a required
     * reason recorded to the ledger. POST /api/admin/rewards/{userId}/adjust
     */
    @Transactional
    public AdminCitizenRewardResponse adjustPoints(Long userId, int points, String reason) {
        if (points == 0) {
            throw new IllegalArgumentException("Enter a non-zero number of points");
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("A reason is required for the audit trail");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Citizen not found"));
        append(user, RewardActivityType.ADMIN_ADJUSTMENT, points, reason.trim(), null);
        return AdminCitizenRewardResponse.builder()
                .user(refOf(user))
                .profile(buildProfile(user))
                .build();
    }

    private CitizenRefDto refOf(User u) {
        return CitizenRefDto.builder().userId(u.getId()).name(u.getName()).email(u.getEmail()).build();
    }
}
