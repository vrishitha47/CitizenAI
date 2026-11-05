import type { ComplaintStatus, HistoryEntry } from "../types";

/**
 * The canonical happy-path lifecycle a citizen tracks. REJECTED is handled
 * separately since it's an off-path terminal state.
 */
const FLOW: { key: ComplaintStatus; label: string }[] = [
  { key: "SUBMITTED", label: "Submitted" },
  { key: "AI_ANALYSIS", label: "AI analysis" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "RESOLVED", label: "Resolved" },
];

function stageIndex(status: ComplaintStatus): number {
  const i = FLOW.findIndex((s) => s.key === status);
  // AI_ANALYSIS collapses back to SUBMITTED in practice; treat unknown as 0.
  return i === -1 ? 0 : i;
}

export function StatusTimeline({
  status,
  history,
}: {
  status: ComplaintStatus;
  history: HistoryEntry[];
}) {
  if (status === "REJECTED") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        This report was reviewed and closed as rejected. See the activity log below
        for the reason.
      </div>
    );
  }

  const current = stageIndex(status);

  return (
    <div>
      <ol className="relative flex justify-between">
        {/* connecting line */}
        <div className="absolute left-0 right-0 top-3 -z-0 mx-4 h-0.5 bg-asphalt-200" aria-hidden="true" />
        {FLOW.map((stage, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={stage.key} className="relative z-0 flex flex-1 flex-col items-center">
              <span
                className={[
                  "flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white",
                  done ? "border-sign-500 bg-sign-500 text-white" : "",
                  active ? "border-sign-500 ring-4 ring-sign-500/15" : "",
                  !done && !active ? "border-asphalt-200" : "",
                ].join(" ")}
              >
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <span className={`h-2 w-2 rounded-full ${active ? "bg-sign-500" : "bg-asphalt-300"}`} />
                )}
              </span>
              <span className={`mt-2 text-center text-xs ${active ? "font-semibold text-asphalt-800" : "text-asphalt-500"}`}>
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Activity log */}
      {history.length > 0 && (
        <div className="mt-8">
          <h4 className="text-sm font-semibold text-asphalt-700">Activity</h4>
          <ul className="mt-3 space-y-3">
            {history
              .slice()
              .reverse()
              .map((h, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-sign-400" />
                  <div>
                    <p className="text-sm text-asphalt-700">{h.remarks || h.status}</p>
                    <p className="text-xs text-asphalt-400">
                      {h.updatedBy ? `${h.updatedBy} · ` : ""}
                      {new Date(h.timestamp).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
