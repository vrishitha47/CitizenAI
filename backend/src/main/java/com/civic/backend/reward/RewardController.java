package com.civic.backend.reward;

import com.civic.backend.reward.dto.RewardGrantResponse;
import com.civic.backend.reward.dto.RewardProfileResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Citizen-facing rewards API. Requires authentication (not admin) per the
 * SecurityConfig "everything else authenticated" rule.
 */
@RestController
@RequestMapping("/api/rewards")
@RequiredArgsConstructor
public class RewardController {

    private final RewardService rewardService;

    /** The signed-in citizen's fully-computed reward profile. */
    @GetMapping("/me")
    public ResponseEntity<RewardProfileResponse> myRewards(Authentication authentication) {
        return ResponseEntity.ok(rewardService.getProfileForEmail(authentication.getName()));
    }

    /** Points the citizen will earn for a report submitted right now (modal). */
    @PostMapping("/preview")
    public ResponseEntity<RewardGrantResponse> preview(Authentication authentication) {
        return ResponseEntity.ok(rewardService.previewReportReward(authentication.getName()));
    }
}
