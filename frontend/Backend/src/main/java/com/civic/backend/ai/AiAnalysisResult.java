package com.civic.backend.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * Maps the JSON response returned by the Python AI service (/analyze).
 * Field names use snake_case on the wire, mapped here with @JsonProperty.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class AiAnalysisResult {

    private boolean detected;
    private String category;

    @JsonProperty("category_label")
    private String categoryLabel;

    private Double confidence;
    private String severity;
    private String priority;

    @JsonProperty("bounding_box")
    private BoundingBox boundingBox;

    @JsonProperty("model_version")
    private String modelVersion;

    private String message;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class BoundingBox {
        private Integer x;
        private Integer y;
        private Integer width;
        private Integer height;
    }
}
