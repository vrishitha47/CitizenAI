import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { StatusBadge, SeverityBadge, PriorityBadge } from "../components/badges";
import { StatusTimeline } from "../components/StatusTimeline";
import { ZoomableImage } from "../components/ZoomableImage";
import { fetchComplaint } from "../api/complaints";
import { errorMessage } from "../api/client";
import type { Complaint } from "../types";

export default function ComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchComplaint(Number(id))
      .then(setComplaint)
      .catch((err) => setError(errorMessage(err, "Couldn't load this complaint.")));
  }, [id]);

  return (
    <AppLayout context="Citizen">
      <div className="mx-auto max-w-2xl">
        <Link to="/app/complaints" className="text-sm text-asphalt-500 hover:text-asphalt-700">
          ← My complaints
        </Link>

        {error && (
          <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        {!complaint && !error && <div className="mt-6 text-asphalt-500">Loading…</div>}

        {complaint && (
          <>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-asphalt-900">
                  {complaint.categoryLabel ?? "Unclassified issue"}
                </h1>
                <p className="mt-1 text-sm text-asphalt-500">
                  {complaint.referenceCode} · reported {new Date(complaint.createdAt).toLocaleDateString()}
                </p>
              </div>
              <StatusBadge status={complaint.status} />
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {complaint.imageUrl && (
                <ZoomableImage
                  src={complaint.imageUrl}
                  alt="Reported issue"
                  className="h-56 w-full md:col-span-2"
                />
              )}

              <InfoCard title="Assessment">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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
              </InfoCard>

              <InfoCard title="Location">
                <p className="text-sm text-asphalt-700">
                  {complaint.locationAddress || "No landmark provided"}
                </p>
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
              </InfoCard>

              {complaint.description && (
                <InfoCard title="Description" className="md:col-span-2">
                  <p className="text-sm leading-relaxed text-asphalt-700">{complaint.description}</p>
                </InfoCard>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-asphalt-200 bg-white p-6 shadow-card">
              <h3 className="mb-6 text-sm font-semibold text-asphalt-700">Progress</h3>
              <StatusTimeline status={complaint.status} history={complaint.history} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function InfoCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-asphalt-200 bg-white p-5 shadow-card ${className}`}>
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
