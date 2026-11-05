package com.civic.backend.config;

import com.civic.backend.complaint.AIAnalysis;
import com.civic.backend.complaint.AIAnalysisRepository;
import com.civic.backend.complaint.Complaint;
import com.civic.backend.complaint.ComplaintHistory;
import com.civic.backend.complaint.ComplaintHistoryRepository;
import com.civic.backend.complaint.ComplaintRepository;
import com.civic.backend.complaint.enums.ComplaintStatus;
import com.civic.backend.complaint.enums.IssueCategory;
import com.civic.backend.complaint.enums.Priority;
import com.civic.backend.complaint.enums.Severity;
import com.civic.backend.reward.RewardService;
import com.civic.backend.user.Role;
import com.civic.backend.user.User;
import com.civic.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds a batch of realistic sample complaints on first startup so the admin
 * dashboard, queue, map and charts have data to show. Runs only when
 * app.seed-demo=true (default) AND there are no complaints yet, so it never
 * duplicates data or touches a database you've already populated.
 *
 * Turn it off with app.seed-demo=false in application.properties.
 */
@Component
@Order(2) // after DataSeeder (admin) which is @Order default
@RequiredArgsConstructor
@Slf4j
public class DemoDataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ComplaintRepository complaintRepository;
    private final ComplaintHistoryRepository historyRepository;
    private final AIAnalysisRepository aiAnalysisRepository;
    private final PasswordEncoder passwordEncoder;
    private final RewardService rewardService;

    @Value("${app.seed-demo:true}")
    private boolean seedDemo;

    // A small, self-contained description of each sample complaint.
    private record Sample(
            IssueCategory category, String description, String address,
            double lat, double lng, Severity severity, Priority priority,
            ComplaintStatus status, double confidence) {}

    @Override
    public void run(String... args) {
        if (!seedDemo) return;
        if (complaintRepository.count() > 0) {
            return; // already have data
        }

        // Two demo citizens.
        User asha = getOrCreateCitizen("Asha Rao", "asha@example.com");
        User dev = getOrCreateCitizen("Dev Kumar", "dev@example.com");
        User[] reporters = { asha, dev };

        // Samples spread across a city (Bengaluru-ish coordinates) and lifecycle.
        List<Sample> samples = List.of(
                new Sample(IssueCategory.POTHOLE, "Deep pothole in the middle of the lane, cars swerving around it.",
                        "100 Feet Road, Indiranagar", 12.9719, 77.6412, Severity.HIGH, Priority.URGENT, ComplaintStatus.SUBMITTED, 0.94),
                new Sample(IssueCategory.GARBAGE, "Garbage pile not collected for a week, spilling onto the footpath.",
                        "5th Block, Koramangala", 12.9352, 77.6245, Severity.MEDIUM, Priority.HIGH, ComplaintStatus.ASSIGNED, 0.88),
                new Sample(IssueCategory.BROKEN_STREETLIGHT, "Streetlight out for two weeks, very dark at night.",
                        "MG Road near Metro", 12.9756, 77.6068, Severity.MEDIUM, Priority.HIGH, ComplaintStatus.IN_PROGRESS, 0.79),
                new Sample(IssueCategory.WATER_LEAKAGE, "Water pipe leaking continuously, flooding the road edge.",
                        "Jayanagar 4th Block", 12.9250, 77.5938, Severity.HIGH, Priority.URGENT, ComplaintStatus.ASSIGNED, 0.91),
                new Sample(IssueCategory.DAMAGED_ROAD, "Road surface cracked and uneven over a long stretch.",
                        "Outer Ring Road, Marathahalli", 12.9569, 77.7011, Severity.CRITICAL, Priority.URGENT, ComplaintStatus.IN_PROGRESS, 0.96),
                new Sample(IssueCategory.POTHOLE, "Small pothole forming near the junction.",
                        "Domlur Junction", 12.9609, 77.6387, Severity.LOW, Priority.MEDIUM, ComplaintStatus.RESOLVED, 0.72),
                new Sample(IssueCategory.DAMAGED_INFRASTRUCTURE, "Broken footpath railing, sharp edges exposed.",
                        "Cubbon Park entrance", 12.9763, 77.5929, Severity.MEDIUM, Priority.MEDIUM, ComplaintStatus.SUBMITTED, 0.83),
                new Sample(IssueCategory.GARBAGE, "Overflowing public bin attracting stray animals.",
                        "HSR Layout Sector 2", 12.9116, 77.6412, Severity.LOW, Priority.LOW, ComplaintStatus.RESOLVED, 0.75),
                new Sample(IssueCategory.BROKEN_STREETLIGHT, "Flickering streetlight, likely wiring fault.",
                        "Whitefield Main Road", 12.9698, 77.7500, Severity.LOW, Priority.MEDIUM, ComplaintStatus.SUBMITTED, 0.68),
                new Sample(IssueCategory.WATER_LEAKAGE, "Sewage overflow onto the street after rain.",
                        "BTM Layout 2nd Stage", 12.9166, 77.6101, Severity.CRITICAL, Priority.URGENT, ComplaintStatus.ASSIGNED, 0.93),
                new Sample(IssueCategory.POTHOLE, "Cluster of potholes making the road hard to drive.",
                        "Bannerghatta Road", 12.8998, 77.5980, Severity.HIGH, Priority.HIGH, ComplaintStatus.IN_PROGRESS, 0.90),
                new Sample(IssueCategory.DAMAGED_ROAD, "Speed breaker eroded, exposing rebar.",
                        "Electronic City Phase 1", 12.8452, 77.6602, Severity.MEDIUM, Priority.HIGH, ComplaintStatus.RESOLVED, 0.81)
        );

        int i = 0;
        for (Sample s : samples) {
            User reporter = reporters[i % reporters.length];
            createComplaint(reporter, s, i);
            i++;
        }

        log.info("Seeded {} demo complaints (set app.seed-demo=false to disable).", samples.size());
    }

    private void createComplaint(User reporter, Sample s, int index) {
        Complaint c = Complaint.builder()
                .reporter(reporter)
                .category(s.category())
                .description(s.description())
                // Deterministic placeholder image so the UI shows something.
                .imageUrl("https://picsum.photos/seed/civic" + index + "/600/400")
                .latitude(s.lat())
                .longitude(s.lng())
                .locationAddress(s.address())
                .severity(s.severity())
                .priority(s.priority())
                .status(s.status())
                .assignedTo(s.status() == ComplaintStatus.SUBMITTED ? null : "Municipal Ops — Ward Team")
                .build();
        c = complaintRepository.save(c);
        c.setReferenceCode("CIV-" + (10000 + c.getId()));
        c = complaintRepository.save(c);

        // AI analysis record.
        AIAnalysis ai = AIAnalysis.builder()
                .complaint(c)
                .detectedClass(s.category().name())
                .confidence(s.confidence())
                .severity(s.severity())
                .boundingBox("{\"x\":120,\"y\":90,\"width\":260,\"height\":180}")
                .modelVersion("mock-v1")
                .build();
        aiAnalysisRepository.save(ai);

        // Build a plausible history trail up to the current status.
        addHistory(c, ComplaintStatus.SUBMITTED, reporter.getEmail(), "Complaint submitted by citizen");
        addHistory(c, ComplaintStatus.SUBMITTED, "SYSTEM",
                "AI analysis complete: " + s.category().getDisplayName()
                        + " (" + Math.round(s.confidence() * 100) + "% confidence), severity " + s.severity());

        switch (s.status()) {
            case ASSIGNED -> addHistory(c, ComplaintStatus.ASSIGNED, "admin@civic.com", "Assigned to Municipal Ops — Ward Team");
            case IN_PROGRESS -> {
                addHistory(c, ComplaintStatus.ASSIGNED, "admin@civic.com", "Assigned to Municipal Ops — Ward Team");
                addHistory(c, ComplaintStatus.IN_PROGRESS, "admin@civic.com", "Crew dispatched to site");
            }
            case RESOLVED -> {
                addHistory(c, ComplaintStatus.ASSIGNED, "admin@civic.com", "Assigned to Municipal Ops — Ward Team");
                addHistory(c, ComplaintStatus.IN_PROGRESS, "admin@civic.com", "Crew dispatched to site");
                addHistory(c, ComplaintStatus.RESOLVED, "admin@civic.com", "Issue fixed and verified on site");
            }
            default -> { /* SUBMITTED: nothing more */ }
        }

        // Award civic points so the rewards leaderboard/analytics have data on a
        // fresh start, mirroring what the live lifecycle would have granted.
        rewardService.awardForSubmission(reporter, c);
        switch (s.status()) {
            case ASSIGNED, IN_PROGRESS -> rewardService.awardForStatusChange(c, ComplaintStatus.ASSIGNED);
            case RESOLVED -> {
                rewardService.awardForStatusChange(c, ComplaintStatus.ASSIGNED);
                rewardService.awardForStatusChange(c, ComplaintStatus.RESOLVED);
            }
            default -> { /* SUBMITTED: submission points only */ }
        }
    }

    private void addHistory(Complaint c, ComplaintStatus status, String by, String remarks) {
        historyRepository.save(ComplaintHistory.builder()
                .complaint(c)
                .status(status)
                .updatedBy(by)
                .remarks(remarks)
                .build());
    }

    private User getOrCreateCitizen(String name, String email) {
        return userRepository.findByEmail(email).orElseGet(() ->
                userRepository.save(User.builder()
                        .name(name)
                        .email(email)
                        .passwordHash(passwordEncoder.encode("password123"))
                        .role(Role.CITIZEN)
                        .build()));
    }
}
