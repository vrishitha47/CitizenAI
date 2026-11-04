package com.civic.backend.complaint;

import com.civic.backend.complaint.enums.IssueCategory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Exposes the available issue categories so the frontend can render dropdowns
 * without hardcoding the list. Public endpoint.
 */
@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    @GetMapping
    public List<Map<String, String>> categories() {
        return Arrays.stream(IssueCategory.values())
                .map(c -> Map.of(
                        "value", c.name(),
                        "label", c.getDisplayName()))
                .toList();
    }
}
