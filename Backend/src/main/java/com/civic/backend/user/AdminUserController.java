package com.civic.backend.user;

import com.civic.backend.user.dto.CreateUserRequest;
import com.civic.backend.user.dto.UpdateRoleRequest;
import com.civic.backend.user.dto.UserSummaryResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Admin-only user management. Restricted to ADMIN by the /api/admin/** rule
 * in SecurityConfig.
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<Page<UserSummaryResponse>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Role role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(userService.listUsers(search, role, page, size));
    }

    @PostMapping
    public ResponseEntity<UserSummaryResponse> create(@Valid @RequestBody CreateUserRequest req) {
        return ResponseEntity.ok(userService.createUser(req));
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<UserSummaryResponse> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRoleRequest req,
            Authentication auth) {
        return ResponseEntity.ok(userService.updateRole(id, req.getRole(), auth.getName()));
    }
}
