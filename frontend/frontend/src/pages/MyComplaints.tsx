import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { StatusBadge, SeverityBadge } from "../components/badges";
import { fetchMyComplaints } from "../api/complaints";
import { errorMessage } from "../api/client";
import type { Complaint } from "../types";

export default function MyComplaints() {
  const [complaints, setComplaints] = useState<Complaint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyComplaints()
      .then(setComplaints)
      .catch((err) => setError(errorMessage(err, "Couldn't load your complaints.")));
  }, []);

  return (
    <AppLayout context="Citizen">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-asphalt-900">My complaints</h1>
          <p className="mt-1 text-asphalt-500">Everything you've reported, newest first.</p>
        </div>
        <Link to="/app/report" className="btn-primary">Report an issue</Link>
      </div>

      {error && (
        <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {complaints === null && !error && (
        <div className="text-asphalt-500">Loading…</div>
      )}

      {complaints && complaints.length === 0 && (
        <div className="rounded-xl border border-dashed border-asphalt-300 bg-white px-6 py-16 text-center">
          <h3 className="text-lg font-semibold text-asphalt-800">Nothing reported yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-asphalt-500">
            When you spot a pothole, broken streetlight, or overflowing bin, report it
            here and follow it through to resolution.
          </p>
          <Link to="/app/report" className="btn-primary mt-5 inline-flex">Report your first issue</Link>
        </div>
      )}

      {complaints && complaints.length > 0 && (
        <div className="grid gap-4">
          {complaints.map((c) => (
            <Link
              key={c.id}
              to={`/app/complaints/${c.id}`}
              className="flex gap-4 rounded-xl border border-asphalt-200 bg-white p-4 shadow-card transition hover:border-sign-300"
            >
              {c.imageUrl ? (
                <img src={c.imageUrl} alt="" className="h-20 w-20 flex-shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-asphalt-100" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-asphalt-900">
                    {c.categoryLabel ?? "Unclassified issue"}
                  </span>
                  <span className="text-xs text-asphalt-400">{c.referenceCode}</span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-sm text-asphalt-500">
                  {c.locationAddress || c.description || "No description"}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={c.status} />
                  <SeverityBadge severity={c.severity} />
                  <span className="ml-auto text-xs text-asphalt-400">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
