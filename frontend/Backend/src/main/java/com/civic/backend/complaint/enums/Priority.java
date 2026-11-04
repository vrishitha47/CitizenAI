package com.civic.backend.complaint.enums;

/**
 * Complaint handling priority. Derived from severity + category + impact
 * (logic lives in the AI/priority layer in Part 3).
 */
public enum Priority {
    LOW,
    MEDIUM,
    HIGH,
    URGENT
}
