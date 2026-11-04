import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import type { Role } from "../types";

/**
 * Guards routes. If not logged in, redirects to /login. If a role is required
 * and the user doesn't have it, redirects them to their own home.
 */
export function ProtectedRoute({
  children,
  role,
}: {
  children: ReactNode;
  role?: Role;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-asphalt-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    // Send users to the area they're allowed to see.
    return <Navigate to={user.role === "ADMIN" ? "/admin" : "/app"} replace />;
  }

  return <>{children}</>;
}
