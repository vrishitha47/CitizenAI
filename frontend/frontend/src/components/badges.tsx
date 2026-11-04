import type { ComplaintStatus, Priority, Severity } from "../types";

/**
 * Small, consistent status/severity/priority pills used across the app.
 * Colors are functional: they encode urgency, not decoration.
 */

const base =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  const map: Record<ComplaintStatus, { label: string; cls: string }> = {
    SUBMITTED: { label: "Submitted", cls: "bg-asphalt-100 text-asphalt-600" },
    AI_ANALYSIS: { label: "Analysing", cls: "bg-sign-100 text-sign-700" },
    ASSIGNED: { label: "Assigned", cls: "bg-blue-100 text-blue-700" },
    IN_PROGRESS: { label: "In progress", cls: "bg-hazard-400/25 text-hazard-600" },
    RESOLVED: { label: "Resolved", cls: "bg-sign-500 text-white" },
    REJECTED: { label: "Rejected", cls: "bg-red-100 text-red-700" },
  };
  const { label, cls } = map[status];
  return <span className={`${base} ${cls}`}>{label}</span>;
}

export function SeverityBadge({ severity }: { severity: Severity | null }) {
  if (!severity) return <span className="text-xs text-asphalt-400">—</span>;
  const map: Record<Severity, string> = {
    LOW: "bg-asphalt-100 text-asphalt-600",
    MEDIUM: "bg-hazard-400/20 text-hazard-600",
    HIGH: "bg-orange-100 text-orange-700",
    CRITICAL: "bg-red-100 text-red-700",
  };
  const labels: Record<Severity, string> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  };
  return <span className={`${base} ${map[severity]}`}>{labels[severity]}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (!priority) return <span className="text-xs text-asphalt-400">—</span>;
  const map: Record<Priority, string> = {
    LOW: "bg-asphalt-100 text-asphalt-600",
    MEDIUM: "bg-blue-100 text-blue-700",
    HIGH: "bg-orange-100 text-orange-700",
    URGENT: "bg-red-600 text-white",
  };
  const labels: Record<Priority, string> = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    URGENT: "Urgent",
  };
  return <span className={`${base} ${map[priority]}`}>{labels[priority]}</span>;
}
