import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { StatusBadge, SeverityBadge, PriorityBadge } from "../../components/badges";
import { fetchAdminComplaints, type Page } from "../../api/admin";
import { fetchCategories } from "../../api/complaints";
import { errorMessage } from "../../api/client";
import type { Category, Complaint } from "../../types";

const STATUSES = ["SUBMITTED", "AI_ANALYSIS", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "REJECTED"];
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const PAGE_SIZE = 15;

type SortField = "createdAt" | "severity" | "priority" | "status" | "category";
type Direction = "asc" | "desc";

export default function AdminComplaints() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortField>("createdAt");
  const [direction, setDirection] = useState<Direction>("desc");
  const [page, setPage] = useState(0);

  const [data, setData] = useState<Page<Complaint> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // Debounce the search box so we don't fire a request per keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  // Reset to first page whenever a filter/search/sort changes.
  useEffect(() => {
    setPage(0);
  }, [category, severity, status, search, sort, direction]);

  useEffect(() => {
    setLoading(true);
    fetchAdminComplaints({ category, severity, status, search, sort, direction, page, size: PAGE_SIZE })
      .then(setData)
      .catch((err) => setError(errorMessage(err, "Couldn't load complaints.")))
      .finally(() => setLoading(false));
  }, [category, severity, status, search, sort, direction, page]);

  function toggleSort(field: SortField) {
    if (sort === field) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setDirection("desc");
    }
  }

  const hasFilters = category || severity || status || search;

  return (
    <AdminLayout>
      <h1 className="font-display text-2xl font-bold text-asphalt-900">Complaint queue</h1>
      <p className="mt-1 text-asphalt-500">Search, filter, sort, and manage reported issues.</p>

      {/* Search */}
      <div className="mt-5">
        <label className="field-label" htmlFor="search">Search</label>
        <div className="relative max-w-md">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-asphalt-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <input
            id="search"
            className="field-input !py-2 !pl-9"
            placeholder="Reference code, description, or location…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-3">
        <Filter label="Category" value={category} onChange={setCategory}
          options={categories.map((c) => ({ value: c.value, label: c.label }))} />
        <Filter label="Severity" value={severity} onChange={setSeverity}
          options={SEVERITIES.map((s) => ({ value: s, label: title(s) }))} />
        <Filter label="Status" value={status} onChange={setStatus}
          options={STATUSES.map((s) => ({ value: s, label: title(s) }))} />
        {hasFilters && (
          <button
            onClick={() => { setCategory(""); setSeverity(""); setStatus(""); setSearchInput(""); }}
            className="self-end text-sm font-medium text-asphalt-500 hover:text-asphalt-800"
          >
            Clear all
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="mt-5 overflow-hidden rounded-xl border border-asphalt-200 bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-asphalt-200 bg-asphalt-50 text-xs uppercase tracking-wide text-asphalt-500">
            <tr>
              <th className="px-4 py-3 font-medium">Reference</th>
              <SortableTh label="Category" field="category" sort={sort} direction={direction} onSort={toggleSort} />
              <SortableTh label="Severity" field="severity" sort={sort} direction={direction} onSort={toggleSort} />
              <SortableTh label="Priority" field="priority" sort={sort} direction={direction} onSort={toggleSort} />
              <SortableTh label="Status" field="status" sort={sort} direction={direction} onSort={toggleSort} />
              <SortableTh label="Reported" field="createdAt" sort={sort} direction={direction} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-asphalt-100">
            {data?.content.map((c) => (
              <tr key={c.id} className="hover:bg-asphalt-50">
                <td className="px-4 py-3">
                  <Link to={`/admin/complaints/${c.id}`} className="font-medium text-sign-600 hover:text-sign-700">
                    {c.referenceCode}
                  </Link>
                </td>
                <td className="px-4 py-3 text-asphalt-700">{c.categoryLabel ?? "—"}</td>
                <td className="px-4 py-3"><SeverityBadge severity={c.severity} /></td>
                <td className="px-4 py-3"><PriorityBadge priority={c.priority} /></td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 text-asphalt-500">{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {data && data.content.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-asphalt-400">
                  No complaints match your search.
                </td>
              </tr>
            )}
            {loading && !data && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-asphalt-400">Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-asphalt-500">
            {data.totalElements} total · page {data.number + 1} of {data.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              className="btn-ghost !py-1.5 !px-3 disabled:opacity-50"
              disabled={data.number === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </button>
            <button
              className="btn-ghost !py-1.5 !px-3 disabled:opacity-50"
              disabled={data.number >= data.totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function SortableTh({
  label, field, sort, direction, onSort,
}: {
  label: string;
  field: SortField;
  sort: SortField;
  direction: Direction;
  onSort: (f: SortField) => void;
}) {
  const active = sort === field;
  return (
    <th className="px-4 py-3 font-medium">
      <button
        onClick={() => onSort(field)}
        className={["flex items-center gap-1 uppercase tracking-wide transition",
          active ? "text-sign-600" : "hover:text-asphalt-800"].join(" ")}
      >
        {label}
        <span className="text-[10px]">{active ? (direction === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

function Filter({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <select className="field-input !py-2" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function title(s: string): string {
  const lower = s.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
