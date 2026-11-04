package com.civic.backend.complaint;

import com.civic.backend.complaint.dto.AiPreviewResponse;
import com.civic.backend.complaint.dto.ComplaintResponse;
import com.civic.backend.complaint.dto.CreateComplaintRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Citizen-facing complaint endpoints. All require authentication (any role);
 * citizens can only see their own complaints.
 */
@RestController
@RequestMapping("/api/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintService complaintService;
    private final ObjectMapper objectMapper;

    /**
     * Report a new issue. Sent as multipart/form-data with:
     *   - "image": the photo file
     *   - "data" : a JSON blob matching CreateComplaintRequest
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ComplaintResponse> create(
            @RequestPart("image") MultipartFile image,
            @RequestPart("data") String dataJson,
            Authentication authentication) throws Exception {

        CreateComplaintRequest req = objectMapper.readValue(dataJson, CreateComplaintRequest.class);
        // Manual validation since @Valid doesn't apply to a parsed string part.
        if (req.getLatitude() == null || req.getLongitude() == null) {
            throw new IllegalArgumentException("Latitude and longitude are required");
        }

        ComplaintResponse response = complaintService.createComplaint(
                authentication.getName(), req, image);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * On-demand AI detection for the report form. Send just an image as
     * multipart/form-data ("image"); returns the detected category/severity/
     * priority WITHOUT creating a complaint, so the form can pre-fill itself.
     */
    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AiPreviewResponse> analyze(@RequestPart("image") MultipartFile image) {
        return ResponseEntity.ok(complaintService.analyzePreview(image));
    }

    /**
     * List the authenticated citizen's own complaints.
     */
    @GetMapping("/mine")
    public ResponseEntity<List<ComplaintResponse>> myComplaints(Authentication authentication) {
        return ResponseEntity.ok(complaintService.getMyComplaints(authentication.getName()));
    }

    /**
     * View a single complaint. Citizens may only view their own; admins any.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ComplaintResponse> getOne(@PathVariable Long id, Authentication authentication) {
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return ResponseEntity.ok(
                complaintService.getComplaintForUser(id, authentication.getName(), isAdmin));
    }

}
