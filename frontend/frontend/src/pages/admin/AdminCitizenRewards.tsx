import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { adjustCitizenPoints, fetchCitizenReward } from "../../api/adminRewards";
import { errorMessage } from "../../api/client";
import type { AdminCitizenReward, Badge } from "../../types";

export default function AdminCitizenRewards() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const id = Number(userId);

  const [data, setData] = useState<AdminCitizenReward | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    fetchCitizenReward(id)
      .then((r) => (r ? setData(r) : setNotFound(true)))
      .catch((err) => setError(errorMessage(err, "Couldn't load this citizen.")))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <AdminLayout>
      <button
        onClick={() => navigate("/admin/rewards")}
        className="text-sm text-asphalt-500 hover:text-asphalt-700"
      >
        ← Back to rewards
      </button>

      {loading && <div className="mt-6 text-asphalt-500">Loading…</div>}
      {notFound && !loading && (
        <div className="mt-6 rounded-xl border border-dashed border-asphalt-300 bg-white px-6 py-12 text-center text-asphalt-500">
          We couldn't find a citizen with that ID.{" "}
          <Link to="/admin/rewards" className="text-sign-600">Back to leaderboard</Link>
        </div>
      )}
      {error && (
        <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && !loading && (
        <CitizenReward data={data} onAdjusted={setData} />
      )}
    </AdminLayout>
  );
}

function CitizenReward({
  data,
  onAdjusted,
}: {
  data: AdminCitizenReward;
  onAdjusted: (d: AdminCitizenReward) => void;
}) {
  const { user, profile } = data;
  return (
    <div className="mt-4 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-asphalt-900">{user.name}</h1>
          <p className="text-asphalt-500">{user.email}</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-sign-50 px-3 py-1 text-sm font-semibold text-sign-600">
          Level {profile.level.level} · {profile.level.name}
        </span>
      </div>

      {/* Snapshot */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Total points" value={profile.totalPoints.toLocaleString()} accent />
        <Metric label="Reports filed" value={profile.stats.reportsSubmitted} />
        <Metric label="Resolved" value={profile.stats.reportsResolved} />
        <Metric label="Badges" value={profile.stats.badgesEarned} />
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-asphalt-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-asphalt-700">
            {profile.pointsToNextLevel != null ? "Progress to next level" : "Top level reached"}
          </span>
          <span className="text-asphalt-400">{profile.progressPercent}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-asphalt-100">
          <div className="h-full rounded-full bg-sign-500" style={{ width: `${profile.progressPercent}%` }} />
        </div>
        {profile.pointsToNextLevel != null && (
          <p className="mt-2 text-xs text-asphalt-500">
            {profile.pointsToNextLevel.toLocaleString()} points to the next level.
          </p>
        )}
      </div>

      <AdjustPoints userId={user.userId} onAdjusted={onAdjusted} />

      {/* Badges */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-asphalt-900">Badges</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profile.badges.map((b) => (
            <BadgeChip key={b.id} badge={b} />
          ))}
        </div>
      </section>

      {/* History */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-asphalt-900">Points ledger</h2>
        <div className="overflow-hidden rounded-xl border border-asphalt-200 bg-white shadow-card">
          <ul className="divide-y divide-asphalt-100">
            {profile.history.map((h) => (
              <li key={h.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-asphalt-900">{h.description}</div>
                  <div className="text-xs text-asphalt-400">
                    {formatDate(h.date)}
                    {h.type === "ADMIN_ADJUSTMENT" && (
                      <span className="ml-2 rounded-full bg-hazard-400/20 px-2 py-0.5 text-hazard-600">
                        Manual
                      </span>
                    )}
                  </div>
                </div>
                <span className={h.points >= 0 ? "text-sm font-semibold text-sign-600" : "text-sm font-semibold text-hazard-600"}>
                  {h.points >= 0 ? "+" : ""}{h.points}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function AdjustPoints({
  userId,
  onAdjusted,
}: {
  userId: number;
  onAdjusted: (d: AdminCitizenReward) => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    const points = Number(amount);
    if (!Number.isFinite(points) || points === 0) {
      setErr("Enter a non-zero number of points (use a minus sign to deduct).");
      return;
    }
    if (!reason.trim()) {
      setErr("A reason is required for the audit trail.");
      return;
    }
    setSaving(true);
    try {
      const updated = await adjustCitizenPoints(userId, points, reason.trim());
      if (updated) {
        onAdjusted(updated);
        setOk(`${points > 0 ? "Granted" : "Deducted"} ${Math.abs(points)} points.`);
        setAmount("");
        setReason("");
      }
    } catch (e2) {
      setErr(errorMessage(e2, "Couldn't apply the adjustment."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-asphalt-200 bg-white p-5 shadow-card">
      <h2 className="text-sm font-semibold text-asphalt-700">Manual points adjustment</h2>
      <p className="mt-1 text-xs text-asphalt-500">
        Grant a bonus or make a correction. Every adjustment is recorded in the
        citizen's ledger with your reason.
      </p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-28">
          <label className="field-label" htmlFor="adj-amount">Points</label>
          <input
            id="adj-amount"
            type="number"
            className="field-input !py-2"
            placeholder="e.g. 50"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="min-w-[14rem] flex-1">
          <label className="field-label" htmlFor="adj-reason">Reason</label>
          <input
            id="adj-reason"
            className="field-input !py-2"
            placeholder="e.g. Community cleanup drive bonus"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Applying…" : "Apply"}
        </button>
      </form>
      {err && <p className="mt-2 text-sm text-hazard-600">{err}</p>}
      {ok && <p className="mt-2 text-sm text-sign-600">{ok}</p>}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-asphalt-200 bg-white p-4 shadow-card">
      <div className="text-xs text-asphalt-500">{label}</div>
      <div className={`mt-1 font-display text-2xl font-bold ${accent ? "text-sign-600" : "text-asphalt-900"}`}>
        {value}
      </div>
    </div>
  );
}

function BadgeChip({ badge }: { badge: Badge }) {
  return (
    <div className={[
      "flex items-center gap-3 rounded-lg border p-3",
      badge.earned ? "border-sign-200 bg-white" : "border-asphalt-200 bg-asphalt-50",
    ].join(" ")}>
      <span className={["text-xl", badge.earned ? "" : "grayscale opacity-60"].join(" ")} aria-hidden="true">
        {badge.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className={["truncate text-sm font-medium", badge.earned ? "text-asphalt-900" : "text-asphalt-500"].join(" ")}>
          {badge.name}
        </div>
        <div className="text-xs text-asphalt-400">
          {badge.earned ? "Earned" : `${badge.current} / ${badge.target}`}
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}
