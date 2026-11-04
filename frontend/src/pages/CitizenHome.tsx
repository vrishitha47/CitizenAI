import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { StatusBadge } from "../components/badges";
import { RewardSummaryCard } from "../components/RewardSummaryCard";
import { useAuth } from "../auth/AuthContext";
import { fetchMyComplaints } from "../api/complaints";
import type { Complaint } from "../types";

export default function CitizenHome() {
  const { user } = useAuth();
  const [recent, setRecent] = useState<Complaint[]>([]);

  useEffect(() => {
    fetchMyComplaints()
      .then((all) => setRecent(all.slice(0, 3)))
      .catch(() => setRecent([]));
  }, []);

  const openCount = recent.filter((c) => c.status !== "RESOLVED" && c.status !== "REJECTED").length;

  return (
    <AppLayout context="Citizen">
      {/* Hero action */}
      <div className="overflow-hidden rounded-2xl bg-sign-500 p-8 text-white shadow-card">
        <div className="max-w-lg">
          <h1 className="text-2xl font-bold">
            Hello, {user?.name?.split(" ")[0]}
          </h1>
          <p className="mt-2 text-sign-100">
            See something broken on your street? Report it in under a minute — a
            photo and a pin is all it takes.
          </p>
          <Link
            to="/app/report"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 font-medium text-sign-600 hover:bg-sign-50 transition"
          >
            Report an issue
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14m0 0-6-6m6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Rewards snapshot */}
      <div className="mt-6">
        <RewardSummaryCard />
      </div>

      {/* Recent activity */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-asphalt-900">
          Recent reports {openCount > 0 && <span className="text-asphalt-400">· {openCount} open</span>}
        </h2>
        <Link to="/app/complaints" className="text-sm font-medium text-sign-500 hover:text-sign-600">
          View all
        </Link>
      </div>

      {recent.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-asphalt-300 bg-white px-6 py-12 text-center">
          <p className="text-asphalt-500">Your reports will show up here once you file one.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4">
          {recent.map((c) => (
            <Link
              key={c.id}
              to={`/app/complaints/${c.id}`}
              className="flex items-center gap-4 rounded-xl border border-asphalt-200 bg-white p-4 shadow-card transition hover:border-sign-300"
            >
              {c.imageUrl ? (
                <img src={c.imageUrl} alt="" className="h-14 w-14 flex-shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-asphalt-100" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-asphalt-900">
                  {c.categoryLabel ?? "Unclassified issue"}
                </div>
                <div className="truncate text-sm text-asphalt-500">
                  {c.locationAddress || c.referenceCode}
                </div>
              </div>
              <StatusBadge status={c.status} />
            </Link>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
