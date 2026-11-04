import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { StatusBadge, SeverityBadge, PriorityBadge } from "../../components/badges";
import { StatusTimeline } from "../../components/StatusTimeline";
import { ZoomableImage } from "../../components/ZoomableImage";
import { fetchComplaint } from "../../api/complaints";
import { updateComplaintStatus, reanalyzeComplaint } from "../../api/admin";
import { errorMessage } from "../../api/client";
import type { Complaint, ComplaintStatus } from "../../types";

const STATUS_OPTIONS: { value: ComplaintStatus; label: string }[] = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "REJECTED", label: "Rejected" },
];

export default function AdminComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<ComplaintStatus>("ASSIGNED");
  const [assignedTo, setAssignedTo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeNote, setReanalyzeNote] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    load(Number(id));
  }, [id]);

  function load(complaintId: number) {
    fetchComplaint(complaintId)
      .then((c) => {
        setComplaint(c);
        setStatus(c.status === "SUBMITTED" || c.status === "AI_ANALYSIS" ? "ASSIGNED" : c.status);
        setAssignedTo(c.assignedTo ?? "");
      })
      .catch((err) => setError(errorMessage(err, "Couldn't load this complaint.")));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!complaint) return;
    setSaving(true);
    setSavedNote(null);
    setError(null);
    try {
      const updated = await updateComplaintStatus(complaint.id, {
        status,
        assignedTo: assignedTo.trim() || undefined,
        remarks: remarks.trim() || undefined,
      });
      setComplaint(updated);
      setRemarks("");
      setSavedNote("Update saved.");
    } catch (err) {
      setError(errorMessage(err, "Couldn't save the update."));
    } finally {
      setSaving(false);
    }
  }

  async function onReanalyze() {
    if (!complaint) return;
    setReanalyzing(true);
    setReanalyzeNote(null);
    setError(null);
    try {
      const updated = await reanalyzeComplaint(complaint.id);
      setComplaint(updated);
      setReanalyzeNote(
        `AI re-detection complete: ${updated.categoryLabel ?? "unclassified"}.`
      );
    } catch (err) {
      setError(errorMessage(err, "Couldn't re-run AI detection."));
    } finally {
      setReanalyzing(false);
    }
  }

  return (
    <AdminLayout>
      <Link to="/admin/complaints" className="text-sm text-asphalt-500 hover:text-asphalt-700">
        ← Complaint queue
      </Link>

      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {!complaint && !error && <div className="mt-6 text-asphalt-500">Loading…</div>}

      {complaint && (
        <div className="mt-3 grid gap-6 lg:grid-cols-3">
          {/* Left: details */}
          <div className="space-y-6 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-asphalt-900">
                  {complaint.categoryLabel ?? "Unclassified issue"}
                </h1>
                <p className="mt-1 text-sm text-asphalt-500">
                  {complaint.referenceCode} · by {complaint.reporterName} ·{" "}
                  {new Date(complaint.createdAt).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={complaint.status} />
            </div>

            {complaint.imageUrl && (
              <ZoomableImage src={complaint.imageUrl} alt="Reported issue" className="h-64 w-full" />
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Info title="Assessment">
                <div className="flex flex-wrap gap-x-6 gap-y-3">
                  <Labeled label="Severity"><SeverityBadge severity={complaint.severity} /></Labeled>
                  <Labeled label="Priority"><PriorityBadge priority={complaint.priority} /></Labeled>
                  {complaint.aiAnalysis?.confidence != null && (
                    <Labeled label="AI confidence">
                      <span className="text-sm font-medium text-asphalt-800">
                        {Math.round(complaint.aiAnalysis.confidence * 100)}%
                      </span>
                    </Labeled>
                  )}
                </div>
                {complaint.imageUrl && (
                  <div className="mt-4 border-t border-asphalt-100 pt-3">
                    <button
                      type="button"
                      onClick={onReanalyze}
                      disabled={reanalyzing}
                      className="flex items-center gap-2 rounded-lg border border-sign-300 bg-sign-50 px-3 py-1.5 text-sm font-semibold text-sign-700 hover:bg-sign-100 disabled:opacity-60 transition"
                    >
                      <span aria-hidden="true">✨</span>
                      {reanalyzing ? "Re-detecting…" : "Re-run AI detection"}
                    </button>
                    {reanalyzeNote && (
                      <p className="mt-2 text-xs text-sign-700">{reanalyzeNote}</p>
                    )}
                  </div>
                )}
              </Info>
              <Info title="Location">
                <p className="text-sm text-asphalt-700">{complaint.locationAddress || "No landmark"}</p>
                {complaint.latitude != null && complaint.longitude != null && (
                  <a
                    className="mt-1 inline-block text-sm font-medium text-sign-500 hover:text-sign-600"
                    href={`https://www.openstreetmap.org/?mlat=${complaint.latitude}&mlon=${complaint.longitude}#map=17/${complaint.latitude}/${complaint.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on map ↗
                  </a>
                )}
              </Info>
            </div>

            {complaint.description && (
              <Info title="Citizen's description">
                <p className="text-sm leading-relaxed text-asphalt-700">{complaint.description}</p>
              </Info>
            )}

            <div className="rounded-xl border border-asphalt-200 bg-white p-6 shadow-card">
              <h3 className="mb-6 text-sm font-semibold text-asphalt-700">Progress</h3>
              <StatusTimeline status={complaint.status} history={complaint.history} />
            </div>
          </div>

          {/* Right: management panel */}
          <div className="lg:col-span-1">
            <form onSubmit={onSave} className="sticky top-6 rounded-xl border border-asphalt-200 bg-white p-5 shadow-card">
              <h3 className="text-sm font-semibold text-asphalt-700">Manage complaint</h3>

              {savedNote && (
                <div className="mt-3 rounded-lg bg-sign-100 px-3 py-2 text-sm text-sign-700">{savedNote}</div>
              )}

              <div className="mt-4">
                <label htmlFor="status" className="field-label">Status</label>
                <select
                  id="status"
                  className="field-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ComplaintStatus)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="mt-4">
                <label htmlFor="assignee" className="field-label">Assign to</label>
                <input
                  id="assignee"
                  type="text"
                  className="field-input"
                  placeholder="e.g. Roads Dept — Team B"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                />
              </div>

              <div className="mt-4">
                <label htmlFor="remarks" className="field-label">Remark <span className="font-normal text-asphalt-400">(optional)</span></label>
                <textarea
                  id="remarks"
                  rows={3}
                  className="field-input resize-none"
                  placeholder="Add a note to the activity log"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary mt-5 w-full" disabled={saving}>
                {saving ? "Saving…" : "Save update"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Info({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-asphalt-200 bg-white p-5 shadow-card">
      <h3 className="mb-3 text-sm font-semibold text-asphalt-700">{title}</h3>
      {children}
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-asphalt-400">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
