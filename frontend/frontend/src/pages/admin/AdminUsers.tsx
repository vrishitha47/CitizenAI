import { useEffect, useState, type FormEvent } from "react";
import { AdminLayout } from "../../components/AdminLayout";
import { fetchUsers, createUser, updateUserRole } from "../../api/adminUsers";
import type { Page } from "../../api/admin";
import { errorMessage } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import type { Role, UserSummary } from "../../types";

const PAGE_SIZE = 15;

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [page, setPage] = useState(0);

  const [data, setData] = useState<Page<UserSummary> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function reload() {
    setLoading(true);
    fetchUsers({ search, role: roleFilter, page, size: PAGE_SIZE })
      .then(setData)
      .catch((err) => setError(errorMessage(err, "Couldn't load users.")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => { setPage(0); }, [search, roleFilter]);

  useEffect(reload, [search, roleFilter, page]);

  async function onToggleRole(u: UserSummary) {
    const next: Role = u.role === "ADMIN" ? "CITIZEN" : "ADMIN";
    setBusyId(u.id);
    setError(null);
    try {
      const updated = await updateUserRole(u.id, next);
      setData((prev) =>
        prev ? { ...prev, content: prev.content.map((x) => (x.id === u.id ? updated : x)) } : prev
      );
    } catch (err) {
      setError(errorMessage(err, "Couldn't update role."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-asphalt-900">Users</h1>
          <p className="mt-1 text-asphalt-500">Manage citizens and authority accounts.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + New authority
        </button>
      </div>

      {/* Search + role filter */}
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <label className="field-label" htmlFor="usearch">Search</label>
          <input
            id="usearch"
            className="field-input !py-2"
            placeholder="Name or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Role</label>
          <select className="field-input !py-2" value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | "")}>
            <option value="">All</option>
            <option value="CITIZEN">Citizen</option>
            <option value="ADMIN">Authority</option>
          </select>
        </div>
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
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Reports</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-asphalt-100">
            {data?.content.map((u) => {
              const isSelf = me?.email?.toLowerCase() === u.email.toLowerCase();
              return (
                <tr key={u.id} className="hover:bg-asphalt-50">
                  <td className="px-4 py-3 font-medium text-asphalt-800">
                    {u.name}
                    {isSelf && <span className="ml-2 text-xs text-asphalt-400">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-asphalt-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={[
                      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      u.role === "ADMIN" ? "bg-sign-100 text-sign-700" : "bg-asphalt-100 text-asphalt-600",
                    ].join(" ")}>
                      {u.role === "ADMIN" ? "Authority" : "Citizen"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-asphalt-600">{u.complaintCount}</td>
                  <td className="px-4 py-3 text-asphalt-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onToggleRole(u)}
                      disabled={isSelf || busyId === u.id}
                      className="btn-ghost !py-1.5 !px-3 text-xs disabled:opacity-40"
                      title={isSelf ? "You can't change your own role" : ""}
                    >
                      {busyId === u.id ? "…" : u.role === "ADMIN" ? "Make citizen" : "Make authority"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {data && data.content.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-asphalt-400">No users found.</td></tr>
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
            <button className="btn-ghost !py-1.5 !px-3 disabled:opacity-50" disabled={data.number === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</button>
            <button className="btn-ghost !py-1.5 !px-3 disabled:opacity-50" disabled={data.number >= data.totalPages - 1}
              onClick={() => setPage((p) => p + 1)}>Next</button>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); reload(); }}
        />
      )}
    </AdminLayout>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("ADMIN");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      await createUser({ name: name.trim(), email: email.trim(), password, role });
      onCreated();
    } catch (e2) {
      setErr(errorMessage(e2, "Couldn't create user."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-asphalt-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-lg font-semibold text-asphalt-900">Create user</h2>
        <p className="mt-1 text-sm text-asphalt-500">
          Add a new authority (or citizen) account. They can sign in immediately.
        </p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div>
            <label className="field-label" htmlFor="cu-name">Name</label>
            <input id="cu-name" className="field-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="field-label" htmlFor="cu-email">Email</label>
            <input id="cu-email" type="email" className="field-input" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="field-label" htmlFor="cu-pw">Temporary password</label>
            <input id="cu-pw" type="text" className="field-input" value={password}
              onChange={(e) => setPassword(e.target.value)} required placeholder="At least 6 characters" />
          </div>
          <div>
            <label className="field-label" htmlFor="cu-role">Role</label>
            <select id="cu-role" className="field-input" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="ADMIN">Authority (admin)</option>
              <option value="CITIZEN">Citizen</option>
            </select>
          </div>
          {err && <p className="text-sm text-hazard-600">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
