package com.civic.backend.notification;

import com.civic.backend.notification.dto.NotificationResponse;
import com.civic.backend.user.User;
import com.civic.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates and serves in-app notifications. Notification creation is fail-soft:
 * a problem here must never break the action that triggered it (e.g. a status
 * update should still succeed even if the notification can't be written).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    /**
     * Create a notification for a user. Swallows and logs any error so callers
     * never fail because of a notification problem.
     */
    @Transactional
    public void notifyUser(Long recipientId, String title, String message, String link, Long complaintId) {
        try {
            User recipient = userRepository.findById(recipientId).orElse(null);
            if (recipient == null) return;
            Notification n = Notification.builder()
                    .recipient(recipient)
                    .title(title)
                    .message(message)
                    .link(link)
                    .complaintId(complaintId)
                    .read(false)
                    .build();
            notificationRepository.save(n);
        } catch (Exception e) {
            log.warn("Failed to create notification for user {}: {}", recipientId, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> list(String userEmail, int page, int size) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Pageable pageable = PageRequest.of(page, size);
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public long unreadCount(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return notificationRepository.countByRecipientIdAndReadFalse(user.getId());
    }

    @Transactional
    public void markRead(Long notificationId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (!n.getRecipient().getId().equals(user.getId())) {
            throw new IllegalArgumentException("You do not have access to this notification");
        }
        n.setRead(true);
        notificationRepository.save(n);
    }

    @Transactional
    public void markAllRead(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        notificationRepository.markAllReadForRecipient(user.getId());
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .link(n.getLink())
                .complaintId(n.getComplaintId())
                .read(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
