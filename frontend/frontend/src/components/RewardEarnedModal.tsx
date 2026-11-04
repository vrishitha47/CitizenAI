import { useEffect } from "react";
import type { RewardGrant } from "../types";

/**
 * Celebratory modal shown after a citizen submits a report, e.g. "+50 Civic
 * Points". Purely presentational — the caller supplies the computed grant and
 * controls open/close.
 */
export function RewardEarnedModal({
  grant,
  onClose,
  onViewRewards,
}: {
  grant: RewardGrant | null;
  onClose: () => void;
  onViewRewards?: () => void;
}) {
  // Close on Escape for accessibility.
  useEffect(() => {
    if (!grant) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [grant, onClose]);

  if (!grant) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-asphalt-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Points earned"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-sign-500 px-6 py-8 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-3xl">
            🎉
          </div>
          <div className="mt-4 font-display text-4xl font-bold">
            +{grant.totalAwarded}
          </div>
          <div className="mt-1 text-sm font-medium text-sign-100">Civic Points earned</div>
        </div>

        <div className="px-6 py-5">
          <ul className="space-y-2">
            {grant.breakdown.map((b, i) => (
              <li
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-asphalt-600">{b.label}</span>
                <span className="font-semibold text-sign-600">+{b.points}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex gap-2">
            <button onClick={onClose} className="btn-ghost flex-1">
              Nice!
            </button>
            {onViewRewards && (
              <button onClick={onViewRewards} className="btn-primary flex-1">
                View rewards
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
