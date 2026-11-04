import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "../components/AppLayout";
import { LocationPicker, type LatLng } from "../components/LocationPicker";
import { SeverityBadge, PriorityBadge } from "../components/badges";
import { createComplaint, fetchCategories, analyzeIssuePreview } from "../api/complaints";
import { previewReportReward } from "../api/rewards";
import { RewardEarnedModal } from "../components/RewardEarnedModal";
import { errorMessage } from "../api/client";
import type { AiPreview, Category, Complaint, RewardGrant } from "../types";

const MAX_MB = 10;

export default function ReportIssue() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<LatLng | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [aiPreview, setAiPreview] = useState<AiPreview | null>(null);
  const [detecting, setDetecting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Complaint | null>(null);
  const [grant, setGrant] = useState<RewardGrant | null>(null);
  const [showReward, setShowReward] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // Clean up object URLs to avoid leaks.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onFileChange(f: File | null) {
    setError(null);
    if (!f) return;
    if (!/\.(jpe?g|png|webp)$/i.test(f.name)) {
      setError("Please choose a JPG, PNG, or WEBP image.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`Image must be ${MAX_MB}MB or smaller.`);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setAiPreview(null); // a new photo invalidates the previous detection
  }

  async function onDetect() {
    if (!file) return;
    setError(null);
    setDetecting(true);
    try {
      const result = await analyzeIssuePreview(file);
      setAiPreview(result);
      if (result.detected && result.category) {
        setCategory(result.category); // pre-fill the issue-type field
      }
    } catch (err) {
      setError(errorMessage(err, "Couldn't analyse the photo. Please try again."));
    } finally {
      setDetecting(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) return setError("Add a photo of the issue.");
    if (!location) return setError("Set the location on the map.");

    setSubmitting(true);
    try {
      const complaint = await createComplaint(file, {
        category: category || null,
        description: description.trim() || undefined,
        latitude: location.lat,
        longitude: location.lng,
        locationAddress: address.trim() || undefined,
      });
      setResult(complaint);
      // Award points for the submission (mock, engine-computed). The success
      // screen renders below; the modal celebrates the points on top of it.
      setGrant(previewReportReward({ keepsStreak: false }));
      setShowReward(true);
    } catch (err) {
      setError(errorMessage(err, "Couldn't submit your report. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  // ----- Success / AI review screen -----
  if (result) {
    return (
      <AppLayout context="Citizen">
        {showReward && (
          <RewardEarnedModal
            grant={grant}
            onClose={() => setShowReward(false)}
            onViewRewards={() => navigate("/app/rewards")}
          />
        )}
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl border border-asphalt-200 bg-white p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sign-100 text-sign-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <h1 className="text-xl font-bold text-asphalt-900">Report submitted</h1>
                <p className="text-sm text-asphalt-500">
                  Reference <span className="font-medium text-asphalt-700">{result.referenceCode}</span>
                </p>
              </div>
            </div>

            {grant && (
              <div className="mt-5 flex items-center justify-between rounded-lg bg-sign-50 px-4 py-3">
                <span className="text-sm font-medium text-sign-700">
                  ⭐ You earned Civic Points
                </span>
                <span className="font-display text-lg font-bold text-sign-600">
                  +{grant.totalAwarded}
                </span>
              </div>
            )}

            {result.imageUrl && (
              <img
                src={result.imageUrl}
                alt="Reported issue"
                className="mt-5 h-48 w-full rounded-lg object-cover"
              />
            )}

            <div className="mt-5 rounded-lg bg-asphalt-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-asphalt-700">
                <span aria-hidden="true">✨</span> AI auto-detection
              </div>
              {result.aiAnalysis ? (
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Field label="Detected issue" value={result.categoryLabel ?? "—"} />
                  <Field
                    label="Confidence"
                    value={
                      result.aiAnalysis.confidence != null
                        ? `${Math.round(result.aiAnalysis.confidence * 100)}%`
                        : "—"
                    }
                  />
                  <div>
                    <div className="text-xs text-asphalt-400">Severity</div>
                    <div className="mt-1"><SeverityBadge severity={result.severity} /></div>
                  </div>
                  <div>
                    <div className="text-xs text-asphalt-400">Priority</div>
                    <div className="mt-1"><PriorityBadge priority={result.priority} /></div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-asphalt-500">
                  Automatic analysis wasn't available, so an officer will review your
                  report manually.
                </p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button className="btn-primary flex-1" onClick={() => navigate(`/app/complaints/${result.id}`)}>
                Track this report
              </button>
              <Link to="/app/complaints" className="btn-ghost flex-1 text-center">
                My complaints
              </Link>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ----- Report form -----
  return (
    <AppLayout context="Citizen">
      <div className="mx-auto max-w-lg">
        <div className="mb-6">
          <Link to="/app" className="text-sm text-asphalt-500 hover:text-asphalt-700">
            ← Back
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-asphalt-900">Report an issue</h1>
          <p className="mt-1 text-asphalt-500">
            A photo and location are all we need. AI does the rest.
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Photo */}
          <div>
            <span className="field-label">Photo of the issue</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Selected issue" className="h-52 w-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-3 right-3 rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-asphalt-700 shadow-sm hover:bg-white"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-asphalt-200 text-asphalt-500 hover:border-sign-400 hover:text-sign-600 transition"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm font-medium">Tap to add a photo</span>
                <span className="text-xs text-asphalt-400">JPG, PNG or WEBP · up to {MAX_MB}MB</span>
              </button>
            )}

            {/* AI detect button — appears once a photo is chosen */}
            {file && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={onDetect}
                  disabled={detecting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-sign-300 bg-sign-50 px-3.5 py-2.5 text-sm font-semibold text-sign-700 hover:bg-sign-100 disabled:opacity-60 transition"
                >
                  <span aria-hidden="true">✨</span>
                  {detecting ? "Detecting…" : "Detect issue from photo"}
                </button>

                {aiPreview && (
                  aiPreview.detected ? (
                    <div className="mt-3 rounded-lg border border-sign-200 bg-sign-50/60 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-sign-800">
                          Detected: {aiPreview.categoryLabel ?? "—"}
                        </div>
                        {aiPreview.confidence != null && (
                          <span className="text-xs font-medium text-sign-600">
                            {Math.round(aiPreview.confidence * 100)}% confident
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={aiPreview.severity} />
                        <PriorityBadge priority={aiPreview.priority} />
                      </div>
                      <p className="mt-2 text-xs text-asphalt-500">
                        We've filled in the issue type below — change it if it looks wrong.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-asphalt-500">
                      {aiPreview.message ?? "Couldn't confidently detect an issue — pick the type below."}
                    </p>
                  )
                )}
              </div>
            )}
          </div>

          {/* Category — auto-detected by default; override is optional */}
          <div>
            <label htmlFor="category" className="field-label">
              Issue type{" "}
              <span className="font-normal text-asphalt-400">
                (auto-detected from your photo — override only if it's wrong)
              </span>
            </label>
            <select
              id="category"
              className="field-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">✨ Auto-detect (recommended)</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="field-label">
              Description <span className="font-normal text-asphalt-400">(optional)</span>
            </label>
            <textarea
              id="description"
              rows={3}
              className="field-input resize-none"
              placeholder="Anything useful — a landmark, how long it's been there, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Location */}
          <LocationPicker value={location} onChange={setLocation} />

          <div>
            <label htmlFor="address" className="field-label">
              Nearest landmark / address <span className="font-normal text-asphalt-400">(optional)</span>
            </label>
            <input
              id="address"
              type="text"
              className="field-input"
              placeholder="e.g. Near Main Road junction"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit report"}
          </button>
        </form>
      </div>
    </AppLayout>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-asphalt-400">{label}</div>
      <div className="mt-0.5 font-medium text-asphalt-800">{value}</div>
    </div>
  );
}
