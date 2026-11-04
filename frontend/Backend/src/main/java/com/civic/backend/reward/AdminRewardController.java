package com.civic.backend.reward;

import com.civic.backend.reward.dto.AdjustPointsRequest;
import com.civic.backend.reward.dto.AdminCitizenRewardResponse;
import com.civic.backend.reward.dto.LeaderboardEntryResponse;
import com.civic.backend.reward.dto.RewardsAnalyticsResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin-only rewards management. Access is restricted to ADMIN by the
 * /api/admin/** rule in SecurityConfig.
 */
@RestController
@RequestMapping("/api/admin/rewards")
@RequiredArgsConstructor
public class AdminRewardController {

    private final RewardService rewardService;

    /** Ranked leaderboard of every citizen. */
    @GetMapping("/leaderboard")
    public ResponseEntity<List<LeaderboardEntryResponse>> leaderboard() {
        return ResponseEntity.ok(rewardService.leaderboard());
    }

    /** Program-wide reward analytics. */
    @GetMapping("/analytics")
    public ResponseEntity<RewardsAnalyticsResponse> analytics() {
        return ResponseEntity.ok(rewardService.analytics());
    }

    /** One citizen's full reward profile. */
    @GetMapping("/{userId}")
    public ResponseEntity<AdminCitizenRewardResponse> citizen(@PathVariable Long userId) {
        return ResponseEntity.ok(rewardService.getCitizenReward(userId));
    }

    /** Manually grant or deduct points for a citizen, with a recorded reason. */
    @PostMapping("/{userId}/adjust")
    public ResponseEntity<AdminCitizenRewardResponse> adjust(
            @PathVariable Long userId,
            @Valid @RequestBody AdjustPointsRequest request) {
        return ResponseEntity.ok(
                rewardService.adjustPoints(userId, request.getPoints(), request.getReason()));
    }
}
