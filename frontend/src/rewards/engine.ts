import type {
  Badge,
  RewardActivityType,
  RewardGrant,
  RewardHistoryEntry,
  RewardLevel,
  RewardProfile,
} from "../types";

/**
 * Civic rewards engine — the single source of truth for how points, levels and
 * badges are calculated.
 *
 * This is deliberately kept as a set of PURE functions with no UI or network
 * concerns, so the exact same rules can run:
 *   - client-side today (over the mock ledger in api/rewards.ts), and
 *   - server-side later (a Spring @Service can mirror these constants and
 *     expose the computed RewardProfile from GET /api/rewards/me).
 *
 * When the backend is wired up, delete the mock ledger — NOT this file. The UI
 * consumes the computed RewardProfile shape either way.
 */

// ---------------------------------------------------------------------------
// Point rules — what each civic action is worth.
// ---------------------------------------------------------------------------

export const POINTS: Record<RewardActivityType, number> = {
  REPORT_SUBMITTED: 50, // filing a report with a photo + location
  REPORT_VERIFIED: 20, // an authority accepts / assigns the report
  REPORT_RESOLVED: 100, // the issue is fixed and closed
  FIRST_REPORT_BONUS: 100, // one-time welcome bonus on the very first report
  STREAK_BONUS: 30, // keeping a weekly reporting streak alive
  BADGE_BONUS: 0, // reserved: bonus points attached to a badge unlock
  ADMIN_ADJUSTMENT: 0, // variable: manual grant/deduction set per entry by an admin
};

export const HUMAN_ACTIVITY: Record<RewardActivityType, string> = {
  REPORT_SUBMITTED: "Reported an issue",
  REPORT_VERIFIED: "Report verified by authority",
  REPORT_RESOLVED: "Reported issue resolved",
  FIRST_REPORT_BONUS: "Welcome bonus — first report",
  STREAK_BONUS: "Weekly reporting streak",
  BADGE_BONUS: "Badge bonus",
  ADMIN_ADJUSTMENT: "Manual adjustment by authority",
};

// ---------------------------------------------------------------------------
// Level ladder — cumulative point thresholds, lowest to highest.
// ---------------------------------------------------------------------------

interface LevelDef {
  level: number;
  name: string;
  minPoints: number;
}

export const LEVELS: LevelDef[] = [
  { level: 1, name: "New Resident", minPoints: 0 },
  { level: 2, name: "Neighborhood Watch", minPoints: 200 },
  { level: 3, name: "Community Advocate", minPoints: 500 },
  { level: 4, name: "Civic Champion", minPoints: 1000 },
  { level: 5, name: "City Guardian", minPoints: 2000 },
  { level: 6, name: "Civic Legend", minPoints: 4000 },
];

/** Resolve the level (and the next threshold) for a given point total. */
export function getLevelForPoints(points: number): RewardLevel {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].minPoints) idx = i;
  }
  const current = LEVELS[idx];
  const next = idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
  return {
    level: current.level,
    name: current.name,
    minPoints: current.minPoints,
    nextLevelPoints: next ? next.minPoints : null,
  };
}

// ---------------------------------------------------------------------------
// The activity stats that badges are evaluated against.
// ---------------------------------------------------------------------------

export interface RewardStats {
  reportsSubmitted: number;
  reportsResolved: number;
  potholeReports: number;
  garbageReports: number;
  streetlightReports: number;
  currentStreakDays: number;
  maxAiConfidence: number; // 0..1, best AI confidence across the citizen's reports
}

// ---------------------------------------------------------------------------
// Badge catalogue — each badge measures one stat against a target.
// ---------------------------------------------------------------------------

interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: number;
  measure: (s: RewardStats, points: number, level: number) => number;
}

