package com.civic.backend.complaint;

import com.civic.backend.ai.AiAnalysisResult;
import com.civic.backend.ai.AiClient;
import com.civic.backend.complaint.dto.*;
import com.civic.backend.notification.NotificationService;
import com.civic.backend.reward.RewardService;
import com.civic.backend.complaint.enums.ComplaintStatus;
import com.civic.backend.complaint.enums.IssueCategory;
import com.civic.backend.complaint.enums.Priority;
import com.civic.backend.complaint.enums.Severity;
import com.civic.backend.storage.FileStorageService;
import com.civic.backend.user.User;
import com.civic.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Business logic for the complaint lifecycle: creation, retrieval, and
 * admin-driven status updates (each of which is recorded in history).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final ComplaintHistoryRepository historyRepository;
    private final AIAnalysisRepository aiAnalysisRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final AiClient aiClient;
    private final NotificationService notificationService;
    private final RewardService rewardService;

    // ----------------------------------------------------------------
    // Creation
    // ----------------------------------------------------------------

    @Transactional
    public ComplaintResponse createComplaint(String reporterEmail, CreateComplaintRequest req, MultipartFile image) {
        User reporter = userRepository.findByEmail(reporterEmail)
                .orElseThrow(() -> new IllegalArgumentException("Reporter not found"));

        // Read the bytes once, up front, so we can both store the file AND send
        // it to the AI service (a MultipartFile's stream can only be read once).
        byte[] imageBytes;
        try {
            imageBytes = image.getBytes();
        } catch (Exception e) {
            throw new IllegalArgumentException("Could not read the uploaded image");
        }

        String imageUrl = fileStorageService.store(image);

        Complaint complaint = Complaint.builder()
                .reporter(reporter)
                .category(req.getCategory() == null ? IssueCategory.OTHER : req.getCategory())
                .description(req.getDescription())
                .imageUrl(imageUrl)
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .locationAddress(req.getLocationAddress())
                .status(ComplaintStatus.SUBMITTED)
                .build();

        complaint = complaintRepository.save(complaint);

        // Assign a human-friendly reference code once we have the ID.
        complaint.setReferenceCode(generateReferenceCode(complaint.getId()));
        complaint = complaintRepository.save(complaint);

        recordHistory(complaint, ComplaintStatus.SUBMITTED, reporterEmail, "Complaint submitted by citizen");

        // Run AI analysis (fail-soft: complaint still exists if the AI service is down).
        runAiAnalysis(complaint, imageBytes, image.getOriginalFilename(),
                req.getCategory() == null ? null : req.getCategory().name());

        // Award civic points for filing this report (fail-soft; never blocks submission).
        rewardService.awardForSubmission(reporter, complaint);

        return toResponse(complaint);
    }

    /**
     * Calls the AI service, persists the analysis, and updates the complaint's
     * category/severity/priority/status accordingly. Any failure is logged and
     * swallowed so complaint creation never fails because of the AI step.
     */
    private void runAiAnalysis(Complaint complaint, byte[] imageBytes, String filename, String categoryHint) {
        complaint.setStatus(ComplaintStatus.AI_ANALYSIS);
        complaintRepository.save(complaint);
        recordHistory(complaint, ComplaintStatus.AI_ANALYSIS, "SYSTEM", "Image sent for AI analysis");

        Optional<AiAnalysisResult> maybeResult = aiClient.analyze(imageBytes, filename, categoryHint);

        if (maybeResult.isEmpty() || !maybeResult.get().isDetected()) {
            // No detection: leave the complaint SUBMITTED-ish; mark back to SUBMITTED
            // so an admin can triage it manually.
            complaint.setStatus(ComplaintStatus.SUBMITTED);
            complaintRepository.save(complaint);
            recordHistory(complaint, ComplaintStatus.SUBMITTED, "SYSTEM",
                    "AI could not detect an issue automatically; awaiting manual review");
            return;
        }

        AiAnalysisResult result = maybeResult.get();

        // Persist the raw AI analysis record.
        persistAnalysis(complaint, result);

        // Enrich the complaint with the AI's findings.
        IssueCategory detectedCategory = parseCategory(result.getCategory());
        if (detectedCategory != null) {
            complaint.setCategory(detectedCategory);
        }
        complaint.setSeverity(parseSeverity(result.getSeverity()));
        complaint.setPriority(parsePriority(result.getPriority()));
        complaint.setStatus(ComplaintStatus.SUBMITTED); // analysed, ready for admin triage
        complaintRepository.save(complaint);

        recordHistory(complaint, ComplaintStatus.SUBMITTED, "SYSTEM",
                String.format("AI analysis complete: %s (%.0f%% confidence), severity %s",
                        result.getCategoryLabel(),
                        result.getConfidence() == null ? 0 : result.getConfidence() * 100,
                        result.getSeverity()));
    }

    /**
     * Create or update the single AIAnalysis row for this complaint (upsert),
     * so re-running detection replaces the previous result rather than failing
     * the one-per-complaint unique constraint.
     */
    private void persistAnalysis(Complaint complaint, AiAnalysisResult result) {
        AIAnalysis analysis = aiAnalysisRepository.findByComplaintId(complaint.getId())
                .orElseGet(() -> AIAnalysis.builder().complaint(complaint).build());
        analysis.setDetectedClass(result.getCategory());
        analysis.setConfidence(result.getConfidence());
        analysis.setSeverity(parseSeverity(result.getSeverity()));
        analysis.setBoundingBox(boundingBoxToJson(result.getBoundingBox()));
        analysis.setModelVersion(result.getModelVersion());
        aiAnalysisRepository.save(analysis);
    }

    /**
     * On-demand analysis of an uploaded image that is NOT persisted. Powers the
     * "Detect issue" button on the report form so the citizen can pre-fill the
     * category/severity/priority before actually submitting the complaint.
     */
    public AiPreviewResponse analyzePreview(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new IllegalArgumentException("Please choose an image first");
        }
        byte[] bytes;
        try {
            bytes = image.getBytes();
        } catch (Exception e) {
            throw new IllegalArgumentException("Could not read the uploaded image");
        }

        Optional<AiAnalysisResult> maybe = aiClient.analyze(bytes, image.getOriginalFilename(), null);
        if (maybe.isEmpty() || !maybe.get().isDetected()) {
            return AiPreviewResponse.builder()
                    .detected(false)
                    .message(maybe.map(AiAnalysisResult::getMessage)
                            .orElse("The AI service is unavailable right now — you can still submit and an officer will review it."))
                    .build();
        }

        AiAnalysisResult r = maybe.get();
        IssueCategory cat = parseCategory(r.getCategory());
        return AiPreviewResponse.builder()
                .detected(true)
                .category(cat)
                .categoryLabel(cat != null ? cat.getDisplayName() : r.getCategoryLabel())
                .confidence(r.getConfidence())
                .severity(parseSeverity(r.getSeverity()))
                .priority(parsePriority(r.getPriority()))
                .modelVersion(r.getModelVersion())
                .message(r.getMessage())
                .build();
    }

    /**
     * Re-run AI detection on an already-registered complaint's stored image and
     * update its category/severity/priority. Used by the admin "Re-run AI
     * detection" button. Fails soft if the image or AI service is unavailable.
     */
    @Transactional
    public ComplaintResponse reanalyze(Long complaintId, String actorEmail) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("Complaint not found"));

        byte[] bytes = fileStorageService.loadBytes(complaint.getImageUrl());
        if (bytes == null) {
            throw new IllegalArgumentException(
                    "The original image isn't available on the server, so it can't be re-analysed.");
        }

        Optional<AiAnalysisResult> maybe = aiClient.analyze(bytes, "reanalyze.jpg", null);
        if (maybe.isEmpty() || !maybe.get().isDetected()) {
            recordHistory(complaint, complaint.getStatus(), actorEmail,
                    "Re-ran AI detection — no issue detected or AI service unavailable.");
            return toResponse(complaint);
        }

        AiAnalysisResult result = maybe.get();
        persistAnalysis(complaint, result);

        IssueCategory detectedCategory = parseCategory(result.getCategory());
        if (detectedCategory != null) {
            complaint.setCategory(detectedCategory);
        }
        complaint.setSeverity(parseSeverity(result.getSeverity()));
        complaint.setPriority(parsePriority(result.getPriority()));
        complaint = complaintRepository.save(complaint);

        recordHistory(complaint, complaint.getStatus(), actorEmail,
                String.format("AI re-detection: %s (%.0f%% confidence), severity %s",
                        result.getCategoryLabel(),
                        result.getConfidence() == null ? 0 : result.getConfidence() * 100,
                        result.getSeverity()));

        return toResponse(complaint);
    }

    private IssueCategory parseCategory(String value) {
        if (value == null) return null;
        try {
            return IssueCategory.valueOf(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private Severity parseSeverity(String value) {
        if (value == null) return null;
        try {
            return Severity.valueOf(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private Priority parsePriority(String value) {
        if (value == null) return null;
        try {
            return Priority.valueOf(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private String boundingBoxToJson(AiAnalysisResult.BoundingBox box) {
        if (box == null) return null;
        return String.format("{\"x\":%d,\"y\":%d,\"width\":%d,\"height\":%d}",
                nz(box.getX()), nz(box.getY()), nz(box.getWidth()), nz(box.getHeight()));
    }

    private int nz(Integer v) {
        return v == null ? 0 : v;
    }

    // ----------------------------------------------------------------
    // Retrieval
    // ----------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<ComplaintResponse> getMyComplaints(String reporterEmail) {
        User reporter = userRepository.findByEmail(reporterEmail)
                .orElseThrow(() -> new IllegalArgumentException("Reporter not found"));
        return complaintRepository.findByReporterIdOrderByCreatedAtDesc(reporter.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ComplaintResponse getComplaintForUser(Long complaintId, String requesterEmail, boolean isAdmin) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("Complaint not found"));

        // Citizens may only view their own complaints; admins may view any.
        if (!isAdmin && !complaint.getReporter().getEmail().equals(requesterEmail)) {
            throw new IllegalArgumentException("You do not have access to this complaint");
        }
        return toResponse(complaint);
    }

    @Transactional(readOnly = true)
    public Page<ComplaintResponse> getAllForAdmin(IssueCategory category, Severity severity,
                                                  ComplaintStatus status, String search,
                                                  String sort, String direction,
                                                  int page, int size) {
        // Whitelist sortable fields to avoid invalid property references.
        String sortField = switch (sort == null ? "" : sort) {
            case "severity" -> "severity";
            case "priority" -> "priority";
            case "status" -> "status";
            case "category" -> "category";
            case "updatedAt" -> "updatedAt";
            default -> "createdAt";
        };
        Sort.Direction dir = "asc".equalsIgnoreCase(direction)
                ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortField));
        String s = (search == null || search.isBlank()) ? null : search.trim();
        return complaintRepository.findWithFilters(category, severity, status, s, pageable)
                .map(this::toResponse);
    }

    /**
     * Lightweight list of every complaint that has coordinates, for the admin map.
     */
    @Transactional(readOnly = true)
    public List<ComplaintResponse> getAllForMap() {
        return complaintRepository.findAll().stream()
                .filter(c -> c.getLatitude() != null && c.getLongitude() != null)
                .map(this::toResponse)
                .toList();
    }

    /**
     * Aggregated counts for the analytics dashboard.
     */
    @Transactional(readOnly = true)
    public AnalyticsResponse getAnalytics() {
        long total = complaintRepository.count();
        long resolved = complaintRepository.countByStatus(ComplaintStatus.RESOLVED);
        long rejected = complaintRepository.countByStatus(ComplaintStatus.REJECTED);
        long inProgress = complaintRepository.countByStatus(ComplaintStatus.IN_PROGRESS);
        long pending = total - resolved - rejected;

        List<AnalyticsResponse.Count> byStatus = new ArrayList<>();
        for (ComplaintStatus s : ComplaintStatus.values()) {
            byStatus.add(AnalyticsResponse.Count.builder()
                    .key(s.name())
                    .label(prettify(s.name()))
                    .value(complaintRepository.countByStatus(s))
                    .build());
        }

        List<AnalyticsResponse.Count> byCategory = new ArrayList<>();
        for (IssueCategory c : IssueCategory.values()) {
            byCategory.add(AnalyticsResponse.Count.builder()
                    .key(c.name())
                    .label(c.getDisplayName())
                    .value(complaintRepository.countByCategory(c))
                    .build());
        }

        List<AnalyticsResponse.Count> bySeverity = new ArrayList<>();
        for (Severity sev : Severity.values()) {
            bySeverity.add(AnalyticsResponse.Count.builder()
                    .key(sev.name())
                    .label(prettify(sev.name()))
                    .value(complaintRepository.countBySeverity(sev))
                    .build());
        }

        return AnalyticsResponse.builder()
                .total(total)
                .pending(pending)
                .resolved(resolved)
                .inProgress(inProgress)
                .byStatus(byStatus)
                .byCategory(byCategory)
                .bySeverity(bySeverity)
                .build();
    }

    private String prettify(String enumName) {
        String lower = enumName.replace('_', ' ').toLowerCase();
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    // ----------------------------------------------------------------
    // Status updates (admin)
    // ----------------------------------------------------------------

    @Transactional
    public ComplaintResponse updateStatus(Long complaintId, UpdateStatusRequest req, String adminEmail) {
        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new IllegalArgumentException("Complaint not found"));

        ComplaintStatus previousStatus = complaint.getStatus();

        complaint.setStatus(req.getStatus());
        if (req.getAssignedTo() != null && !req.getAssignedTo().isBlank()) {
            complaint.setAssignedTo(req.getAssignedTo());
        }
        complaint = complaintRepository.save(complaint);

        String remarks = req.getRemarks() == null || req.getRemarks().isBlank()
                ? "Status changed to " + req.getStatus()
                : req.getRemarks();
        recordHistory(complaint, req.getStatus(), adminEmail, remarks);

        // Notify the citizen who reported this complaint that its status changed.
        if (previousStatus != req.getStatus()) {
            String ref = complaint.getReferenceCode() == null
                    ? "your complaint" : complaint.getReferenceCode();
            notificationService.notifyUser(
                    complaint.getReporter().getId(),
                    "Update on " + ref,
                    "Status changed to " + prettify(req.getStatus().name())
                            + (req.getRemarks() != null && !req.getRemarks().isBlank()
                                ? " — " + req.getRemarks() : ""),
                    "/app/complaints/" + complaint.getId(),
                    complaint.getId());

            // Award milestone points to the reporter (fail-soft, idempotent per complaint).
            rewardService.awardForStatusChange(complaint, req.getStatus());
        }

        return toResponse(complaint);
    }

    // ----------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------

    private void recordHistory(Complaint complaint, ComplaintStatus status, String updatedBy, String remarks) {
        ComplaintHistory entry = ComplaintHistory.builder()
                .complaint(complaint)
                .status(status)
                .updatedBy(updatedBy)
                .remarks(remarks)
                .build();
        historyRepository.save(entry);
    }

    /**
     * Produces a unique code like "CIV-10042". Retries in the unlikely event
     * of a collision.
     */
    private String generateReferenceCode(Long id) {
        String code = "CIV-" + (10000 + id);
        // Extremely unlikely to collide since id is unique, but guard anyway.
        while (complaintRepository.existsByReferenceCode(code)) {
            code = "CIV-" + (10000 + id) + "-" + ThreadLocalRandom.current().nextInt(100, 999);
        }
        return code;
    }

    private ComplaintResponse toResponse(Complaint c) {
        AIAnalysisResponse aiResponse = aiAnalysisRepository.findByComplaintId(c.getId())
                .map(a -> AIAnalysisResponse.builder()
                        .detectedClass(a.getDetectedClass())
                        .confidence(a.getConfidence())
                        .severity(a.getSeverity())
                        .boundingBox(a.getBoundingBox())
                        .modelVersion(a.getModelVersion())
                        .build())
                .orElse(null);

        List<HistoryEntryResponse> history = historyRepository
                .findByComplaintIdOrderByTimestampAsc(c.getId())
                .stream()
                .map(h -> HistoryEntryResponse.builder()
                        .status(h.getStatus())
                        .updatedBy(h.getUpdatedBy())
                        .remarks(h.getRemarks())
                        .timestamp(h.getTimestamp())
                        .build())
                .toList();

        return ComplaintResponse.builder()
                .id(c.getId())
                .referenceCode(c.getReferenceCode())
                .reporterId(c.getReporter().getId())
                .reporterName(c.getReporter().getName())
                .category(c.getCategory())
                .categoryLabel(c.getCategory() == null ? null : c.getCategory().getDisplayName())
                .description(c.getDescription())
                .imageUrl(c.getImageUrl())
                .latitude(c.getLatitude())
                .longitude(c.getLongitude())
                .locationAddress(c.getLocationAddress())
                .severity(c.getSeverity())
                .priority(c.getPriority())
                .status(c.getStatus())
                .assignedTo(c.getAssignedTo())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .aiAnalysis(aiResponse)
                .history(history)
                .build();
    }
}
