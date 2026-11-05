import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NotificationBell } from "./NotificationBell";

const citizenTabs = [
  { to: "/app", label: "Home", end: true },
  { to: "/app/report", label: "Report", end: false },
  { to: "/app/complaints", label: "My reports", end: false },
  { to: "/app/rewards", label: "Rewards", end: false },
];

/**
 * Shared shell for authenticated pages: a slim top bar with the brand, the
 * signed-in user, and a sign-out action.
 */
export function AppLayout({
  children,
  context,
}: {
  children: ReactNode;
  context: string; // e.g. "Citizen" | "Authority"
}) {
  const { user, logout } = useAuth();

  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-asphalt-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sign-500 text-white">
              {/* pin glyph */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
              </svg>
            </span>
            <div className="leading-tight">
              <div className="font-display text-sm font-semibold text-asphalt-900">CitizenAI</div>
              <div className="text-xs text-asphalt-400">{context}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link
              to="/app/profile"
              className="hidden text-right sm:block"
              title="Profile & settings"
            >
              <div className="text-sm font-medium text-asphalt-800 hover:text-sign-600">{user?.name}</div>
              <div className="text-xs text-asphalt-400">{user?.email}</div>
            </Link>
            <Link
              to="/app/profile"
              aria-label="Profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-sign-100 text-sm font-semibold text-sign-600 transition hover:bg-sign-200"
            >
              {initials}
            </Link>
            <button onClick={logout} className="btn-ghost !px-3 !py-2 text-sm">
              Sign out
            </button>
          </div>
        </div>

        {context === "Citizen" && (
          <nav className="mx-auto flex max-w-6xl gap-1 px-4">
            {citizenTabs.map((t) => (
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
        )}
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
