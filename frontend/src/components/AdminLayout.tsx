import type { ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NotificationBell } from "./NotificationBell";

const tabs = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/complaints", label: "Complaints", end: false },
  { to: "/admin/map", label: "Issue map", end: false },
  { to: "/admin/rewards", label: "Rewards", end: false },
  { to: "/admin/users", label: "Users", end: false },
];

/**
 * Shell for the authority dashboard: brand, primary nav tabs, and sign-out.
 */
export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="border-b border-asphalt-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sign-500 text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
              </svg>
            </span>
            <div className="leading-tight">
              <div className="font-display text-sm font-semibold text-asphalt-900">CivicAI</div>
              <div className="text-xs text-asphalt-400">Authority</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link to="/admin/profile" className="hidden text-sm text-asphalt-600 hover:text-sign-600 sm:block">
              {user?.name}
            </Link>
            <button onClick={logout} className="btn-ghost !px-3 !py-2 text-sm">Sign out</button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 px-4">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                [
                  "border-b-2 px-4 py-3 text-sm font-medium transition",
                  isActive
                    ? "border-sign-500 text-sign-600"
                    : "border-transparent text-asphalt-500 hover:text-asphalt-800",
                ].join(" ")
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
