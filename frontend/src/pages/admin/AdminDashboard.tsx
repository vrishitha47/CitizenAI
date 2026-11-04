import { useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminLayout } from "../../components/AdminLayout";
import { fetchAnalytics, type Analytics } from "../../api/admin";
import { errorMessage } from "../../api/client";

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "#b3bab6",
  MEDIUM: "#f5a524",
  HIGH: "#ea7317",
  CRITICAL: "#dc2626",
};

export default function AdminDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch((err) => setError(errorMessage(err, "Couldn't load analytics.")));
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold text-asphalt-900">Overview</h1>
      <p className="mt-1 text-asphalt-500">A snapshot of civic issues across the city.</p>

      {error && (
        <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {!data && !error && <div className="mt-6 text-asphalt-500">Loading…</div>}

      {data && (
        <>
          {/* Stat cards */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total reports" value={data.total} tone="neutral" />
            <Stat label="Pending" value={data.pending} tone="amber" />
            <Stat label="In progress" value={data.inProgress} tone="blue" />
            <Stat label="Resolved" value={data.resolved} tone="green" />
          </div>

          {/* Charts */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card title="Issues by category">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={data.byCategory.filter((c) => c.value > 0)}
                  margin={{ top: 8, right: 8, bottom: 40, left: 0 }}
                >
                  <XAxis
                    dataKey="label"
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 11, fill: "#5c645f" }}
                    height={60}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5c645f" }} />
                  <Tooltip cursor={{ fill: "#f6f7f6" }} />
                  <Bar dataKey="value" fill="#0b5d3b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="By severity">
              {data.bySeverity.every((s) => s.value === 0) ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.bySeverity.filter((s) => s.value > 0)}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {data.bySeverity
                        .filter((s) => s.value > 0)
                        .map((s) => (
                          <Cell key={s.key} fill={SEVERITY_COLORS[s.key] ?? "#0b5d3b"} />
                        ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <Legend items={data.bySeverity.filter((s) => s.value > 0).map((s) => ({
                label: s.label,
                color: SEVERITY_COLORS[s.key] ?? "#0b5d3b",
                value: s.value,
              }))} />
            </Card>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "amber" | "blue" | "green";
}) {
  const accent = {
    neutral: "text-asphalt-900",
    amber: "text-hazard-600",
    blue: "text-blue-600",
    green: "text-sign-600",
  }[tone];
  return (
    <div className="rounded-xl border border-asphalt-200 bg-white p-5 shadow-card">
      <div className="text-sm text-asphalt-500">{label}</div>
      <div className={`mt-1 font-display text-3xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-asphalt-200 bg-white p-5 shadow-card">
      <h3 className="mb-4 text-sm font-semibold text-asphalt-700">{title}</h3>
      {children}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string; value: number }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2 text-sm text-asphalt-600">
          <span className="h-3 w-3 rounded-sm" style={{ background: it.color }} />
          {it.label} <span className="text-asphalt-400">({it.value})</span>
        </div>
      ))}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-asphalt-400">
      No data yet
    </div>
  );
}
