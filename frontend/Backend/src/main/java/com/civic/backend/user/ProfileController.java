package com.civic.backend.user;

import com.civic.backend.user.dto.ChangePasswordRequest;
import com.civic.backend.user.dto.ProfileResponse;
import com.civic.backend.user.dto.UpdateProfileRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Self-service profile for the authenticated user (citizen or admin).
 */
@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<ProfileResponse> me(Authentication auth) {
        return ResponseEntity.ok(userService.getProfile(auth.getName()));
    }

    @PutMapping
    public ResponseEntity<ProfileResponse> update(
            @Valid @RequestBody UpdateProfileRequest req, Authentication auth) {
        return ResponseEntity.ok(userService.updateProfile(auth.getName(), req));
    }

    @PostMapping("/password")
    public ResponseEntity<Void> changePassword(
            @Valid @RequestBody ChangePasswordRequest req, Authentication auth) {
        userService.changePassword(auth.getName(), req);
        return ResponseEntity.noContent().build();
    }
}
