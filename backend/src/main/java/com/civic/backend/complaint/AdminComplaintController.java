package com.civic.backend.complaint;

import com.civic.backend.complaint.dto.AnalyticsResponse;
import com.civic.backend.complaint.dto.ComplaintResponse;
import com.civic.backend.complaint.dto.UpdateStatusRequest;
import com.civic.backend.complaint.enums.ComplaintStatus;
import com.civic.backend.complaint.enums.IssueCategory;
import com.civic.backend.complaint.enums.Severity;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin-only complaint management. Access is restricted to ADMIN by the
 * /api/admin/** rule in SecurityConfig.
 */
@RestController
@RequestMapping("/api/admin/complaints")
@RequiredArgsConstructor
public class AdminComplaintController {

    private final ComplaintService complaintService;

    /**
     * Paginated, filterable list of all complaints.
     * Example: /api/admin/complaints?status=SUBMITTED&category=POTHOLE&page=0&size=20
     */
    @GetMapping
    public ResponseEntity<Page<ComplaintResponse>> list(
            @RequestParam(required = false) IssueCategory category,
            @RequestParam(required = false) Severity severity,
            @RequestParam(required = false) ComplaintStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                complaintService.getAllForAdmin(category, severity, status, search, sort, direction, page, size));
    }

    /**
     * Update a complaint's status (assign, progress, resolve, reject).
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ComplaintResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStatusRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(
                complaintService.updateStatus(id, request, authentication.getName()));
    }

    /**
     * Re-run AI detection on an existing complaint's stored image and update
     * its category/severity/priority accordingly. Returns the updated complaint.
     */
    @PostMapping("/{id}/reanalyze")
    public ResponseEntity<ComplaintResponse> reanalyze(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(complaintService.reanalyze(id, authentication.getName()));
    }

    /**
     * All complaints that have coordinates, for plotting on the issue map.
     */
    @GetMapping("/map")
    public ResponseEntity<List<ComplaintResponse>> mapData() {
        return ResponseEntity.ok(complaintService.getAllForMap());
    }

    /**
     * Aggregated counts for the analytics dashboard.
     */
    @GetMapping("/analytics")
    public ResponseEntity<AnalyticsResponse> analytics() {
        return ResponseEntity.ok(complaintService.getAnalytics());
    }
}
