package com.civic.backend.complaint.enums;

/**
 * The lifecycle stages a complaint moves through.
 * SUBMITTED   -> citizen just filed it
 * AI_ANALYSIS -> being processed by the AI service
 * ASSIGNED    -> an admin assigned it to a team/authority
 * IN_PROGRESS -> work is underway
 * RESOLVED    -> issue fixed / closed
 * REJECTED    -> invalid / duplicate / not actionable
 */
public enum ComplaintStatus {
    SUBMITTED,
    AI_ANALYSIS,
    ASSIGNED,
    IN_PROGRESS,
    RESOLVED,
    REJECTED
}
