import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CitizenHome from "./pages/CitizenHome";
import ReportIssue from "./pages/ReportIssue";
import MyComplaints from "./pages/MyComplaints";
import ComplaintDetail from "./pages/ComplaintDetail";
import Rewards from "./pages/Rewards";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminComplaints from "./pages/admin/AdminComplaints";
import AdminComplaintDetail from "./pages/admin/AdminComplaintDetail";
import AdminMap from "./pages/admin/AdminMap";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRewards from "./pages/admin/AdminRewards";
import AdminCitizenRewards from "./pages/admin/AdminCitizenRewards";
import Profile from "./pages/Profile";

/**
 * Sends an already-authenticated user landing on "/" straight to their area,
 * otherwise to the login screen.
 */
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-asphalt-500">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "ADMIN" ? "/admin" : "/app"} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute role="CITIZEN">
                <CitizenHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/report"
            element={
              <ProtectedRoute role="CITIZEN">
                <ReportIssue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/complaints"
            element={
              <ProtectedRoute role="CITIZEN">
                <MyComplaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/complaints/:id"
            element={
              <ProtectedRoute role="CITIZEN">
                <ComplaintDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/rewards"
            element={
              <ProtectedRoute role="CITIZEN">
                <Rewards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminComplaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/complaints/:id"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminComplaintDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/map"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminMap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rewards"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminRewards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/rewards/:userId"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminCitizenRewards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
