import { useEffect, useState } from "react";
import { AppLayout } from "../components/AppLayout";
import { fetchRewardProfile } from "../api/rewards";
import type { Badge, RewardHistoryEntry, RewardProfile } from "../types";

export default function Rewards() {
  const [profile, setProfile] = useState<RewardProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchRewardProfile()
      .then((p) => active && setProfile(p))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppLayout context="Citizen">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-asphalt-900">Civic rewards</h1>
        <p className="mt-1 text-asphalt-500">
          Earn points and badges for keeping your city in good shape.
        </p>
      </div>

      {loading && <LoadingState />}
      {error && !loading && (
        <div className="rounded-xl border border-dashed border-asphalt-300 bg-white px-6 py-12 text-center text-asphalt-500">
          We couldn't load your rewards just now. Please try again.
        </div>
      )}
      {profile && !loading && <RewardsContent profile={profile} />}
    </AppLayout>
  );
}

function RewardsContent({ profile }: { profile: RewardProfile }) {
  return (
    <div className="space-y-8">
      <HeroPanel profile={profile} />
      <BadgeSection badges={profile.badges} />
      <HistorySection history={profile.history} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function HeroPanel({ profile }: { profile: RewardProfile }) {
  const { totalPoints, level, pointsToNextLevel, progressPercent, stats } = profile;
  return (
    <div className="overflow-hidden rounded-2xl border border-asphalt-200 bg-white shadow-card">
      <div className="grid gap-6 p-6 sm:grid-cols-2 sm:items-center">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-asphalt-400">
            Total points
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-5xl font-bold text-sign-500">
              {totalPoints.toLocaleString()}
            </span>
          </div>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sign-50 px-3 py-1 text-sm font-semibold text-sign-600">
            Level {level.level} · {level.name}
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-asphalt-700">
              {pointsToNextLevel != null ? "Progress to next level" : "Max level"}
            </span>
            <span className="text-asphalt-400">{progressPercent}%</span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-asphalt-100">
            <div
              className="h-full rounded-full bg-sign-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-asphalt-500">
            {pointsToNextLevel != null
              ? `${pointsToNextLevel.toLocaleString()} more points to reach ${
                  level.nextLevelPoints?.toLocaleString() ?? ""
                }.`
              : "You've reached the highest civic tier. Thank you!"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-asphalt-100 border-t border-asphalt-100 text-center">
        <HeroStat value={stats.reportsSubmitted} label="Reports filed" />
        <HeroStat value={stats.reportsResolved} label="Resolved" />
        <HeroStat value={`${stats.currentStreakDays}d`} label="Current streak" />
      </div>
    </div>
  );
}

function HeroStat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="py-4">
      <div className="font-display text-xl font-semibold text-asphalt-900">{value}</div>
      <div className="text-xs text-asphalt-400">{label}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function BadgeSection({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-asphalt-900">Badges</h2>
        <span className="text-sm text-asphalt-400">
          {earned} of {badges.length} earned
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((b) => (
          <BadgeCard key={b.id} badge={b} />
        ))}
      </div>
    </section>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  return (
    <div
      className={[
        "rounded-xl border p-4 shadow-card transition",
        badge.earned
          ? "border-sign-200 bg-white"
          : "border-asphalt-200 bg-asphalt-50",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg text-2xl",
            badge.earned ? "bg-sign-50" : "bg-asphalt-100 grayscale",
          ].join(" ")}
          aria-hidden="true"
        >
          {badge.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3
              className={[
                "truncate font-medium",
                badge.earned ? "text-asphalt-900" : "text-asphalt-500",
              ].join(" ")}
            >
              {badge.name}
            </h3>
            {badge.earned && (
              <span className="inline-flex items-center rounded-full bg-sign-50 px-2 py-0.5 text-xs font-medium text-sign-600">
                Earned
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-asphalt-500">{badge.description}</p>
        </div>
      </div>

      {badge.earned ? (
        <p className="mt-3 text-xs text-asphalt-400">
          {badge.earnedDate
            ? `Unlocked ${formatDate(badge.earnedDate)}`
            : "Unlocked"}
        </p>
      ) : (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-asphalt-200">
            <div
              className="h-full rounded-full bg-hazard-500 transition-all"
              style={{ width: `${badge.progressPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-asphalt-400">
            {badge.current} / {badge.target}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function HistorySection({ history }: { history: RewardHistoryEntry[] }) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-asphalt-900">Points history</h2>
      {history.length === 0 ? (
        <div className="rounded-xl border border-dashed border-asphalt-300 bg-white px-6 py-10 text-center text-asphalt-500">
          Your points activity will appear here.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-asphalt-200 bg-white shadow-card">
          <ul className="divide-y divide-asphalt-100">
            {history.map((h) => (
              <li key={h.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sign-50 text-sign-600">
                  {iconFor(h)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-asphalt-900">
                    {h.description}
                  </div>
                  <div className="text-xs text-asphalt-400">{formatDate(h.date)}</div>
                </div>
                <span
                  className={[
                    "flex-shrink-0 text-sm font-semibold",
                    h.points >= 0 ? "text-sign-600" : "text-hazard-600",
                  ].join(" ")}
                >
                  {h.points >= 0 ? "+" : ""}
                  {h.points}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

function iconFor(h: RewardHistoryEntry): string {
  switch (h.type) {
    case "REPORT_SUBMITTED":
      return "📣";
    case "REPORT_VERIFIED":
      return "🔎";
    case "REPORT_RESOLVED":
      return "✅";
    case "FIRST_REPORT_BONUS":
      return "🌱";
    case "STREAK_BONUS":
      return "🔥";
    default:
      return "⭐";
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function LoadingState() {
  return (
    <div className="space-y-8">
      <div className="h-40 animate-pulse rounded-2xl bg-asphalt-100" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-asphalt-100" />
        ))}
      </div>
    </div>
  );
}
