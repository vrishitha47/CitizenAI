package com.civic.backend.user;

import com.civic.backend.complaint.ComplaintRepository;
import com.civic.backend.user.dto.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Self-service profile operations plus admin user management.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final ComplaintRepository complaintRepository;
    private final PasswordEncoder passwordEncoder;

    // ----------------------------------------------------------------
    // Self-service (any authenticated user)
    // ----------------------------------------------------------------

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(String email) {
        User user = requireByEmail(email);
        return ProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .complaintCount(complaintRepository.countByReporterId(user.getId()))
                .build();
    }

    @Transactional
    public ProfileResponse updateProfile(String email, UpdateProfileRequest req) {
        User user = requireByEmail(email);
        user.setName(req.getName().trim());
        userRepository.save(user);
        return getProfile(email);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest req) {
        User user = requireByEmail(email);
        if (!passwordEncoder.matches(req.getCurrentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        if (passwordEncoder.matches(req.getNewPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("New password must be different from the current one");
        }
        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
    }

    // ----------------------------------------------------------------
    // Admin user management
    // ----------------------------------------------------------------

    @Transactional(readOnly = true)
    public Page<UserSummaryResponse> listUsers(String search, Role role, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        String s = (search == null || search.isBlank()) ? null : search.trim();
        return userRepository.findWithSearch(s, role, pageable).map(this::toSummary);
    }

    @Transactional
    public UserSummaryResponse createUser(CreateUserRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("A user with that email already exists");
        }
        User user = User.builder()
                .name(req.getName().trim())
                .email(req.getEmail().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .role(req.getRole())
                .build();
        return toSummary(userRepository.save(user));
    }

    @Transactional
    public UserSummaryResponse updateRole(Long userId, Role newRole, String actingAdminEmail) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Guard: an admin cannot demote themselves (avoids locking themselves out).
        if (user.getEmail().equalsIgnoreCase(actingAdminEmail) && newRole != Role.ADMIN) {
            throw new IllegalArgumentException("You cannot change your own admin role");
        }

        // Guard: don't allow removing the last remaining admin.
        if (user.getRole() == Role.ADMIN && newRole != Role.ADMIN
                && userRepository.countByRole(Role.ADMIN) <= 1) {
            throw new IllegalArgumentException("Cannot demote the last remaining admin");
        }

        user.setRole(newRole);
        return toSummary(userRepository.save(user));
    }

    private UserSummaryResponse toSummary(User user) {
        return UserSummaryResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .complaintCount(complaintRepository.countByReporterId(user.getId()))
                .build();
    }

    private User requireByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }
}