export const BADGES: BadgeDef[] = [
  {
    id: "first-steps",
    name: "First Steps",
    description: "File your very first civic report.",
    icon: "🌱",
    target: 1,
    measure: (s) => s.reportsSubmitted,
  },
  {
    id: "reporter",
    name: "Reporter",
    description: "Submit 5 reports.",
    icon: "📣",
    target: 5,
    measure: (s) => s.reportsSubmitted,
  },
  {
    id: "prolific-reporter",
    name: "Prolific Reporter",
    description: "Submit 25 reports.",
    icon: "🏅",
    target: 25,
    measure: (s) => s.reportsSubmitted,
  },
  {
    id: "pothole-patrol",
    name: "Pothole Patrol",
    description: "Report 5 potholes.",
    icon: "🕳️",
    target: 5,
    measure: (s) => s.potholeReports,
  },
  {
    id: "clean-streets",
    name: "Clean Streets",
    description: "Report 5 garbage / waste issues.",
    icon: "🧹",
    target: 5,
    measure: (s) => s.garbageReports,
  },
  {
    id: "night-watch",
    name: "Night Watch",
    description: "Report 3 broken streetlights.",
    icon: "🔦",
    target: 3,
    measure: (s) => s.streetlightReports,
  },
  {
    id: "problem-solver",
    name: "Problem Solver",
    description: "Have 10 of your reports resolved.",
    icon: "✅",
    target: 10,
    measure: (s) => s.reportsResolved,
  },
  {
    id: "week-warrior",
    name: "Week Warrior",
    description: "Keep a 7-day reporting streak.",
    icon: "🔥",
    target: 7,
    measure: (s) => s.currentStreakDays,
  },
  {
    id: "sharp-eye",
    name: "Sharp Eye",
    description: "Submit a photo the AI classifies with 90%+ confidence.",
    icon: "🎯",
    target: 90,
    measure: (s) => Math.round(s.maxAiConfidence * 100),
  },
  {
    id: "champion",
    name: "Civic Champion",
    description: "Reach Level 4.",
    icon: "🏆",
    target: 4,
    measure: (_s, _points, level) => level,
  },
];

/** Evaluate every badge against the given stats/points/level. */
export function evaluateBadges(
  stats: RewardStats,
  points: number,
  level: number,
  earnedDates: Record<string, string> = {}
): Badge[] {
  return BADGES.map((def) => {
    const current = Math.min(def.measure(stats, points, level), def.target);
    const earned = current >= def.target;
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      earned,
      earnedDate: earned ? earnedDates[def.id] ?? null : null,
      current,
      target: def.target,
      progressPercent: Math.min(100, Math.round((current / def.target) * 100)),
    };
  });
}

// ---------------------------------------------------------------------------
// Profile assembly — turns a raw ledger + stats into the UI-ready profile.
// ---------------------------------------------------------------------------

export function buildRewardProfile(
  stats: RewardStats,
  history: RewardHistoryEntry[],
  earnedDates: Record<string, string> = {}
): RewardProfile {
  const totalPoints = history.reduce((sum, h) => sum + h.points, 0);
  const level = getLevelForPoints(totalPoints);

  const pointsIntoLevel = totalPoints - level.minPoints;
  const levelSpan =
    level.nextLevelPoints != null ? level.nextLevelPoints - level.minPoints : null;
  const pointsToNextLevel =
    level.nextLevelPoints != null ? level.nextLevelPoints - totalPoints : null;
  const progressPercent = levelSpan
    ? Math.min(100, Math.round((pointsIntoLevel / levelSpan) * 100))
    : 100;

  const badges = evaluateBadges(stats, totalPoints, level.level, earnedDates);

  return {
    totalPoints,
    level,
    pointsIntoLevel,
    pointsToNextLevel,
    levelSpan,
    progressPercent,
    stats: {
      reportsSubmitted: stats.reportsSubmitted,
      reportsResolved: stats.reportsResolved,
      currentStreakDays: stats.currentStreakDays,
      badgesEarned: badges.filter((b) => b.earned).length,
    },
    badges: badges.sort((a, b) => Number(b.earned) - Number(a.earned)),
    history: [...history].sort((a, b) => b.date.localeCompare(a.date)),
  };
}

/**
 * Compute the points a citizen earns for submitting a report right now.
 * Pure and deterministic so the success modal and the (future) backend agree.
 */
export function grantForReport(opts: {
  isFirstReport: boolean;
  keepsStreak: boolean;
}): RewardGrant {
  const breakdown: { label: string; points: number }[] = [
    { label: "Issue reported", points: POINTS.REPORT_SUBMITTED },
  ];
  if (opts.isFirstReport) {
    breakdown.push({ label: "First report bonus", points: POINTS.FIRST_REPORT_BONUS });
  }
  if (opts.keepsStreak) {
    breakdown.push({ label: "Weekly streak bonus", points: POINTS.STREAK_BONUS });
  }
  return {
    totalAwarded: breakdown.reduce((sum, b) => sum + b.points, 0),
    breakdown,
  };
}
