import { AppLayout } from "../components/AppLayout";
import { useAuth } from "../auth/AuthContext";

/**
 * Admin landing page. In Part 6 this becomes the full dashboard: complaint
 * queue, filters, assignment, the issue map, and analytics. For now it confirms
 * the ADMIN role gate works.
 */
export default function AdminHome() {
  const { user } = useAuth();

  return (
    <AppLayout context="Authority">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-asphalt-900">Authority dashboard</h1>
        <p className="mt-1 text-asphalt-500">
          Signed in as {user?.name}. Review, prioritise, and resolve reported issues.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <PlaceholderCard title="Complaint queue" />
        <PlaceholderCard title="Issue map" />
        <PlaceholderCard title="Analytics" />
      </div>
    </AppLayout>
  );
}

function PlaceholderCard({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-asphalt-200 bg-white p-6 shadow-card">
      <h3 className="text-base font-semibold text-asphalt-900">{title}</h3>
      <span className="mt-3 inline-block rounded-full bg-asphalt-100 px-3 py-1 text-xs font-medium text-asphalt-500">
        Coming in Part 6
      </span>
    </div>
  );
}
