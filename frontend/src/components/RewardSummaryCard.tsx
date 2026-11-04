import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRewardProfile } from "../api/rewards";
import type { RewardProfile } from "../types";

/**
 * Compact rewards snapshot for the citizen dashboard: points, current level,
 * a progress bar to the next level, and a couple of headline stats. Links
 * through to the full Rewards page.
 */
export function RewardSummaryCard() {
  const [profile, setProfile] = useState<RewardProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchRewardProfile()
      .then((p) => active && setProfile(p))
      .catch(() => active && setProfile(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-asphalt-200 bg-white p-6 shadow-card">
        <div className="h-5 w-32 animate-pulse rounded bg-asphalt-100" />
        <div className="mt-4 h-9 w-24 animate-pulse rounded bg-asphalt-100" />
        <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-asphalt-100" />
      </div>
    );
  }

  if (!profile) return null;

  const { totalPoints, level, pointsToNextLevel, progressPercent, stats } = profile;

  return (
    <Link
      to="/app/rewards"
      className="block overflow-hidden rounded-2xl border border-asphalt-200 bg-white shadow-card transition hover:border-sign-300"
    >
      <div className="flex items-start justify-between gap-4 p-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-asphalt-400">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-hazard-400/20 text-hazard-600">
              ⭐
            </span>
            Civic rewards
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-asphalt-900">
              {totalPoints.toLocaleString()}
            </span>
            <span className="text-sm text-asphalt-500">points</span>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sign-50 px-3 py-1 text-sm font-semibold text-sign-600">
          Lv {level.level} · {level.name}
        </span>
      </div>

      <div className="px-6 pb-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-asphalt-100">
          <div
            className="h-full rounded-full bg-sign-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-asphalt-500">
          {pointsToNextLevel != null
            ? `${pointsToNextLevel.toLocaleString()} points to the next level`
            : "Top level reached — you're a Civic Legend."}
        </p>
      </div>

      <div className="grid grid-cols-3 divide-x divide-asphalt-100 border-t border-asphalt-100 text-center">
        <Stat value={stats.reportsSubmitted} label="Reports" />
        <Stat value={stats.reportsResolved} label="Resolved" />
        <Stat value={stats.badgesEarned} label="Badges" />
      </div>
    </Link>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="py-3">
      <div className="font-display text-lg font-semibold text-asphalt-900">{value}</div>
      <div className="text-xs text-asphalt-400">{label}</div>
    </div>
  );
}
