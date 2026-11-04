import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Signboard } from "../components/Signboard";
import { useAuth } from "../auth/AuthContext";
import { errorMessage } from "../api/client";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await register(name, email, password);
      // New self-registrations are always citizens.
      navigate("/app", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Could not create your account."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <Signboard />

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-asphalt-900">Create your account</h2>
            <p className="mt-1.5 text-asphalt-500">Join your neighbours in keeping the city working.</p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="name" className="field-label">Full name</label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                className="field-input"
                placeholder="Jane Citizen"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="email" className="field-label">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="field-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                className="field-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-asphalt-500">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-sign-500 hover:text-sign-600">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
