package com.civic.backend.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.util.Optional;

/**
 * Calls the Python AI microservice to analyse a complaint image. Designed to
 * fail soft: if the service is down or errors, we return empty so the complaint
 * can still be created (it just won't have AI data yet).
 */
@Component
@Slf4j
public class AiClient {

    private final RestClient restClient;

    public AiClient(@Value("${app.ai.base-url:http://localhost:8000}") String baseUrl,
                    @Value("${app.ai.timeout-ms:8000}") int timeoutMs) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeoutMs);
        factory.setReadTimeout(timeoutMs);
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .build();
    }

    /**
     * Sends the image bytes to POST /analyze. Returns empty on any failure.
     *
     * @param imageBytes    raw image content
     * @param filename      original filename (helps the service infer type)
     * @param categoryHint  optional category the citizen picked, or null
     */
    public Optional<AiAnalysisResult> analyze(byte[] imageBytes, String filename, String categoryHint) {
        try {
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            Resource imageResource = new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return filename != null ? filename : "upload.jpg";
                }
            };
            body.add("image", imageResource);
            if (categoryHint != null && !categoryHint.isBlank()) {
                body.add("category", categoryHint);
            }

            AiAnalysisResult result = restClient.post()
                    .uri("/analyze")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(AiAnalysisResult.class);

            return Optional.ofNullable(result);
        } catch (Exception e) {
            log.warn("AI service call failed ({}). Continuing without AI analysis.", e.getMessage());
            return Optional.empty();
        }
    }
}
