import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminLayout } from "../../components/AdminLayout";
import { POINTS, LEVELS, BADGES } from "../../rewards/engine";
import {
  fetchRewardsAnalytics,
  fetchRewardsLeaderboard,
} from "../../api/adminRewards";
import { errorMessage } from "../../api/client";
import type { RewardLeaderboardEntry, RewardsAnalytics } from "../../types";

export default function AdminRewards() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RewardLeaderboardEntry[]>([]);
  const [analytics, setAnalytics] = useState<RewardsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"leaderboard" | "rules">("leaderboard");

  useEffect(() => {
    Promise.all([fetchRewardsLeaderboard(), fetchRewardsAnalytics()])
      .then(([r, a]) => {
        setRows(r);
        setAnalytics(a);
      })
      .catch((err) => setError(errorMessage(err, "Couldn't load rewards data.")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div>
        <h1 className="font-display text-2xl font-bold text-asphalt-900">Rewards</h1>
        <p className="mt-1 text-asphalt-500">
          Monitor civic engagement, review every citizen's points and badges, and
          make manual adjustments.
        </p>
      </div>

      {error && (
        <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && <div className="mt-6 text-asphalt-500">Loading…</div>}

      {!loading && analytics && (
        <>
          {/* Program analytics */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Participating citizens" value={analytics.totalCitizens} />
            <StatCard label="Points issued" value={analytics.totalPointsIssued.toLocaleString()} accent="green" />
            <StatCard label="Badges awarded" value={analytics.totalBadgesAwarded} accent="amber" />
            <StatCard label="Active this week" value={analytics.activeThisWeek} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <ChartCard title="Citizens by level">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.levelDistribution} margin={{ top: 8, right: 8, bottom: 30, left: 0 }}>
                  <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={60} tick={{ fontSize: 10, fill: "#5c645f" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5c645f" }} />
                  <Tooltip cursor={{ fill: "#f6f7f6" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {analytics.levelDistribution.map((_, i) => (
                      <Cell key={i} fill="#0b5d3b" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Badge distribution">
              <ul className="space-y-2.5">
                {analytics.badgeDistribution.map((b) => {
                  const pct = Math.round((b.earnedCount / Math.max(1, analytics.totalCitizens)) * 100);
                  return (
                    <li key={b.id} className="flex items-center gap-3">
                      <span className="w-6 text-center text-lg" aria-hidden="true">{b.icon}</span>
                      <span className="w-36 flex-shrink-0 truncate text-sm text-asphalt-700">{b.name}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-asphalt-100">
                        <div className="h-full rounded-full bg-sign-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-xs text-asphalt-500">{b.earnedCount}</span>
                    </li>
                  );
                })}
              </ul>
            </ChartCard>
          </div>

          {/* Tabs: leaderboard / rules */}
          <div className="mt-8 flex gap-1 border-b border-asphalt-200">
            <TabButton active={tab === "leaderboard"} onClick={() => setTab("leaderboard")}>
              Leaderboard
            </TabButton>
            <TabButton active={tab === "rules"} onClick={() => setTab("rules")}>
              Reward rules
            </TabButton>
          </div>

          {tab === "leaderboard" ? (
            <Leaderboard rows={rows} onOpen={(id) => navigate(`/admin/rewards/${id}`)} />
          ) : (
            <RewardRules />
          )}
        </>
      )}
    </AdminLayout>
  );
}

/* PLACEHOLDER_APPEND */

function Leaderboard({
  rows,
  onOpen,
}: {
  rows: RewardLeaderboardEntry[];
  onOpen: (userId: number) => void;
}) {
  const now = Date.now();
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-asphalt-200 bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-asphalt-200 bg-asphalt-50 text-xs uppercase tracking-wide text-asphalt-500">
          <tr>
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Citizen</th>
            <th className="px-4 py-3 font-medium">Level</th>
            <th className="px-4 py-3 font-medium text-right">Points</th>
            <th className="px-4 py-3 font-medium text-right">Badges</th>
            <th className="px-4 py-3 font-medium text-right">Reports</th>
            <th className="px-4 py-3 font-medium text-right">Resolved</th>
            <th className="px-4 py-3 font-medium">Activity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-asphalt-100">
          {rows.map((r) => {
            const active = r.lastActivity && now - new Date(r.lastActivity).getTime() < 7 * 24 * 60 * 60 * 1000;
            return (
              <tr
                key={r.user.userId}
                className="cursor-pointer hover:bg-asphalt-50"
                onClick={() => onOpen(r.user.userId)}
              >
                <td className="px-4 py-3 font-semibold text-asphalt-400">{r.rank}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-asphalt-800">{r.user.name}</div>
                  <div className="text-xs text-asphalt-400">{r.user.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-sign-50 px-2.5 py-0.5 text-xs font-semibold text-sign-600">
                    Lv {r.level.level} · {r.level.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-sign-600">
                  {r.totalPoints.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right text-asphalt-600">{r.badgesEarned}</td>
                <td className="px-4 py-3 text-right text-asphalt-600">{r.reportsSubmitted}</td>
                <td className="px-4 py-3 text-right text-asphalt-600">{r.reportsResolved}</td>
                <td className="px-4 py-3">
                  {active ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-sign-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-sign-500" /> Active
                    </span>
                  ) : (
                    <span className="text-xs text-asphalt-400">Idle</span>
                  )}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-asphalt-400">
                No citizens yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function RewardRules() {
  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-3">
      <RuleCard title="Points per action">
        <ul className="divide-y divide-asphalt-100 text-sm">
          {(
            [
              ["REPORT_SUBMITTED", "Report submitted"],
              ["REPORT_VERIFIED", "Report verified"],
              ["REPORT_RESOLVED", "Report resolved"],
              ["FIRST_REPORT_BONUS", "First-report bonus"],
              ["STREAK_BONUS", "Weekly streak bonus"],
            ] as const
          ).map(([key, label]) => (
            <li key={key} className="flex items-center justify-between py-2">
              <span className="text-asphalt-600">{label}</span>
              <span className="font-semibold text-sign-600">+{POINTS[key]}</span>
            </li>
          ))}
        </ul>
      </RuleCard>

      <RuleCard title="Level thresholds">
        <ul className="divide-y divide-asphalt-100 text-sm">
          {LEVELS.map((l) => (
            <li key={l.level} className="flex items-center justify-between py-2">
              <span className="text-asphalt-600">Lv {l.level} · {l.name}</span>
              <span className="text-asphalt-500">{l.minPoints.toLocaleString()} pts</span>
            </li>
          ))}
        </ul>
      </RuleCard>

      <RuleCard title="Badges">
        <ul className="space-y-2 text-sm">
          {BADGES.map((b) => (
            <li key={b.id} className="flex items-start gap-2.5">
              <span className="text-lg leading-none" aria-hidden="true">{b.icon}</span>
              <div>
                <div className="font-medium text-asphalt-800">{b.name}</div>
                <div className="text-xs text-asphalt-500">{b.description}</div>
              </div>
            </li>
          ))}
        </ul>
      </RuleCard>

      <p className="lg:col-span-3 text-xs text-asphalt-400">
        Rules are defined centrally in the rewards engine so citizen and authority
        views always agree. Changing a value updates every calculation across the app.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "green" | "amber";
}) {
  const color =
    accent === "green" ? "text-sign-600" : accent === "amber" ? "text-hazard-600" : "text-asphalt-900";
  return (
    <div className="rounded-xl border border-asphalt-200 bg-white p-5 shadow-card">
      <div className="text-sm text-asphalt-500">{label}</div>
      <div className={`mt-1 font-display text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-asphalt-200 bg-white p-5 shadow-card">
      <h3 className="mb-4 text-sm font-semibold text-asphalt-700">{title}</h3>
      {children}
    </div>
  );
}

function RuleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-asphalt-200 bg-white p-5 shadow-card">
      <h3 className="mb-3 text-sm font-semibold text-asphalt-700">{title}</h3>
      {children}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "border-b-2 px-4 py-2.5 text-sm font-medium transition",
        active ? "border-sign-500 text-sign-600" : "border-transparent text-asphalt-500 hover:text-asphalt-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
