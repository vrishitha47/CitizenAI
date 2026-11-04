package com.civic.backend.complaint.dto;

import com.civic.backend.complaint.enums.Severity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIAnalysisResponse {
    private String detectedClass;
    private Double confidence;
    private Severity severity;
    private String boundingBox;
    private String modelVersion;
}
