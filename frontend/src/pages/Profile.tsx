import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AppLayout } from "../components/AppLayout";
import { AdminLayout } from "../components/AdminLayout";
import { useAuth } from "../auth/AuthContext";
import { fetchProfile, updateProfile, changePassword, type Profile as ProfileData } from "../api/profile";
import { errorMessage } from "../api/client";

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-asphalt-200 bg-white p-6 shadow-card">
      <h2 className="font-display text-lg font-semibold text-asphalt-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-asphalt-500">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Password form
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetchProfile()
      .then((p) => {
        setProfile(p);
        setName(p.name);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function onSaveName(e: FormEvent) {
    e.preventDefault();
    setNameMsg(null);
    if (!name.trim()) {
      setNameMsg({ ok: false, text: "Name cannot be empty." });
      return;
    }
    setSavingName(true);
    try {
      const updated = await updateProfile(name.trim());
      setProfile(updated);
      updateUser({ name: updated.name });
      setNameMsg({ ok: true, text: "Profile updated." });
    } catch (err) {
      setNameMsg({ ok: false, text: errorMessage(err, "Could not update profile.") });
    } finally {
      setSavingName(false);
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (next !== confirm) {
      setPwMsg({ ok: false, text: "New passwords do not match." });
      return;
    }
    if (next.length < 6) {
      setPwMsg({ ok: false, text: "New password must be at least 6 characters." });
      return;
    }
    setSavingPw(true);
    try {
      await changePassword(current, next);
      setPwMsg({ ok: true, text: "Password changed successfully." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setPwMsg({ ok: false, text: errorMessage(err, "Could not change password.") });
    } finally {
      setSavingPw(false);
    }
  }

  const isAdmin = user?.role === "ADMIN";

  const body = (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-asphalt-900">Profile &amp; settings</h1>
        <p className="mt-1 text-sm text-asphalt-500">Manage your account details and password.</p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-asphalt-200 bg-white p-8 text-center text-sm text-asphalt-400 shadow-card">
          Loading…
        </div>
      ) : (
        <>
          <Card title="Account">
            <div className="mb-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wide text-asphalt-400">Email</div>
                <div className="font-medium text-asphalt-800">{profile?.email}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-asphalt-400">Role</div>
                <div className="font-medium text-asphalt-800">{profile?.role === "ADMIN" ? "Authority" : "Citizen"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-asphalt-400">Reports filed</div>
                <div className="font-medium text-asphalt-800">{profile?.complaintCount ?? 0}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-asphalt-400">Member since</div>
                <div className="font-medium text-asphalt-800">
                  {profile ? new Date(profile.createdAt).toLocaleDateString() : "—"}
                </div>
              </div>
            </div>

            <form onSubmit={onSaveName} className="space-y-4">
              <div>
                <label className="field-label" htmlFor="name">Display name</label>
                <input
                  id="name"
                  className="field-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                />
              </div>
              {nameMsg && (
                <p className={nameMsg.ok ? "text-sm text-sign-600" : "text-sm text-hazard-600"}>{nameMsg.text}</p>
              )}
              <button type="submit" className="btn-primary" disabled={savingName}>
                {savingName ? "Saving…" : "Save changes"}
              </button>
            </form>
          </Card>

          <Card title="Change password" subtitle="Use at least 6 characters.">
            <form onSubmit={onChangePassword} className="space-y-4">
              <div>
                <label className="field-label" htmlFor="current">Current password</label>
                <input id="current" type="password" className="field-input" value={current}
                  onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
              </div>
              <div>
                <label className="field-label" htmlFor="next">New password</label>
                <input id="next" type="password" className="field-input" value={next}
                  onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
              </div>
              <div>
                <label className="field-label" htmlFor="confirm">Confirm new password</label>
                <input id="confirm" type="password" className="field-input" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
              </div>
              {pwMsg && (
                <p className={pwMsg.ok ? "text-sm text-sign-600" : "text-sm text-hazard-600"}>{pwMsg.text}</p>
              )}
              <button type="submit" className="btn-primary" disabled={savingPw}>
                {savingPw ? "Updating…" : "Update password"}
              </button>
            </form>
          </Card>
        </>
      )}
    </div>
  );

  return isAdmin ? <AdminLayout>{body}</AdminLayout> : <AppLayout context="Citizen">{body}</AppLayout>;
}
