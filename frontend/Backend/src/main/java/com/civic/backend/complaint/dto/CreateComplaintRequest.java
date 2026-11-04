package com.civic.backend.complaint.dto;

import com.civic.backend.complaint.enums.IssueCategory;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Fields a citizen submits when reporting an issue. The image is sent as a
 * separate multipart part; these are the JSON/form metadata fields.
 *
 * Category is optional here — if omitted, the AI service will infer it in
 * Part 3. For now, the citizen may pick one.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateComplaintRequest {

    private IssueCategory category;

    private String description;

    @NotNull(message = "Latitude is required")
    private Double latitude;

    @NotNull(message = "Longitude is required")
    private Double longitude;

    private String locationAddress;
}
